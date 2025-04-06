import {
  users, type User, type InsertUser,
  nodes, type Node, type InsertNode,
  contents, type Content, type InsertContent,
  pins, type Pin, type InsertPin,
  nodeConnections, type NodeConnection, type InsertNodeConnection,
  websiteHosting, type WebsiteHosting, type InsertWebsiteHosting
} from "@shared/schema";

// Import db for DatabaseStorage
import { db } from "./db";
import { eq, desc, and, or, isNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import pg from "pg";

// Create PostgreSQL pool for session store
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const PostgresSessionStore = connectPg(session);

// Interface for storage operations with session store
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByDID(did: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Node operations
  createNode(node: InsertNode): Promise<Node>;
  getNode(id: number): Promise<Node | undefined>;
  getNodeByNodeId(nodeId: string): Promise<Node | undefined>;
  getNodesByUser(userId: number): Promise<Node[]>;
  getNodesByRole(role: string): Promise<Node[]>;
  getWebsiteNodes(): Promise<Node[]>;
  updateNodeStatus(id: number, status: string): Promise<Node>;
  updateNodeLastSeen(id: number): Promise<Node>;
  
  // Content operations
  createContent(content: InsertContent): Promise<Content>;
  getContent(id: number): Promise<Content | undefined>;
  getContentByCID(cid: string): Promise<Content | undefined>;
  getContentsByUser(userId: number): Promise<Content[]>;
  getFeedContents(): Promise<Content[]>;
  
  // Pin operations
  createPin(pin: InsertPin): Promise<Pin>;
  getPinsByUser(userId: number): Promise<Pin[]>;
  getPinsByNode(nodeId: number): Promise<Pin[]>;
  getPinByUserAndContent(userId: number, contentId: number): Promise<Pin | undefined>;
  updatePinStatus(id: number, isActive: boolean): Promise<Pin>;
  
  // Node connection operations
  createNodeConnection(connection: InsertNodeConnection): Promise<NodeConnection>;
  getNodeConnectionsBySourceNode(nodeId: number): Promise<NodeConnection[]>;
  getNodeConnectionsByTargetNode(nodeId: number): Promise<NodeConnection[]>;
  updateNodeConnectionStatus(id: number, status: string): Promise<NodeConnection>;
  
  // Website hosting operations
  createWebsiteHosting(hosting: InsertWebsiteHosting): Promise<WebsiteHosting>;
  getActiveWebsiteHostings(): Promise<WebsiteHosting[]>;
  updateWebsiteHostingHealth(id: number, health: number): Promise<WebsiteHosting>;
  endWebsiteHosting(id: number): Promise<WebsiteHosting>;
  
  // Session store
  sessionStore: session.Store;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    // Initialize PostgreSQL session store
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByDID(did: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.did, did));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Node operations
  async createNode(node: InsertNode): Promise<Node> {
    const [newNode] = await db.insert(nodes).values(node).returning();
    return newNode;
  }

  async getNode(id: number): Promise<Node | undefined> {
    const [node] = await db.select().from(nodes).where(eq(nodes.id, id));
    return node || undefined;
  }

  async getNodeByNodeId(nodeId: string): Promise<Node | undefined> {
    const [node] = await db.select().from(nodes).where(eq(nodes.nodeId, nodeId));
    return node || undefined;
  }

  async getNodesByUser(userId: number): Promise<Node[]> {
    return await db.select()
      .from(nodes)
      .where(eq(nodes.userId, userId))
      .orderBy(desc(nodes.lastSeen));
  }

  async getNodesByRole(role: string): Promise<Node[]> {
    // Cast role string to the proper enum type
    const nodeRole = role as "website" | "server" | "mobile" | "browser";
    return await db.select()
      .from(nodes)
      .where(eq(nodes.role, nodeRole))
      .orderBy(desc(nodes.lastSeen));
  }

  async getWebsiteNodes(): Promise<Node[]> {
    return await db.select()
      .from(nodes)
      .where(eq(nodes.isHostingWebsite, true))
      .orderBy(desc(nodes.lastSeen));
  }

  async updateNodeStatus(id: number, status: string): Promise<Node> {
    // Cast status string to the proper enum type
    const nodeStatus = status as "online" | "offline" | "syncing";
    const [updatedNode] = await db.update(nodes)
      .set({ 
        status: nodeStatus,
        lastSeen: new Date()
      })
      .where(eq(nodes.id, id))
      .returning();
    
    if (!updatedNode) {
      throw new Error(`Node with ID ${id} not found`);
    }
    
    return updatedNode;
  }

  async updateNodeLastSeen(id: number): Promise<Node> {
    const [updatedNode] = await db.update(nodes)
      .set({ lastSeen: new Date() })
      .where(eq(nodes.id, id))
      .returning();
    
    if (!updatedNode) {
      throw new Error(`Node with ID ${id} not found`);
    }
    
    return updatedNode;
  }

  // Content operations
  async createContent(content: InsertContent): Promise<Content> {
    const [newContent] = await db.insert(contents).values(content).returning();
    return newContent;
  }

  async getContent(id: number): Promise<Content | undefined> {
    const [content] = await db.select().from(contents).where(eq(contents.id, id));
    return content || undefined;
  }

  async getContentByCID(cid: string): Promise<Content | undefined> {
    const [content] = await db.select().from(contents).where(eq(contents.cid, cid));
    return content || undefined;
  }

  async getContentsByUser(userId: number): Promise<Content[]> {
    return await db.select()
      .from(contents)
      .where(eq(contents.userId, userId))
      .orderBy(desc(contents.createdAt));
  }

  async getFeedContents(): Promise<Content[]> {
    // Cast the content type to the proper enum value
    const postType = 'post' as "post" | "comment" | "media" | "profile";
    return await db.select()
      .from(contents)
      .where(eq(contents.contentType, postType))
      .orderBy(desc(contents.createdAt));
  }

  // Pin operations
  async createPin(pin: InsertPin): Promise<Pin> {
    const [newPin] = await db.insert(pins).values(pin).returning();
    return newPin;
  }

  async getPinsByUser(userId: number): Promise<Pin[]> {
    return await db.select()
      .from(pins)
      .where(eq(pins.userId, userId))
      .orderBy(desc(pins.pinnedAt));
  }

  async getPinsByNode(nodeId: number): Promise<Pin[]> {
    return await db.select()
      .from(pins)
      .where(eq(pins.nodeId, nodeId))
      .orderBy(desc(pins.pinnedAt));
  }

  async getPinByUserAndContent(userId: number, contentId: number): Promise<Pin | undefined> {
    const [pin] = await db.select()
      .from(pins)
      .where(and(
        eq(pins.userId, userId),
        eq(pins.contentId, contentId)
      ));
    
    return pin || undefined;
  }

  async updatePinStatus(id: number, isActive: boolean): Promise<Pin> {
    const [updatedPin] = await db.update(pins)
      .set({ isActive })
      .where(eq(pins.id, id))
      .returning();
    
    if (!updatedPin) {
      throw new Error(`Pin with ID ${id} not found`);
    }
    
    return updatedPin;
  }

  // Node connection operations
  async createNodeConnection(connection: InsertNodeConnection): Promise<NodeConnection> {
    const [newConnection] = await db.insert(nodeConnections).values(connection).returning();
    return newConnection;
  }

  async getNodeConnectionsBySourceNode(nodeId: number): Promise<NodeConnection[]> {
    return await db.select()
      .from(nodeConnections)
      .where(eq(nodeConnections.sourceNodeId, nodeId))
      .orderBy(desc(nodeConnections.lastConnected));
  }

  async getNodeConnectionsByTargetNode(nodeId: number): Promise<NodeConnection[]> {
    return await db.select()
      .from(nodeConnections)
      .where(eq(nodeConnections.targetNodeId, nodeId))
      .orderBy(desc(nodeConnections.lastConnected));
  }

  async updateNodeConnectionStatus(id: number, status: string): Promise<NodeConnection> {
    const now = new Date();
    const [updatedConnection] = await db.update(nodeConnections)
      .set({ 
        status: status as string, // Connection status is a regular text field, not an enum
        lastConnected: now
      })
      .where(eq(nodeConnections.id, id))
      .returning();
    
    if (!updatedConnection) {
      throw new Error(`Node connection with ID ${id} not found`);
    }
    
    return updatedConnection;
  }

  // Website hosting operations
  async createWebsiteHosting(hosting: InsertWebsiteHosting): Promise<WebsiteHosting> {
    const [newHosting] = await db.insert(websiteHosting).values(hosting).returning();
    return newHosting;
  }

  async getActiveWebsiteHostings(): Promise<WebsiteHosting[]> {
    return await db.select()
      .from(websiteHosting)
      .where(isNull(websiteHosting.endTime))
      .orderBy(desc(websiteHosting.startTime));
  }

  async updateWebsiteHostingHealth(id: number, health: number): Promise<WebsiteHosting> {
    const [updatedHosting] = await db.update(websiteHosting)
      .set({ health })
      .where(eq(websiteHosting.id, id))
      .returning();
    
    if (!updatedHosting) {
      throw new Error(`Website hosting with ID ${id} not found`);
    }
    
    return updatedHosting;
  }

  async endWebsiteHosting(id: number): Promise<WebsiteHosting> {
    const now = new Date();
    const [updatedHosting] = await db.update(websiteHosting)
      .set({ endTime: now })
      .where(eq(websiteHosting.id, id))
      .returning();
    
    if (!updatedHosting) {
      throw new Error(`Website hosting with ID ${id} not found`);
    }
    
    return updatedHosting;
  }
}

// Replace memory storage with database storage
export const storage = new DatabaseStorage();
