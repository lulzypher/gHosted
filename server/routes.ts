import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { and, eq } from "drizzle-orm";
import { 
  insertUserSchema, 
  insertContentSchema, 
  insertNodeSchema, 
  insertPinSchema,
  insertNodeConnectionSchema,
  insertPostSchema,
  insertReactionSchema,
  insertPrivateMessageSchema,
  insertConversationSchema,
  insertConversationParticipantSchema,
  insertFollowerSchema,
  contentTypeEnum,
  pinTypeEnum,
  nodeRoleEnum,
  nodeStatusEnum,
  reactionTypeEnum,
  messageStatusEnum,
  encryptionTypeEnum,
  followers
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
    path: '/ws', // Simplified path to avoid conflicts with Vite's HMR
    clientTracking: true,
    perMessageDeflate: false,
    maxPayload: 5 * 1024 * 1024, // 5MB max payload - more reasonable limit
    verifyClient: (info, cb) => {
      // Always accept connections, but log them
      console.log("WebSocket connection verification from:", info.req.headers['x-forwarded-for'] || info.req.socket.remoteAddress);
      cb(true);
    }
  });
  
  console.log("WebSocket server created and listening on path /ws");
  
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
  
  // Search users for messaging - this route must come BEFORE the /:id route
  app.get("/api/users/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.length < 2) {
        return res.status(200).json([]);
      }
      
      // Get all users from database
      const allUsers = await storage.getAllUsers();
      
      // Filter users based on query (username or displayName)
      const filteredUsers = allUsers.filter(user => {
        const username = user.username.toLowerCase();
        const displayName = (user.displayName || "").toLowerCase();
        const searchTerm = query.toLowerCase();
        
        return username.includes(searchTerm) || displayName.includes(searchTerm);
      });
      
      // Don't return the current user in search results
      const currentUserId = req.user?.id;
      const results = filteredUsers
        .filter(user => user.id !== currentUserId)
        .map(user => ({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarCid: user.avatarCid
        }));
      
      res.status(200).json(results);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Server error fetching user" });
    }
  });
  
  // Get user profile - IMPORTANT: This route must come AFTER the /search route
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
      console.log(`Fetching posts for user ID: ${userId}`);
      // Adding a safety check for valid userId
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      try {
        const posts = await storage.getPostsByUser(userId);
        console.log(`Successfully fetched ${posts.length} posts for user ID: ${userId}`);
        res.status(200).json(posts);
      } catch (postErr) {
        console.error('Database error fetching user posts:', postErr);
        // Return empty array instead of 500 error to let the UI handle it gracefully
        res.status(200).json([]);
      }
    } catch (error) {
      console.error('Error in users/:userId/posts route:', error);
      res.status(500).json({ message: "Server error processing posts request" });
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
  
  // Register a device (using node functionality instead)
  app.post("/api/devices", async (req: Request, res: Response) => {
    try {
      const nodeData = insertNodeSchema.parse({
        ...req.body,
        role: 'device', // Set role to 'device'
        status: 'active' // Default status
      });
      const node = await storage.createNode(nodeData);
      res.status(201).json(node);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error('Error registering device:', error);
      res.status(500).json({ message: "Server error registering device" });
    }
  });
  
  // Get user's devices (implemented via nodes)
  app.get("/api/users/:userId/devices", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log(`Getting devices for user ID: ${userId}`);
      const nodes = await storage.getNodesByUser(userId);
      // Expand nodeRoleEnum to include 'device' in schema.ts later
      const devices = nodes.filter(node => node.role === 'mobile');
      res.status(200).json(devices);
    } catch (error) {
      console.error('Error fetching devices:', error);
      res.status(500).json({ message: "Server error fetching devices" });
    }
  });
  
  // Update device sync status (implemented via nodes)
  app.put("/api/devices/:id/sync", async (req: Request, res: Response) => {
    try {
      const nodeId = parseInt(req.params.id);
      const node = await storage.updateNodeLastSeen(nodeId);
      res.status(200).json(node);
    } catch (error) {
      console.error('Error updating device sync:', error);
      res.status(500).json({ message: "Server error updating device sync" });
    }
  });
  
  // PINNED CONTENT ROUTES
  
  // Pin content (implemented as a reaction)
  app.post("/api/pinned-content", async (req: Request, res: Response) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { cid, type } = req.body;
      
      if (!cid) {
        return res.status(400).json({ message: "Content CID is required" });
      }
      
      // Find the post by CID
      const post = await storage.getPostByCID(cid);
      if (!post) {
        return res.status(404).json({ message: "Post not found with this CID" });
      }
      
      // Create reaction data
      const reactionData = {
        userId: req.user.id,
        postId: post.id,
        reactionType: 'like' as const, // Using 'as const' to ensure it matches the enum type
        pinToPC: true,        // PC pinning is always enabled
        pinToMobile: type === 'both' // Mobile pinning depends on the pin type
      };
      
      // Create or update the reaction
      const reaction = await storage.createReaction(reactionData);
      
      // Notify the post owner if different from the person reacting
      if (post.userId !== req.user.id) {
        broadcastToUser(post.userId, {
          type: "NEW_REACTION",
          data: {
            ...reaction,
            username: req.user.username,
            displayName: req.user.displayName,
            postContent: post.content.substring(0, 50) + (post.content.length > 50 ? "..." : ""),
            pinType: type
          }
        });
      }
      
      // WebSocket notification to all connected devices of this user
      // to sync the newly pinned content
      broadcastToUser(req.user.id, {
        type: "CONTENT_PINNED",
        data: {
          postId: post.id,
          cid: post.contentCid,
          pinToPC: true,
          pinToMobile: type === 'both'
        }
      });
      
      res.status(201).json(reaction);
    } catch (error) {
      console.error("Error creating reaction/pin:", error);
      res.status(500).json({ message: "Server error creating reaction/pin" });
    }
  });
  
  // Unpin content (by removing reaction)
  app.delete("/api/pinned-content/:id", async (req: Request, res: Response) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const reactionId = parseInt(req.params.id);
      
      // Get the reaction before deleting to check ownership
      const reaction = await storage.getReaction(reactionId);
      
      if (!reaction) {
        return res.status(404).json({ message: "Reaction not found" });
      }
      
      // Ensure user owns this reaction
      if (reaction.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this reaction" });
      }
      
      // Delete the reaction (which also handles post stats update)
      const deletedReaction = await storage.deleteReaction(reactionId);
      
      // Notify the user's devices to sync this change
      broadcastToUser(req.user.id, {
        type: "CONTENT_UNPINNED",
        data: {
          reactionId,
          postId: reaction.postId
        }
      });
      
      res.status(200).json({ success: true, message: "Content unpinned" });
    } catch (error) {
      console.error("Error unpinning content:", error);
      res.status(500).json({ message: "Server error unpinning content" });
    }
  });
  
  // Get user's pinned content (implemented via reactions)
  app.get("/api/users/:userId/pinned-content", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Get user reactions
      const userReactions = await storage.getReactionsByUser(userId);
      
      // Get posts associated with each reaction
      const pinnedContent = await Promise.all(
        userReactions
          .filter(reaction => reaction.pinToPC || reaction.pinToMobile) // Only include pinned reactions
          .map(async (reaction) => {
            const post = await storage.getPost(reaction.postId);
            if (!post) return null;
            
            return {
              id: reaction.id,
              userId,
              contentId: post.id,
              contentCid: post.contentCid,
              pinType: reaction.pinToMobile ? 'both' : 'pc',
              pinnedAt: reaction.createdAt,
              content: {
                ...post,
                userId: post.userId // ensure userId is included
              }
            };
          })
      );
      
      // Filter out nulls (in case any posts were deleted)
      const validPinnedContent = pinnedContent.filter(Boolean);
      
      res.status(200).json(validPinnedContent);
    } catch (error) {
      console.error("Error fetching pinned content:", error);
      res.status(500).json({ message: "Server error fetching pinned content" });
    }
  });
  // FOLLOW/UNFOLLOW ROUTES
  // Follow a user
  app.post('/api/users/:userId/follow', async (req: Request, res: Response) => {
    try {
      // Get the current user from the session
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const followeeId = parseInt(req.params.userId, 10);
      
      // Prevent following yourself
      if (currentUser.id === followeeId) {
        return res.status(400).json({ message: 'Cannot follow yourself' });
      }

      // Check if the user to follow exists
      const followee = await db.query.users.findFirst({
        where: eq(users.id, followeeId)
      });

      if (!followee) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if already following
      const existingFollow = await db.query.followers.findFirst({
        where: and(
          eq(followers.followerId, currentUser.id),
          eq(followers.followeeId, followeeId)
        )
      });

      if (existingFollow) {
        return res.status(400).json({ message: 'Already following this user' });
      }

      // Create the follow relationship
      const follow = await db.insert(followers).values({
        followerId: currentUser.id,
        followeeId: followeeId
      }).returning();

      res.status(201).json(follow[0]);
    } catch (error) {
      console.error('Error following user:', error);
      res.status(500).json({ message: 'Server error following user' });
    }
  });

  // Unfollow a user
  app.delete('/api/users/:userId/follow', async (req: Request, res: Response) => {
    try {
      // Get the current user from the session
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const followeeId = parseInt(req.params.userId, 10);

      // Delete the follow relationship
      const result = await db.delete(followers)
        .where(
          and(
            eq(followers.followerId, currentUser.id),
            eq(followers.followeeId, followeeId)
          )
        )
        .returning();

      if (!result.length) {
        return res.status(404).json({ message: 'Follow relationship not found' });
      }

      res.status(200).json({ message: 'Unfollowed successfully' });
    } catch (error) {
      console.error('Error unfollowing user:', error);
      res.status(500).json({ message: 'Server error unfollowing user' });
    }
  });

  // Get followers of a user
  app.get('/api/users/:userId/followers', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId, 10);

      // Get all followers for this user
      const userFollowers = await db.query.followers.findMany({
        where: eq(followers.followeeId, userId),
        with: {
          follower: true
        }
      });

      // Format response to include follower details
      const formattedFollowers = userFollowers.map(follow => ({
        id: follow.follower.id,
        username: follow.follower.username,
        displayName: follow.follower.displayName,
        avatarCid: follow.follower.avatarCid,
        followedAt: follow.createdAt
      }));

      res.status(200).json(formattedFollowers);
    } catch (error) {
      console.error('Error getting followers:', error);
      res.status(500).json({ message: 'Server error getting followers' });
    }
  });

  // Get users followed by a user
  app.get('/api/users/:userId/following', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId, 10);

      // Get all users this user is following
      const following = await db.query.followers.findMany({
        where: eq(followers.followerId, userId),
        with: {
          followee: true
        }
      });

      // Format response to include followee details
      const formattedFollowing = following.map(follow => ({
        id: follow.followee.id,
        username: follow.followee.username,
        displayName: follow.followee.displayName,
        avatarCid: follow.followee.avatarCid,
        followedAt: follow.createdAt
      }));

      res.status(200).json(formattedFollowing);
    } catch (error) {
      console.error('Error getting following:', error);
      res.status(500).json({ message: 'Server error getting following' });
    }
  });

  // Check if current user follows a specific user
  app.get('/api/users/:userId/follow-status', async (req: Request, res: Response) => {
    try {
      // Get the current user from the session
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const targetUserId = parseInt(req.params.userId, 10);

      // Check if the follow relationship exists
      const existingFollow = await db.query.followers.findFirst({
        where: and(
          eq(followers.followerId, currentUser.id),
          eq(followers.followeeId, targetUserId)
        )
      });

      res.status(200).json({ following: !!existingFollow });
    } catch (error) {
      console.error('Error checking follow status:', error);
      res.status(500).json({ message: 'Server error checking follow status' });
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

  // WEBSITE HOSTING ROUTES
  
  // Get website hosting status for the current user
  app.get("/api/website-hosting", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = req.user!.id;
      
      // Get user's nodes
      const userNodes = await storage.getNodesByUser(userId);
      
      // Get all website nodes (nodes actively hosting the website)
      const websiteNodes = await storage.getWebsiteNodes();
      
      // Get active hosting records
      const activeHostings = await storage.getActiveWebsiteHostings();
      
      // Map nodes to their hosting records
      const activeHostingNodes = activeHostings.map(hosting => {
        const node = websiteNodes.find(n => n.id === hosting.nodeId);
        if (!node) return null;
        
        return {
          id: node.id,
          name: node.name,
          role: node.role,
          domain: hosting.domain,
          health: hosting.health,
          status: node.status,
          uptime: Math.floor((Date.now() - new Date(hosting.startTime).getTime()) / 1000),
          startTime: hosting.startTime,
          endTime: hosting.endTime,
          stats: hosting.stats || {
            requestsServed: 0,
            bandwidth: 0,
            uptime: 0,
            latency: 0
          }
        };
      }).filter(Boolean);
      
      // Calculate network stats
      const totalNodes = websiteNodes.length;
      const activeHosts = activeHostings.length;
      const totalUptime = activeHostings.reduce((sum, hosting) => {
        const startTime = new Date(hosting.startTime).getTime();
        const endTime = hosting.endTime ? new Date(hosting.endTime).getTime() : Date.now();
        const hoursUp = (endTime - startTime) / (1000 * 60 * 60);
        return sum + hoursUp;
      }, 0);
      
      // Calculate redundancy factor (how many copies of the site are available)
      const redundancyFactor = activeHosts / Math.max(1, totalNodes);
      
      // Calculate health score (avg of all hosting health)
      const healthScore = activeHostings.length > 0
        ? Math.floor(activeHostings.reduce((sum, h) => sum + h.health, 0) / activeHostings.length)
        : 0;
      
      // Filter out nodes that are already hosting
      const eligibleNodes = userNodes
        .filter(node => !node.isHostingWebsite)
        .map(node => ({
          id: node.id,
          name: node.name,
          role: node.role,
          status: node.status
        }));
      
      res.status(200).json({
        isHosting: userNodes.some(node => node.isHostingWebsite),
        eligibleNodes,
        activeHostingNodes,
        networkStats: {
          totalNodes,
          activeHosts,
          totalUptime,
          redundancyFactor,
          healthScore
        }
      });
    } catch (error) {
      console.error("Error fetching website hosting status:", error);
      res.status(500).json({ message: "Server error fetching website hosting status" });
    }
  });
  
  // Start hosting the website
  app.post("/api/website-hosting/start", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { nodeId } = req.body;
      if (!nodeId) {
        return res.status(400).json({ message: "nodeId is required" });
      }
      
      // Check if the node belongs to the user
      const node = await storage.getNode(nodeId);
      if (!node || node.userId !== req.user!.id) {
        return res.status(403).json({ message: "Node not found or not owned by you" });
      }
      
      // Generate a domain name for this node
      const domain = `${node.nodeId.substring(0, 8)}.ghosted.u`;
      
      // Create hosting record
      const hosting = await storage.createWebsiteHosting({
        nodeId,
        domain,
        health: 100,
        stats: {
          requestsServed: 0,
          bandwidth: 0,
          uptime: 100,
          latency: 0
        }
      });
      
      // Update node status
      await storage.updateNodeStatus(nodeId, 'online');
      
      // Update the isHostingWebsite flag on the node
      const updatedNode = await storage.getNode(nodeId);
      
      // Broadcast to all users that a new hosting node is available
      for (const [userId, connections] of wsConnections.entries()) {
        connections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'WEBSITE_HOSTING_CHANGED',
              nodeId,
              hosting: true,
              domain
            }));
          }
        });
      }
      
      res.status(200).json({ 
        success: true, 
        message: "Website hosting started", 
        hosting,
        node: updatedNode 
      });
    } catch (error) {
      console.error("Error starting website hosting:", error);
      res.status(500).json({ message: "Server error starting website hosting" });
    }
  });
  
  // Stop hosting the website
  app.post("/api/website-hosting/stop", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { nodeId } = req.body;
      if (!nodeId) {
        return res.status(400).json({ message: "nodeId is required" });
      }
      
      // Check if the node belongs to the user
      const node = await storage.getNode(nodeId);
      if (!node || node.userId !== req.user!.id) {
        return res.status(403).json({ message: "Node not found or not owned by you" });
      }
      
      // Find active hosting record for this node
      const activeHostings = await storage.getActiveWebsiteHostings();
      const hosting = activeHostings.find(h => h.nodeId === nodeId);
      
      if (hosting) {
        // End the hosting
        await storage.endWebsiteHosting(hosting.id);
      }
      
      // Update the isHostingWebsite flag on the node
      const updatedNode = await storage.getNode(nodeId);
      
      // Broadcast to all users that this hosting node is no longer available
      for (const [userId, connections] of wsConnections.entries()) {
        connections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'WEBSITE_HOSTING_CHANGED',
              nodeId,
              hosting: false
            }));
          }
        });
      }
      
      res.status(200).json({ 
        success: true, 
        message: "Website hosting stopped", 
        node: updatedNode 
      });
    } catch (error) {
      console.error("Error stopping website hosting:", error);
      res.status(500).json({ message: "Server error stopping website hosting" });
    }
  });
  
  // Update hosting health (used by health check system)
  app.post("/api/website-hosting/:id/health", async (req: Request, res: Response) => {
    try {
      const hostingId = parseInt(req.params.id);
      const { health, stats } = req.body;
      
      if (health === undefined) {
        return res.status(400).json({ message: "health is required" });
      }
      
      // Update hosting health
      const updatedHosting = await storage.updateWebsiteHostingHealth(hostingId, health);
      
      res.status(200).json({
        success: true,
        message: "Hosting health updated",
        hosting: updatedHosting
      });
    } catch (error) {
      console.error("Error updating hosting health:", error);
      res.status(500).json({ message: "Server error updating hosting health" });
    }
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

  // REACTION ROUTES
  
  // Create or update a reaction
  app.post("/api/reactions", async (req: Request, res: Response) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const reactionData = insertReactionSchema.parse(req.body);
      
      // Ensure the user creating the reaction is the authenticated user
      if (reactionData.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to create reactions for other users" });
      }
      
      // Validate that the post exists
      const post = await storage.getPost(reactionData.postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      // Create/update the reaction
      const reaction = await storage.createReaction(reactionData);
      
      // Notify the post owner about the reaction
      if (post.userId !== req.user.id) {
        broadcastToUser(post.userId, {
          type: "NEW_REACTION",
          data: {
            ...reaction,
            username: req.user.username,
            displayName: req.user.displayName,
            postContent: post.content.substring(0, 50) + (post.content.length > 50 ? "..." : "")
          }
        });
      }
      
      res.status(201).json(reaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating reaction:", error);
      res.status(500).json({ message: "Server error creating reaction" });
    }
  });
  
  // Get reactions for a post
  app.get("/api/posts/:postId/reactions", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.postId);
      
      // Validate that the post exists
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const reactions = await storage.getReactionsByPost(postId);
      res.status(200).json(reactions);
    } catch (error) {
      console.error("Error fetching reactions:", error);
      res.status(500).json({ message: "Server error fetching reactions" });
    }
  });
  
  // Get user's reactions
  app.get("/api/users/:userId/reactions", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // If user is requesting someone else's reactions and is not authenticated, disallow
      if (req.user?.id !== userId && !req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const reactions = await storage.getReactionsByUser(userId);
      res.status(200).json(reactions);
    } catch (error) {
      console.error("Error fetching user reactions:", error);
      res.status(500).json({ message: "Server error fetching user reactions" });
    }
  });
  
  // Delete a reaction
  app.delete("/api/reactions/:id", async (req: Request, res: Response) => {
    try {
      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const reactionId = parseInt(req.params.id);
      
      // Get the reaction to check ownership
      const reaction = await storage.getReaction(reactionId);
      if (!reaction) {
        return res.status(404).json({ message: "Reaction not found" });
      }
      
      // Ensure the user is deleting their own reaction
      if (reaction.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this reaction" });
      }
      
      // Delete the reaction
      const deletedReaction = await storage.deleteReaction(reactionId);
      
      res.status(200).json({ 
        message: "Reaction deleted successfully",
        data: deletedReaction
      });
    } catch (error) {
      console.error("Error deleting reaction:", error);
      res.status(500).json({ message: "Server error deleting reaction" });
    }
  });

  // ENCRYPTED MESSAGING ROUTES
  
  // Create or get a conversation between users
  app.post("/api/conversations", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { otherUserId } = req.body;
      
      if (!otherUserId) {
        return res.status(400).json({ message: "Missing otherUserId parameter" });
      }
      
      // Convert to number
      const recipientId = parseInt(otherUserId);
      
      // Ensure recipient exists
      const recipient = await storage.getUser(recipientId);
      if (!recipient) {
        return res.status(404).json({ message: "Recipient user not found" });
      }
      
      // Get the current user's ID
      const userId = req.user.id;
      
      // Get or create conversation
      const conversation = await storage.getOrCreateConversation(userId, recipientId);
      
      // Get participants for the conversation (including user info)
      const participants = await storage.getConversationParticipants(conversation.conversationId);
      
      // Get the latest messages
      const messages = await storage.getPrivateMessagesByConversation(conversation.conversationId, 50, 0);
      
      // Return conversation with participants and messages
      res.status(200).json({
        ...conversation,
        participants,
        messages
      });
    } catch (error) {
      console.error("Error creating/getting conversation:", error);
      res.status(500).json({ message: "Server error with conversation" });
    }
  });
  
  // Get user's conversations
  app.get("/api/conversations", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const userId = req.user.id;
      
      // Get conversations with participants
      const conversations = await storage.getUserConversations(userId);
      
      // Get last message for each conversation
      const conversationsWithLastMessage = await Promise.all(
        conversations.map(async (conversation) => {
          const messages = await storage.getPrivateMessagesByConversation(
            conversation.conversationId, 
            1, 
            0
          );
          
          return {
            ...conversation,
            lastMessage: messages[0] || null
          };
        })
      );
      
      res.status(200).json(conversationsWithLastMessage);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Server error fetching conversations" });
    }
  });
  
  // Get conversation by ID with messages
  app.get("/api/conversations/:conversationId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      
      // Get the conversation
      const conversation = await storage.getConversationByConversationId(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user is a participant
      const participants = await storage.getConversationParticipants(conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      
      if (!isParticipant) {
        return res.status(403).json({ message: "Not authorized to view this conversation" });
      }
      
      // Get messages, with pagination
      const limit = parseInt(req.query.limit as string || '50');
      const offset = parseInt(req.query.offset as string || '0');
      const messages = await storage.getPrivateMessagesByConversation(conversationId, limit, offset);
      
      // Mark user's messages as read
      await storage.updateParticipantLastRead(userId, conversationId);
      
      // Return conversation with participants and messages
      res.status(200).json({
        ...conversation,
        participants,
        messages
      });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Server error fetching conversation" });
    }
  });
  
  // Send an encrypted message
  app.post("/api/conversations/:conversationId/messages", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      
      // Special handling for development mode
      let messageData;
      if (req.body.content && !req.body.signature && process.env.NODE_ENV !== 'production') {
        console.log("Development mode message detected");
        
        // Find recipient from conversation participants
        const participants = await storage.getConversationParticipants(conversationId);
        const recipient = participants.find(p => p.userId !== userId);
        
        if (!recipient) {
          return res.status(400).json({ message: "Cannot determine message recipient" });
        }
        
        // Create a development mode message with dummy encryption values
        const dummyEncryptedContent = JSON.stringify({
          mode: "development",
          encryptedMessage: Buffer.from(req.body.content).toString('base64')
        });
        
        messageData = {
          senderId: userId,
          recipientId: recipient.userId,
          conversationId,
          encryptedContent: dummyEncryptedContent,
          content: req.body.content, // For development mode only
          encryptionType: "hybrid" as "hybrid", // Force the correct enum type
          iv: 'development-mode-iv',
          signature: 'development-mode-signature',
          status: 'sent'
        };
      } else {
        // Normal production validation
        messageData = insertPrivateMessageSchema.parse({
          ...req.body,
          senderId: userId,
          conversationId
        });
      }
      
      // Ensure conversation exists
      const conversation = await storage.getConversationByConversationId(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user is a participant
      const participants = await storage.getConversationParticipants(conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      
      if (!isParticipant) {
        return res.status(403).json({ message: "Not authorized to post to this conversation" });
      }
      
      // Find the recipient (the other user in the conversation)
      const recipient = participants.find(p => p.userId !== userId);
      if (!recipient) {
        return res.status(400).json({ message: "Could not determine message recipient" });
      }
      
      // Create the message
      const message = await storage.createPrivateMessage({
        ...messageData,
        recipientId: recipient.userId
      });
      
      // Notify the recipient via WebSocket if online
      broadcastToUser(recipient.userId, {
        type: "NEW_MESSAGE",
        data: {
          message,
          conversationId
        }
      });
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Server error sending message" });
    }
  });
  
  // Mark message as read
  app.put("/api/messages/:id/read", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const messageId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Get the message
      const message = await storage.getPrivateMessage(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Check if user is the recipient
      if (message.recipientId !== userId) {
        return res.status(403).json({ message: "Not authorized to mark this message as read" });
      }
      
      // Mark as read
      const updatedMessage = await storage.markMessageAsRead(messageId);
      
      // Update participant's last read time
      await storage.updateParticipantLastRead(userId, message.conversationId);
      
      // Notify the sender via WebSocket
      broadcastToUser(message.senderId, {
        type: "MESSAGE_READ",
        data: {
          messageId,
          conversationId: message.conversationId
        }
      });
      
      res.status(200).json(updatedMessage);
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Server error marking message as read" });
    }
  });
  
  // Get user's unread messages count
  app.get("/api/messages/unread", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const userId = req.user.id;
      
      // Get all user conversations
      const conversations = await storage.getUserConversations(userId);
      
      // For each conversation, get unread messages
      const unreadCounts = await Promise.all(
        conversations.map(async (conversation) => {
          const participant = conversation.participants.find(p => p.userId === userId);
          
          if (!participant || !participant.lastReadAt) {
            // If never read, count all messages not sent by the user
            const allMessages = await storage.getPrivateMessagesByConversation(conversation.conversationId);
            const unreadCount = allMessages.filter(m => m.recipientId === userId).length;
            
            return {
              conversationId: conversation.conversationId,
              unreadCount
            };
          }
          
          // Count messages received after last read
          const messages = await storage.getPrivateMessagesByConversation(conversation.conversationId);
          const unreadCount = messages.filter(m => 
            m.recipientId === userId && 
            (!participant.lastReadAt || new Date(m.sentAt) > new Date(participant.lastReadAt))
          ).length;
          
          return {
            conversationId: conversation.conversationId,
            unreadCount
          };
        })
      );
      
      // Calculate total
      const totalUnread = unreadCounts.reduce((sum, item) => sum + item.unreadCount, 0);
      
      res.status(200).json({
        totalUnread,
        byConversation: unreadCounts
      });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Server error fetching unread count" });
    }
  });

  return httpServer;
}
