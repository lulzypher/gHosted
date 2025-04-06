import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertPostSchema, 
  insertDeviceSchema, 
  insertPinnedContentSchema,
  insertPeerConnectionSchema
} from "@shared/schema";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

// WebSocket connections by user
const wsConnections = new Map<number, Set<WebSocket>>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup WebSocket server for real-time updates
  // Use a specific path to avoid conflicts with Vite's WebSocket
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/api/ws'
  });
  
  wss.on("connection", (ws: WebSocket, req) => {
    // Extract user ID from the request
    const params = new URLSearchParams(req.url?.split("?")[1] || "");
    const userId = parseInt(params.get("userId") || "0");
    
    if (userId) {
      // Store the connection
      if (!wsConnections.has(userId)) {
        wsConnections.set(userId, new Set());
      }
      wsConnections.get(userId)?.add(ws);
      
      // Handle connection close using the event listener
      ws.addEventListener("close", () => {
        wsConnections.get(userId)?.delete(ws);
        if (wsConnections.get(userId)?.size === 0) {
          wsConnections.delete(userId);
        }
      });
    }
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

  // AUTH ROUTES
  
  // Register user
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      // Check if DID already exists
      const existingDID = await storage.getUserByDID(userData.did);
      if (existingDID) {
        return res.status(400).json({ message: "DID already registered" });
      }
      
      const user = await storage.createUser(userData);
      res.status(201).json({ 
        id: user.id, 
        username: user.username, 
        displayName: user.displayName,
        did: user.did
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error during registration" });
    }
  });
  
  // Login user
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      res.status(200).json({ 
        id: user.id, 
        username: user.username, 
        displayName: user.displayName,
        did: user.did
      });
    } catch (error) {
      res.status(500).json({ message: "Server error during login" });
    }
  });
  
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

  return httpServer;
}
