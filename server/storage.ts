import {
  users, type User, type InsertUser,
  nodes, type Node, type InsertNode,
  contents, type Content, type InsertContent,
  pins, type Pin, type InsertPin,
  nodeConnections, type NodeConnection, type InsertNodeConnection,
  websiteHosting, type WebsiteHosting, type InsertWebsiteHosting,
  posts, type Post, type InsertPost,
  reactions, type Reaction, type InsertReaction,
  privateMessages, type PrivateMessage, type InsertPrivateMessage,
  conversations, type Conversation, type InsertConversation,
  conversationParticipants, type ConversationParticipant, type InsertConversationParticipant,
  reactionTypeEnum, messageStatusEnum
} from "@shared/schema";

// Import db for DatabaseStorage
import { db } from "./db";
import { eq, desc, and, or, isNull, sql, inArray } from "drizzle-orm";
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
  getAllUsers(): Promise<User[]>;
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
  
  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPost(id: number): Promise<Post | undefined>;
  getPostByCID(cid: string): Promise<Post | undefined>;
  getPostsByUser(userId: number): Promise<Post[]>;
  getFeedPosts(limit?: number, offset?: number): Promise<Post[]>;
  updatePostStats(id: number, likes?: number, comments?: number, shares?: number): Promise<Post>;
  deletePost(id: number): Promise<Post>;
  
  // Reaction operations
  createReaction(reaction: InsertReaction): Promise<Reaction>;
  getReaction(id: number): Promise<Reaction | undefined>;
  getReactionByUserAndPost(userId: number, postId: number): Promise<Reaction | undefined>;
  getReactionsByPost(postId: number): Promise<Reaction[]>;
  getReactionsByUser(userId: number): Promise<Reaction[]>;
  deleteReaction(id: number): Promise<Reaction>;
  
  // Private Message operations
  createPrivateMessage(message: InsertPrivateMessage): Promise<PrivateMessage>;
  getPrivateMessage(id: number): Promise<PrivateMessage | undefined>;
  getPrivateMessagesByConversation(conversationId: string, limit?: number, offset?: number): Promise<PrivateMessage[]>;
  getPrivateMessagesByUser(userId: number, limit?: number, offset?: number): Promise<PrivateMessage[]>;
  updateMessageStatus(id: number, status: string): Promise<PrivateMessage>;
  markMessageAsRead(id: number): Promise<PrivateMessage>;
  markMessageAsDelivered(id: number): Promise<PrivateMessage>;
  
  // Conversation operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationByConversationId(conversationId: string): Promise<Conversation | undefined>;
  getUserConversations(userId: number): Promise<(Conversation & {participants: ConversationParticipant[]})[]>;
  getOrCreateConversation(userId1: number, userId2: number): Promise<Conversation>;
  updateLastMessageTime(conversationId: string): Promise<Conversation>;
  
  // Conversation Participant operations
  addParticipantToConversation(participant: InsertConversationParticipant): Promise<ConversationParticipant>;
  getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]>;
  updateParticipantLastRead(userId: number, conversationId: string): Promise<ConversationParticipant>;
  removeParticipantFromConversation(userId: number, conversationId: string): Promise<ConversationParticipant>;
  
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
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.username);
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

  // Post operations
  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async getPost(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async getPostByCID(cid: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.contentCid, cid));
    return post || undefined;
  }

  async getPostsByUser(userId: number): Promise<Post[]> {
    return await db.select()
      .from(posts)
      .where(and(
        eq(posts.userId, userId),
        eq(posts.isDeleted, false)
      ))
      .orderBy(desc(posts.createdAt));
  }

  async getFeedPosts(limit: number = 20, offset: number = 0): Promise<Post[]> {
    return await db.select()
      .from(posts)
      .where(and(
        eq(posts.isDeleted, false),
        eq(posts.isPrivate, false)
      ))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async updatePostStats(id: number, likes?: number, comments?: number, shares?: number): Promise<Post> {
    const updateData: Partial<Post> = {};
    
    if (likes !== undefined) {
      updateData.likes = likes;
    }
    
    if (comments !== undefined) {
      updateData.comments = comments;
    }
    
    if (shares !== undefined) {
      updateData.shares = shares;
    }
    
    const [updatedPost] = await db.update(posts)
      .set(updateData)
      .where(eq(posts.id, id))
      .returning();
    
    if (!updatedPost) {
      throw new Error(`Post with ID ${id} not found`);
    }
    
    return updatedPost;
  }

  async deletePost(id: number): Promise<Post> {
    const [deletedPost] = await db.update(posts)
      .set({ isDeleted: true })
      .where(eq(posts.id, id))
      .returning();
    
    if (!deletedPost) {
      throw new Error(`Post with ID ${id} not found`);
    }
    
    return deletedPost;
  }

  // Reaction operations
  async createReaction(reaction: InsertReaction): Promise<Reaction> {
    // First check if a reaction already exists
    const existingReaction = await this.getReactionByUserAndPost(
      reaction.userId,
      reaction.postId
    );

    if (existingReaction) {
      // Update the existing reaction
      const [updatedReaction] = await db.update(reactions)
        .set({
          reactionType: reaction.reactionType,
          pinToPC: reaction.pinToPC,
          pinToMobile: reaction.pinToMobile,
        })
        .where(eq(reactions.id, existingReaction.id))
        .returning();
      
      return updatedReaction;
    }

    // Create a new reaction
    const [newReaction] = await db.insert(reactions).values(reaction).returning();
    
    // Update the post's like count
    const post = await this.getPost(reaction.postId);
    if (post) {
      await this.updatePostStats(post.id, (post.likes || 0) + 1);
    }
    
    return newReaction;
  }

  async getReaction(id: number): Promise<Reaction | undefined> {
    const [reaction] = await db.select().from(reactions).where(eq(reactions.id, id));
    return reaction || undefined;
  }

  async getReactionByUserAndPost(userId: number, postId: number): Promise<Reaction | undefined> {
    const [reaction] = await db.select()
      .from(reactions)
      .where(and(
        eq(reactions.userId, userId),
        eq(reactions.postId, postId)
      ));
    
    return reaction || undefined;
  }

  async getReactionsByPost(postId: number): Promise<Reaction[]> {
    return await db.select()
      .from(reactions)
      .where(eq(reactions.postId, postId))
      .orderBy(desc(reactions.createdAt));
  }

  async getReactionsByUser(userId: number): Promise<Reaction[]> {
    return await db.select()
      .from(reactions)
      .where(eq(reactions.userId, userId))
      .orderBy(desc(reactions.createdAt));
  }

  async deleteReaction(id: number): Promise<Reaction> {
    // Get the reaction before deleting
    const reaction = await this.getReaction(id);
    if (!reaction) {
      throw new Error(`Reaction with ID ${id} not found`);
    }
    
    // Delete the reaction
    const [deletedReaction] = await db.delete(reactions)
      .where(eq(reactions.id, id))
      .returning();
    
    // Update the post's like count
    const post = await this.getPost(reaction.postId);
    if (post && (post.likes || 0) > 0) {
      await this.updatePostStats(post.id, (post.likes || 0) - 1);
    }
    
    return deletedReaction;
  }

  // Private Message operations
  async createPrivateMessage(message: InsertPrivateMessage): Promise<PrivateMessage> {
    const [newMessage] = await db.insert(privateMessages).values(message).returning();
    
    // Update the conversation's last message time
    await this.updateLastMessageTime(message.conversationId);
    
    return newMessage;
  }

  async getPrivateMessage(id: number): Promise<PrivateMessage | undefined> {
    const [message] = await db.select().from(privateMessages).where(eq(privateMessages.id, id));
    return message || undefined;
  }

  async getPrivateMessagesByConversation(conversationId: string, limit: number = 50, offset: number = 0): Promise<PrivateMessage[]> {
    return await db.select()
      .from(privateMessages)
      .where(eq(privateMessages.conversationId, conversationId))
      .orderBy(desc(privateMessages.sentAt))
      .limit(limit)
      .offset(offset);
  }

  async getPrivateMessagesByUser(userId: number, limit: number = 50, offset: number = 0): Promise<PrivateMessage[]> {
    return await db.select()
      .from(privateMessages)
      .where(or(
        eq(privateMessages.senderId, userId),
        eq(privateMessages.recipientId, userId)
      ))
      .orderBy(desc(privateMessages.sentAt))
      .limit(limit)
      .offset(offset);
  }

  async updateMessageStatus(id: number, status: string): Promise<PrivateMessage> {
    // Convert status string to enum value
    const messageStatus = status as "sent" | "delivered" | "read" | "failed";
    
    const [updatedMessage] = await db.update(privateMessages)
      .set({ status: messageStatus })
      .where(eq(privateMessages.id, id))
      .returning();
    
    if (!updatedMessage) {
      throw new Error(`Message with ID ${id} not found`);
    }
    
    return updatedMessage;
  }

  async markMessageAsRead(id: number): Promise<PrivateMessage> {
    const now = new Date();
    const [updatedMessage] = await db.update(privateMessages)
      .set({ 
        status: 'read', 
        readAt: now 
      })
      .where(eq(privateMessages.id, id))
      .returning();
    
    if (!updatedMessage) {
      throw new Error(`Message with ID ${id} not found`);
    }
    
    return updatedMessage;
  }

  async markMessageAsDelivered(id: number): Promise<PrivateMessage> {
    const now = new Date();
    const [updatedMessage] = await db.update(privateMessages)
      .set({ 
        status: 'delivered', 
        deliveredAt: now 
      })
      .where(eq(privateMessages.id, id))
      .returning();
    
    if (!updatedMessage) {
      throw new Error(`Message with ID ${id} not found`);
    }
    
    return updatedMessage;
  }

  // Conversation operations
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationByConversationId(conversationId: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.conversationId, conversationId));
    return conversation || undefined;
  }

  async getUserConversations(userId: number): Promise<(Conversation & {participants: ConversationParticipant[]})[]> {
    // First get all conversation IDs that the user is part of
    const userParticipations = await db.select()
      .from(conversationParticipants)
      .where(and(
        eq(conversationParticipants.userId, userId),
        eq(conversationParticipants.hasLeft, false)
      ));
    
    if (userParticipations.length === 0) {
      return [];
    }
    
    // Extract conversation IDs
    const conversationIds = userParticipations.map(p => p.conversationId);
    
    // Get all conversations with those IDs
    const userConversations = await db.select()
      .from(conversations)
      .where(inArray(conversations.conversationId, conversationIds))
      .orderBy(desc(conversations.lastMessageAt));
    
    // Get all participants for these conversations
    const allParticipants = await db.select()
      .from(conversationParticipants)
      .where(inArray(conversationParticipants.conversationId, conversationIds));
    
    // Group participants by conversation
    const participantsByConversation = allParticipants.reduce((acc, participant) => {
      if (!acc[participant.conversationId]) {
        acc[participant.conversationId] = [];
      }
      
      acc[participant.conversationId].push(participant);
      return acc;
    }, {} as Record<string, ConversationParticipant[]>);
    
    // Combine conversations with their participants
    return userConversations.map(conversation => ({
      ...conversation,
      participants: participantsByConversation[conversation.conversationId] || []
    }));
  }

  async getOrCreateConversation(userId1: number, userId2: number): Promise<Conversation> {
    // Create a deterministic conversation ID based on the sorted user IDs
    const sortedUserIds = [userId1, userId2].sort((a, b) => a - b);
    const conversationId = `user_${sortedUserIds[0]}_user_${sortedUserIds[1]}`;
    
    // Check if conversation already exists
    const existingConversation = await this.getConversationByConversationId(conversationId);
    
    if (existingConversation) {
      return existingConversation;
    }
    
    // Create new conversation
    const newConversation = await this.createConversation({
      conversationId,
      isGroup: false,
      name: null,
      metadata: null
    });
    
    // Add participants
    await this.addParticipantToConversation({
      conversationId,
      userId: userId1,
      isAdmin: false
    });
    
    await this.addParticipantToConversation({
      conversationId,
      userId: userId2,
      isAdmin: false
    });
    
    return newConversation;
  }

  async updateLastMessageTime(conversationId: string): Promise<Conversation> {
    const now = new Date();
    const [updatedConversation] = await db.update(conversations)
      .set({ lastMessageAt: now })
      .where(eq(conversations.conversationId, conversationId))
      .returning();
    
    if (!updatedConversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }
    
    return updatedConversation;
  }

  // Conversation Participant operations
  async addParticipantToConversation(participant: InsertConversationParticipant): Promise<ConversationParticipant> {
    // Check if the participant already exists but has left
    const existingParticipant = await db.select()
      .from(conversationParticipants)
      .where(and(
        eq(conversationParticipants.conversationId, participant.conversationId),
        eq(conversationParticipants.userId, participant.userId)
      ))
      .limit(1);
    
    if (existingParticipant.length > 0) {
      // Reactivate the participant if they had left
      if (existingParticipant[0].hasLeft) {
        const [updatedParticipant] = await db.update(conversationParticipants)
          .set({ 
            hasLeft: false,
            joinedAt: new Date()
          })
          .where(eq(conversationParticipants.id, existingParticipant[0].id))
          .returning();
        
        return updatedParticipant;
      }
      
      return existingParticipant[0];
    }
    
    // Add new participant
    const [newParticipant] = await db.insert(conversationParticipants)
      .values(participant)
      .returning();
    
    return newParticipant;
  }

  async getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]> {
    return await db.select()
      .from(conversationParticipants)
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.hasLeft, false)
      ));
  }

  async updateParticipantLastRead(userId: number, conversationId: string): Promise<ConversationParticipant> {
    const now = new Date();
    const [updatedParticipant] = await db.update(conversationParticipants)
      .set({ lastReadAt: now })
      .where(and(
        eq(conversationParticipants.userId, userId),
        eq(conversationParticipants.conversationId, conversationId)
      ))
      .returning();
    
    if (!updatedParticipant) {
      throw new Error(`Participant not found for user ${userId} in conversation ${conversationId}`);
    }
    
    return updatedParticipant;
  }

  async removeParticipantFromConversation(userId: number, conversationId: string): Promise<ConversationParticipant> {
    const [updatedParticipant] = await db.update(conversationParticipants)
      .set({ hasLeft: true })
      .where(and(
        eq(conversationParticipants.userId, userId),
        eq(conversationParticipants.conversationId, conversationId)
      ))
      .returning();
    
    if (!updatedParticipant) {
      throw new Error(`Participant not found for user ${userId} in conversation ${conversationId}`);
    }
    
    return updatedParticipant;
  }
}

// Replace memory storage with database storage
export const storage = new DatabaseStorage();
