import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertContentSchema, 
  insertNodeSchema, 
  insertPinSchema,
  insertNodeConnectionSchema,
  contentTypeEnum,
  pinTypeEnum,
  nodeRoleEnum,
  nodeStatusEnum
} from "@shared/schema";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupPeerServer, getPeersOnSameNetwork, connectedPeers } from "./peerServer";
import { setupAuth } from "./auth";

// Helper utility for generating random IDs
function randomId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// WebSocket connections by user
const wsConnections = new Map<number, Set<WebSocket>>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup authentication
  setupAuth(app);
  
  // Setup PeerJS server for peer discovery and WebRTC signaling
  setupPeerServer(app, httpServer);
  
  // Setup WebSocket server for real-time updates
  // Use a specific path to avoid conflicts with Vite's WebSocket
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/api/ws',
    // Add the following options to make the connection more reliable
    clientTracking: true,
    perMessageDeflate: false,
    // Allow 5 minutes for connection timeout
    maxPayload: 50 * 1024 * 1024, // 50MB max payload
    // Set generous timeouts to avoid premature termination
    verifyClient: (info, cb) => {
      // Always accept connections, but log them
      console.log("WebSocket connection verification from:", info.req.headers['x-forwarded-for'] || info.req.socket.remoteAddress);
      cb(true);
    }
  });
  
  console.log("WebSocket server created and listening on path /api/ws");
  
  // Heartbeat mechanism to detect and clean up dead connections
  function heartbeat(this: WebSocket) {
    // @ts-ignore - add a property to the WebSocket object
    this.isAlive = true;
  }
  
  // Check for dead connections every 30 seconds
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      // @ts-ignore - check the custom property
      if (ws.isAlive === false) {
        console.log("Terminating inactive WebSocket connection");
        return ws.terminate();
      }
      
      // @ts-ignore - set the property to false, expecting heartbeat to set it to true
      ws.isAlive = false;
      try {
        ws.ping();
      } catch (e) {
        console.error("Error sending ping:", e);
      }
    });
  }, 30000);
  
  // Clean up the interval on server close
  wss.on('close', () => {
    clearInterval(interval);
  });
  
  wss.on("connection", (ws: WebSocket, req) => {
    console.log("WebSocket connection received:", req.url);
    
    // Initialize the isAlive property
    // @ts-ignore
    ws.isAlive = true;
    
    // Set up heartbeat
    ws.on('pong', heartbeat);
    
    // Handle initial connection errors
    ws.on('error', (error) => {
      console.error("WebSocket connection error:", error);
    });
    
    // Extract user ID and connection ID from the request
    const params = new URLSearchParams(req.url?.split("?")[1] || "");
    const userId = parseInt(params.get("userId") || "0");
    const connectionId = params.get("connectionId") || randomId();
    
    // Get client IP for debugging
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`WebSocket connection for user ${userId} from IP ${clientIp} with connectionId ${connectionId}`);
    
    // Add custom property for connection tracking
    // @ts-ignore - add connection ID to the WebSocket object for tracking
    ws.connectionId = connectionId;
    
    // Send an immediate welcome message to confirm connection
    try {
      ws.send(JSON.stringify({
        type: "CONNECTED",
        message: "Connected to websocket server",
        userId: userId,
        connectionId: connectionId,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error("Error sending welcome message:", error);
    }
    
    // Add user connection even if userId is 0 (anonymous)
    if (!wsConnections.has(userId)) {
      wsConnections.set(userId, new Set());
    }
    wsConnections.get(userId)?.add(ws);
    
    // Handle messages from client
    ws.on("message", async (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`Received message from user ${userId}, connectionId ${connectionId}:`, data);
        
        // Handle different message types
        if (data.type === "PONG") {
          // Mark as alive in response to server ping
          // @ts-ignore
          ws.isAlive = true;
        } 
        // Handle peer discovery related messages
        else if (data.type === "register") {
          console.log(`User ${data.userId} registering device ${data.deviceType}`);
          // Register this connection with the user ID and device info
          if (data.userId) {
            const user = await storage.getUser(parseInt(data.userId));
            if (user) {
              // Add custom properties for tracking
              // @ts-ignore
              ws.userId = parseInt(data.userId);
              // @ts-ignore
              ws.deviceType = data.deviceType || 'unknown';
              // @ts-ignore
              ws.deviceName = data.deviceName || 'Unnamed Device';
              
              // Update connection mapping
              if (!wsConnections.has(user.id)) {
                wsConnections.set(user.id, new Set());
              }
              wsConnections.get(user.id)?.add(ws);
              
              // Send confirmation
              ws.send(JSON.stringify({
                type: 'registered',
                userId: user.id,
                success: true
              }));
            }
          }
        }
        else if (data.type === "discover") {
          console.log(`User ${data.userId} discovering peers`);
          // Find peers on the same network but not belonging to this user
          const peers = [];
          
          // Collect all connections from other users
          for (const [otherUserId, connections] of wsConnections.entries()) {
            if (otherUserId !== userId && otherUserId !== 0) {
              for (const conn of connections) {
                // Only include open connections
                if (conn.readyState === WebSocket.OPEN) {
                  peers.push({
                    id: conn.connectionId,
                    // @ts-ignore
                    deviceType: conn.deviceType || 'unknown',
                    // @ts-ignore
                    deviceName: conn.deviceName || 'Unnamed Device',
                    // @ts-ignore
                    lastSeen: new Date()
                  });
                }
              }
            }
          }
          
          // Send the peer list back to the client
          ws.send(JSON.stringify({
            type: 'peers',
            peers
          }));
        }
        else if (data.type === "connect") {
          console.log(`User ${data.userId} requesting connection to peer ${data.targetPeerId}`);
          // Find the target peer connection
          let targetConn: WebSocket | undefined;
          
          // Search all connections for the target peer ID
          for (const connections of wsConnections.values()) {
            for (const conn of connections) {
              // @ts-ignore
              if (conn.connectionId === data.targetPeerId) {
                targetConn = conn;
                break;
              }
            }
            if (targetConn) break;
          }
          
          if (targetConn && targetConn.readyState === WebSocket.OPEN) {
            // Send connection request to target peer
            targetConn.send(JSON.stringify({
              type: 'connectionRequest',
              // @ts-ignore
              fromPeerId: ws.connectionId,
              // @ts-ignore
              fromUserId: ws.userId,
              // @ts-ignore
              deviceType: ws.deviceType,
              // @ts-ignore
              deviceName: ws.deviceName
            }));
            
            // Send confirmation to requesting peer
            ws.send(JSON.stringify({
              type: 'connectRequested',
              targetPeerId: data.targetPeerId
            }));
          } else {
            // Send error to requesting peer
            ws.send(JSON.stringify({
              type: 'connectError',
              targetPeerId: data.targetPeerId,
              error: 'Peer not found or not connected'
            }));
          }
        }
        else if (data.type === "disconnect") {
          console.log(`User ${data.userId} disconnecting from peer ${data.targetPeerId}`);
          // Find the target peer connection
          let targetConn: WebSocket | undefined;
          
          // Search all connections for the target peer ID
          for (const connections of wsConnections.values()) {
            for (const conn of connections) {
              // @ts-ignore
              if (conn.connectionId === data.targetPeerId) {
                targetConn = conn;
                break;
              }
            }
            if (targetConn) break;
          }
          
          if (targetConn && targetConn.readyState === WebSocket.OPEN) {
            // Send disconnect notification to target peer
            targetConn.send(JSON.stringify({
              type: 'peerDisconnected',
              // @ts-ignore
              peerId: ws.connectionId
            }));
            
            // Send confirmation to requesting peer
            ws.send(JSON.stringify({
              type: 'disconnectSuccess',
              targetPeerId: data.targetPeerId
            }));
          }
        }
        else if (data.type === "data") {
          // Forward data to target peer
          let targetConn: WebSocket | undefined;
          
          // Search all connections for the target peer ID
          for (const connections of wsConnections.values()) {
            for (const conn of connections) {
              // @ts-ignore
              if (conn.connectionId === data.targetPeerId) {
                targetConn = conn;
                break;
              }
            }
            if (targetConn) break;
          }
          
          if (targetConn && targetConn.readyState === WebSocket.OPEN) {
            // Forward the data
            targetConn.send(JSON.stringify({
              type: 'peerData',
              // @ts-ignore
              fromPeerId: ws.connectionId,
              data: data.data
            }));
          }
        }
        else if (data.type === "broadcast") {
          // Broadcast data to all connected peers
          const message = JSON.stringify({
            type: 'peerBroadcast',
            // @ts-ignore
            fromPeerId: ws.connectionId,
            // @ts-ignore
            fromUserId: ws.userId,
            data: data.data
          });
          
          // Send to all connections except sender's
          for (const [otherUserId, connections] of wsConnections.entries()) {
            if (otherUserId !== userId && otherUserId !== 0) {
              for (const conn of connections) {
                if (conn !== ws && conn.readyState === WebSocket.OPEN) {
                  conn.send(message);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error processing incoming message:", error);
      }
    });
    
    // Handle connection close
    ws.on("close", () => {
      console.log(`WebSocket closed for user ${userId}, connectionId ${connectionId}`);
      wsConnections.get(userId)?.delete(ws);
      if (wsConnections.get(userId)?.size === 0) {
        wsConnections.delete(userId);
      }
    });
  });
  
  // Helper to broadcast to a user's connections
  const broadcastToUser = (userId: number, data: any) => {
    const connections = wsConnections.get(userId);
    if (connections) {
      const message = JSON.stringify(data);
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  };

  // AUTH ROUTES are now handled by setupAuth(app)
  
  // USER ROUTES
  
  // Get user profile
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(200).json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarCid: user.avatarCid,
        did: user.did
      });
    } catch (error) {
      res.status(500).json({ message: "Server error fetching user" });
    }
  });
  
  // POST ROUTES
  
  // Create a post
  app.post("/api/posts", async (req: Request, res: Response) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      
      // Check if content with this CID already exists
      const existingPost = await storage.getPostByCID(postData.contentCid);
      if (existingPost) {
        return res.status(400).json({ message: "Content with this CID already exists" });
      }
      
      const post = await storage.createPost(postData);
      
      // Notify user's connections about new post
      broadcastToUser(postData.userId, {
        type: "NEW_POST",
        data: post
      });
      
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error creating post" });
    }
  });
  
  // Get posts for feed
  app.get("/api/posts", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getFeedPosts();
      res.status(200).json(posts);
    } catch (error) {
      res.status(500).json({ message: "Server error fetching posts" });
    }
  });
  
  // Get posts by a specific user
  app.get("/api/users/:userId/posts", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const posts = await storage.getPostsByUser(userId);
      res.status(200).json(posts);
    } catch (error) {
      res.status(500).json({ message: "Server error fetching user posts" });
    }
  });
  
  // Get post by ID
  app.get("/api/posts/:id", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      res.status(200).json(post);
    } catch (error) {
      res.status(500).json({ message: "Server error fetching post" });
    }
  });
  
  // DEVICE ROUTES
  
  // Register a device
  app.post("/api/devices", async (req: Request, res: Response) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      const device = await storage.createDevice(deviceData);
      res.status(201).json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error registering device" });
    }
  });
  
  // Get user's devices
  app.get("/api/users/:userId/devices", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const devices = await storage.getDevicesByUser(userId);
      res.status(200).json(devices);
    } catch (error) {
      res.status(500).json({ message: "Server error fetching devices" });
    }
  });
  
  // Update device sync status
  app.put("/api/devices/:id/sync", async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.id);
      const device = await storage.updateDeviceLastSynced(deviceId);
      res.status(200).json(device);
    } catch (error) {
      res.status(500).json({ message: "Server error updating device sync" });
    }
  });
  
  // PINNED CONTENT ROUTES
  
  // Pin content
  app.post("/api/pinned-content", async (req: Request, res: Response) => {
    try {
      const pinnedData = insertPinnedContentSchema.parse(req.body);
      
      // Check if already pinned by this user
      const existingPin = await storage.getPinnedContentByUserAndCID(
        pinnedData.userId, 
        pinnedData.contentCid
      );
      
      if (existingPin) {
        return res.status(400).json({ message: "Content already pinned by this user" });
      }
      
      const pinnedContent = await storage.pinContent(pinnedData);
      
      // Notify user's connections about new pin
      broadcastToUser(pinnedData.userId, {
        type: "CONTENT_PINNED",
        data: pinnedContent
      });
      
      res.status(201).json(pinnedContent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error pinning content" });
    }
  });
  
  // Unpin content
  app.delete("/api/pinned-content/:id", async (req: Request, res: Response) => {
    try {
      const pinnedId = parseInt(req.params.id);
      await storage.unpinContent(pinnedId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Server error unpinning content" });
    }
  });
  
  // Get user's pinned content
  app.get("/api/users/:userId/pinned-content", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const pinnedContent = await storage.getPinnedContentsByUser(userId);
      res.status(200).json(pinnedContent);
    } catch (error) {
      res.status(500).json({ message: "Server error fetching pinned content" });
    }
  });
  
  // HEALTH CHECK ROUTE
  app.get('/api/healthcheck', (req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      wsPath: '/api/ws',
      wsConnections: wsConnections.size
    });
  });

  // PEER CONNECTION ROUTES
  
  // Register a peer connection
  app.post("/api/peer-connections", async (req: Request, res: Response) => {
    try {
      const connectionData = insertPeerConnectionSchema.parse(req.body);
      const connection = await storage.createPeerConnection(connectionData);
      res.status(201).json(connection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error registering peer connection" });
    }
  });
  
  // Update peer connection status
  app.put("/api/peer-connections/:id/status", async (req: Request, res: Response) => {
    try {
      const connectionId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const connection = await storage.updatePeerConnectionStatus(connectionId, status);
      res.status(200).json(connection);
    } catch (error) {
      res.status(500).json({ message: "Server error updating peer connection" });
    }
  });
  
  // Get user's peer connections
  app.get("/api/users/:userId/peer-connections", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const connections = await storage.getPeerConnectionsByUser(userId);
      res.status(200).json(connections);
    } catch (error) {
      res.status(500).json({ message: "Server error fetching peer connections" });
    }
  });
  
  // Register a peer with user info
  app.post("/api/peers/register", async (req: Request, res: Response) => {
    try {
      const { peerId, userId, displayName, deviceType } = req.body;
      
      if (!peerId || !userId) {
        return res.status(400).json({ message: "Peer ID and User ID are required" });
      }
      
      // Associate peer with user ID
      const peer = connectedPeers.get(peerId);
      
      if (peer) {
        // Update existing peer
        peer.userId = userId;
        peer.lastSeen = new Date();
        connectedPeers.set(peerId, peer);
      } else {
        // Add a new peer even if not connected via PeerJS yet
        connectedPeers.set(peerId, {
          id: peerId,
          ip: req.ip || req.socket.remoteAddress || '',
          lastSeen: new Date(),
          userId: userId
        });
      }
      
      res.status(200).json({ success: true, peerId });
    } catch (error) {
      res.status(500).json({ message: "Server error registering peer" });
    }
  });
  
  // Get all discoverable peers except your own
  app.get("/api/peers/discover", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const allPeers = Array.from(connectedPeers.values());
      
      // Filter out peers belonging to the current user
      const discoverablePeers = allPeers.filter(peer => peer.userId !== userId);
      
      // Get user info for each peer
      const peersWithInfo = await Promise.all(discoverablePeers.map(async (peer) => {
        if (peer.userId) {
          const user = await storage.getUser(peer.userId);
          return {
            peerId: peer.id,
            userId: peer.userId,
            displayName: user?.displayName || 'Unknown User',
            deviceType: 'unknown',
            lastSeen: peer.lastSeen
          };
        }
        return null;
      }));
      
      // Filter out nulls
      const validPeers = peersWithInfo.filter(Boolean);
      
      res.status(200).json(validPeers);
    } catch (error) {
      res.status(500).json({ message: "Server error discovering peers" });
    }
  });

  return httpServer;
}
