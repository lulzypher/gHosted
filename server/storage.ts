import { 
  users, type User, type InsertUser,
  posts, type Post, type InsertPost,
  peerConnections, type PeerConnection, type InsertPeerConnection,
  devices, type Device, type InsertDevice,
  pinnedContents, type PinnedContent, type InsertPinnedContent
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByDID(did: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPost(id: number): Promise<Post | undefined>;
  getPostByCID(contentCid: string): Promise<Post | undefined>;
  getPostsByUser(userId: number): Promise<Post[]>;
  getFeedPosts(): Promise<Post[]>;
  
  // Peer connection operations
  createPeerConnection(connection: InsertPeerConnection): Promise<PeerConnection>;
  getPeerConnectionsByUser(userId: number): Promise<PeerConnection[]>;
  updatePeerConnectionStatus(id: number, status: string): Promise<PeerConnection>;
  
  // Device operations
  createDevice(device: InsertDevice): Promise<Device>;
  getDevicesByUser(userId: number): Promise<Device[]>;
  updateDeviceLastSynced(id: number): Promise<Device>;
  
  // Pinned content operations
  pinContent(content: InsertPinnedContent): Promise<PinnedContent>;
  getPinnedContentsByUser(userId: number): Promise<PinnedContent[]>;
  getPinnedContentByUserAndCID(userId: number, contentCid: string): Promise<PinnedContent | undefined>;
  unpinContent(id: number): Promise<void>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private posts: Map<number, Post>;
  private peerConnections: Map<number, PeerConnection>;
  private devices: Map<number, Device>;
  private pinnedContents: Map<number, PinnedContent>;
  private userIdCounter: number;
  private postIdCounter: number;
  private peerConnectionIdCounter: number;
  private deviceIdCounter: number;
  private pinnedContentIdCounter: number;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.peerConnections = new Map();
    this.devices = new Map();
    this.pinnedContents = new Map();
    this.userIdCounter = 1;
    this.postIdCounter = 1;
    this.peerConnectionIdCounter = 1;
    this.deviceIdCounter = 1;
    this.pinnedContentIdCounter = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByDID(did: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.did === did,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Post operations
  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = this.postIdCounter++;
    const post: Post = { 
      ...insertPost, 
      id, 
      createdAt: new Date() 
    };
    this.posts.set(id, post);
    return post;
  }

  async getPost(id: number): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async getPostByCID(contentCid: string): Promise<Post | undefined> {
    return Array.from(this.posts.values()).find(
      (post) => post.contentCid === contentCid,
    );
  }

  async getPostsByUser(userId: number): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter((post) => post.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getFeedPosts(): Promise<Post[]> {
    return Array.from(this.posts.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Peer connection operations
  async createPeerConnection(insertConnection: InsertPeerConnection): Promise<PeerConnection> {
    const id = this.peerConnectionIdCounter++;
    const connection: PeerConnection = { 
      ...insertConnection, 
      id, 
      lastSeen: new Date() 
    };
    this.peerConnections.set(id, connection);
    return connection;
  }

  async getPeerConnectionsByUser(userId: number): Promise<PeerConnection[]> {
    return Array.from(this.peerConnections.values())
      .filter((connection) => connection.userId === userId);
  }

  async updatePeerConnectionStatus(id: number, status: string): Promise<PeerConnection> {
    const connection = this.peerConnections.get(id);
    if (!connection) {
      throw new Error(`Peer connection with ID ${id} not found`);
    }
    
    const updatedConnection: PeerConnection = {
      ...connection,
      status,
      lastSeen: new Date()
    };
    
    this.peerConnections.set(id, updatedConnection);
    return updatedConnection;
  }

  // Device operations
  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const id = this.deviceIdCounter++;
    const device: Device = { 
      ...insertDevice, 
      id, 
      lastSynced: new Date() 
    };
    this.devices.set(id, device);
    return device;
  }

  async getDevicesByUser(userId: number): Promise<Device[]> {
    return Array.from(this.devices.values())
      .filter((device) => device.userId === userId);
  }

  async updateDeviceLastSynced(id: number): Promise<Device> {
    const device = this.devices.get(id);
    if (!device) {
      throw new Error(`Device with ID ${id} not found`);
    }
    
    const updatedDevice: Device = {
      ...device,
      lastSynced: new Date()
    };
    
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }

  // Pinned content operations
  async pinContent(insertPinnedContent: InsertPinnedContent): Promise<PinnedContent> {
    const id = this.pinnedContentIdCounter++;
    const pinnedContent: PinnedContent = { 
      ...insertPinnedContent, 
      id, 
      pinnedAt: new Date() 
    };
    this.pinnedContents.set(id, pinnedContent);
    return pinnedContent;
  }

  async getPinnedContentsByUser(userId: number): Promise<PinnedContent[]> {
    return Array.from(this.pinnedContents.values())
      .filter((content) => content.userId === userId)
      .sort((a, b) => b.pinnedAt.getTime() - a.pinnedAt.getTime());
  }

  async getPinnedContentByUserAndCID(userId: number, contentCid: string): Promise<PinnedContent | undefined> {
    return Array.from(this.pinnedContents.values()).find(
      (content) => content.userId === userId && content.contentCid === contentCid,
    );
  }

  async unpinContent(id: number): Promise<void> {
    this.pinnedContents.delete(id);
  }
}

export const storage = new MemStorage();
