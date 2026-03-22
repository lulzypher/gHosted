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
  followers, type Follower, type InsertFollower,
  userChainHeads, type UserChainHead, type InsertUserChainHead,
  chainEntries, type ChainEntry, type InsertChainEntry,
  groups, type Group, type InsertGroup,
  groupMembers, type GroupMember, type InsertGroupMember,
  groupProposals, type GroupProposal, type InsertGroupProposal,
  groupVotes, type GroupVote, type InsertGroupVote,
  groupChainHeads, type GroupChainHead,
  groupChainEntries, type GroupChainEntry,
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
  getUserByPublicKey(publicKey: string): Promise<User | undefined>;
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
  getPostsByUser(userId: number): Promise<Partial<Post>[]>;
  getFeedPosts(limit?: number, offset?: number): Promise<Partial<Post>[]>;
  updatePostStats(id: number, likes?: number, comments?: number, shares?: number): Promise<Post>;
  deletePost(id: number): Promise<Post>;
  
  // Reaction operations
  createReaction(reaction: InsertReaction): Promise<Reaction>;
  getReaction(id: number): Promise<Reaction | undefined>;
  getReactionByUserAndPost(userId: number, postId: number): Promise<Reaction | undefined>;
  getReactionsByPost(postId: number): Promise<Reaction[]>;
  getReactionsByUser(userId: number): Promise<Reaction[]>;
  deleteReaction(id: number): Promise<Reaction>;
  getUserPinHealth(userId: number): Promise<{ totalPins: number; remotePins: number; localPins: number }>;
  
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

  // Follow operations
  followUser(follow: InsertFollower): Promise<Follower>;
  unfollowUser(followerId: number, followeeId: number): Promise<boolean>;

  // Per-user chain operations
  getUserChainHead(userId: number): Promise<UserChainHead | undefined>;
  upsertUserChainHead(data: InsertUserChainHead): Promise<UserChainHead>;
  appendChainEntry(entry: InsertChainEntry): Promise<ChainEntry>;
  getChainEntriesByUser(userId: number, limit?: number): Promise<ChainEntry[]>;

  // Group operations
  createGroup(group: InsertGroup): Promise<Group>;
  getGroup(id: number): Promise<Group | undefined>;
  getGroupByCreatorAndName(creatorId: number, name: string): Promise<Group | undefined>;
  getGroupsByCreator(creatorId: number): Promise<Group[]>;
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  removeGroupMember(groupId: number, userId: number): Promise<boolean>;
  getGroupMembers(groupId: number): Promise<(GroupMember & { user: User })[]>;
  resolveUserInGroup(groupId: number, inGroupHandle: string): Promise<User | undefined>;
  getGroupsForUser(userId: number): Promise<Group[]>;

  // DAO proposals and votes
  createProposal(proposal: InsertGroupProposal): Promise<GroupProposal>;
  getProposal(id: number): Promise<GroupProposal | undefined>;
  getProposalsByGroup(groupId: number, status?: string): Promise<GroupProposal[]>;
  updateProposalStatus(id: number, status: string, executedAt?: Date): Promise<GroupProposal>;
  createVote(vote: InsertGroupVote): Promise<GroupVote>;
  getVotesByProposal(proposalId: number): Promise<GroupVote[]>;
  getVote(proposalId: number, userId: number): Promise<GroupVote | undefined>;
  getGroupChainHead(groupId: number): Promise<GroupChainHead | undefined>;
  appendGroupChainEntry(entry: {
    groupId: number;
    entryCid: string;
    prevCid: string | null;
    action: string;
    payloadCid: string;
    signature: string;
    authorDid: string;
    metadata?: Record<string, unknown>;
  }): Promise<GroupChainEntry>;
  getGroupChainEntries(groupId: number, limit?: number): Promise<GroupChainEntry[]>;
  
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
  
  async getUserByPublicKey(publicKey: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.publicKey, publicKey));
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

  async getPostsByUser(userId: number): Promise<Partial<Post>[]> {
    try {
      console.log(`Database: Fetching posts for user ID ${userId}`);
      
      // Only select fields that are guaranteed to exist
      // This prevents errors if schema changes haven't been applied to the DB
      const results = await db.select({
        id: posts.id,
        userId: posts.userId,
        content: posts.content,
        contentCid: posts.contentCid,
        createdAt: posts.createdAt,
        likes: posts.likes,
        comments: posts.comments,
        shares: posts.shares,
        isDeleted: posts.isDeleted,
        isPrivate: posts.isPrivate
      })
      .from(posts)
      .where(and(
        eq(posts.userId, userId),
        eq(posts.isDeleted, false)
      ))
      .orderBy(desc(posts.createdAt));
      
      console.log(`Database: Successfully retrieved ${results.length} posts`);
      return results;
    } catch (error) {
      console.error(`Database: Error fetching posts for user ${userId}:`, error);
      // Return empty array instead of throwing
      return [];
    }
  }

  async getFeedPosts(limit: number = 20, offset: number = 0): Promise<Partial<Post>[]> {
    try {
      console.log(`Database: Fetching feed posts with limit ${limit}, offset ${offset}`);
      
      // Only select fields that are guaranteed to exist
      const results = await db.select({
        id: posts.id,
        userId: posts.userId,
        content: posts.content,
        contentCid: posts.contentCid,
        createdAt: posts.createdAt,
        likes: posts.likes,
        comments: posts.comments,
        shares: posts.shares,
        isDeleted: posts.isDeleted,
        isPrivate: posts.isPrivate
      })
      .from(posts)
      .where(and(
        eq(posts.isDeleted, false),
        eq(posts.isPrivate, false)
      ))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
      
      console.log(`Database: Successfully retrieved ${results.length} feed posts`);
      return results;
    } catch (error) {
      console.error(`Database: Error fetching feed posts:`, error);
      // Return empty array instead of throwing
      return [];
    }
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

  async getUserPinHealth(userId: number): Promise<{ totalPins: number; remotePins: number; localPins: number }> {
    const userReactions = await this.getReactionsByUser(userId);
    const pinReactions = userReactions.filter((reaction) => reaction.pinToPC || reaction.pinToMobile);
    const remotePins = pinReactions.filter((reaction) => reaction.pinToMobile).length;
    const localPins = pinReactions.filter((reaction) => reaction.pinToPC && !reaction.pinToMobile).length;
    return {
      totalPins: pinReactions.length,
      remotePins,
      localPins
    };
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

  async getUserConversations(userId: number): Promise<(Conversation & {participants: any[]})[]> {
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
    
    // Get all participants for these conversations with user information
    const allParticipants = await db
      .select({
        id: conversationParticipants.id,
        userId: conversationParticipants.userId,
        conversationId: conversationParticipants.conversationId,
        hasLeft: conversationParticipants.hasLeft,
        isAdmin: conversationParticipants.isAdmin,
        lastReadAt: conversationParticipants.lastReadAt,
        joinedAt: conversationParticipants.joinedAt,
        displayName: users.displayName,
        username: users.username,
        avatarCid: users.avatarCid
      })
      .from(conversationParticipants)
      .leftJoin(users, eq(conversationParticipants.userId, users.id))
      .where(inArray(conversationParticipants.conversationId, conversationIds));
    
    // Group participants by conversation
    const participantsByConversation: Record<string, any[]> = {};
    for (const participant of allParticipants) {
      if (!participantsByConversation[participant.conversationId]) {
        participantsByConversation[participant.conversationId] = [];
      }
      participantsByConversation[participant.conversationId].push(participant);
    }
    
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

  async getConversationParticipants(conversationId: string): Promise<any[]> {
    return await db
      .select({
        id: conversationParticipants.id,
        userId: conversationParticipants.userId,
        conversationId: conversationParticipants.conversationId,
        hasLeft: conversationParticipants.hasLeft,
        isAdmin: conversationParticipants.isAdmin,
        lastReadAt: conversationParticipants.lastReadAt,
        joinedAt: conversationParticipants.joinedAt,
        displayName: users.displayName,
        username: users.username,
        avatarCid: users.avatarCid
      })
      .from(conversationParticipants)
      .leftJoin(users, eq(conversationParticipants.userId, users.id))
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

  async followUser(follow: InsertFollower): Promise<Follower> {
    const [newFollow] = await db.insert(followers).values(follow).returning();
    return newFollow;
  }

  async unfollowUser(followerId: number, followeeId: number): Promise<boolean> {
    const removed = await db.delete(followers).where(
      and(eq(followers.followerId, followerId), eq(followers.followeeId, followeeId))
    ).returning();
    return removed.length > 0;
  }

  async getUserChainHead(userId: number): Promise<UserChainHead | undefined> {
    const [head] = await db.select().from(userChainHeads).where(eq(userChainHeads.userId, userId));
    return head || undefined;
  }

  async upsertUserChainHead(data: InsertUserChainHead): Promise<UserChainHead> {
    const existing = await this.getUserChainHead(data.userId);
    if (existing) {
      const [updated] = await db.update(userChainHeads)
        .set({ headCid: data.headCid, updatedAt: new Date() })
        .where(eq(userChainHeads.userId, data.userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(userChainHeads).values(data).returning();
    return created;
  }

  async appendChainEntry(entry: InsertChainEntry): Promise<ChainEntry> {
    const [created] = await db.insert(chainEntries).values(entry).returning();
    await this.upsertUserChainHead({ userId: entry.userId, headCid: entry.entryCid });
    return created;
  }

  async getChainEntriesByUser(userId: number, limit: number = 100): Promise<ChainEntry[]> {
    return db.select().from(chainEntries).where(eq(chainEntries.userId, userId)).orderBy(desc(chainEntries.createdAt)).limit(limit);
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const [created] = await db.insert(groups).values(group).returning();
    return created;
  }

  async getGroup(id: number): Promise<Group | undefined> {
    const [g] = await db.select().from(groups).where(eq(groups.id, id));
    return g || undefined;
  }

  async getGroupByCreatorAndName(creatorId: number, name: string): Promise<Group | undefined> {
    const [g] = await db.select().from(groups).where(
      and(eq(groups.creatorId, creatorId), eq(groups.name, name))
    );
    return g || undefined;
  }

  async getGroupsByCreator(creatorId: number): Promise<Group[]> {
    return db.select().from(groups).where(eq(groups.creatorId, creatorId)).orderBy(desc(groups.createdAt));
  }

  async addGroupMember(member: InsertGroupMember): Promise<GroupMember> {
    const [created] = await db.insert(groupMembers).values(member).returning();
    return created;
  }

  async removeGroupMember(groupId: number, userId: number): Promise<boolean> {
    const removed = await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .returning();
    return removed.length > 0;
  }

  async getGroupMembers(groupId: number): Promise<(GroupMember & { user: User })[]> {
    const rows = await db.select({
      member: groupMembers,
      user: users,
    })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId));
    return rows.map(({ member, user }) => ({ ...member, user }));
  }

  async resolveUserInGroup(groupId: number, inGroupHandle: string): Promise<User | undefined> {
    const rows = await db.select({ user: users })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.inGroupHandle, inGroupHandle)
      ));
    return rows[0]?.user || undefined;
  }

  async getGroupsForUser(userId: number): Promise<Group[]> {
    return db.select({ group: groups })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.userId, userId))
      .then((rows) => rows.map((r) => r.group));
  }

  async createProposal(proposal: InsertGroupProposal): Promise<GroupProposal> {
    const [created] = await db.insert(groupProposals).values(proposal).returning();
    return created;
  }

  async getProposal(id: number): Promise<GroupProposal | undefined> {
    const [p] = await db.select().from(groupProposals).where(eq(groupProposals.id, id));
    return p || undefined;
  }

  async getProposalsByGroup(groupId: number, status?: string): Promise<GroupProposal[]> {
    const conditions = status
      ? and(eq(groupProposals.groupId, groupId), eq(groupProposals.status, status as "pending" | "passed" | "rejected" | "executed"))
      : eq(groupProposals.groupId, groupId);
    return db.select().from(groupProposals).where(conditions).orderBy(desc(groupProposals.createdAt));
  }

  async updateProposalStatus(id: number, status: string, executedAt?: Date): Promise<GroupProposal> {
    const [updated] = await db.update(groupProposals)
      .set({ status: status as "pending" | "passed" | "rejected" | "executed", ...(executedAt && { executedAt }) })
      .where(eq(groupProposals.id, id))
      .returning();
    if (!updated) throw new Error("Proposal not found");
    return updated;
  }

  async createVote(vote: InsertGroupVote): Promise<GroupVote> {
    const [created] = await db.insert(groupVotes).values(vote).returning();
    return created;
  }

  async getVotesByProposal(proposalId: number): Promise<GroupVote[]> {
    return db.select().from(groupVotes).where(eq(groupVotes.proposalId, proposalId));
  }

  async getVote(proposalId: number, userId: number): Promise<GroupVote | undefined> {
    const [v] = await db.select().from(groupVotes).where(
      and(eq(groupVotes.proposalId, proposalId), eq(groupVotes.userId, userId))
    );
    return v || undefined;
  }

  async getGroupChainHead(groupId: number): Promise<GroupChainHead | undefined> {
    const [head] = await db.select().from(groupChainHeads).where(eq(groupChainHeads.groupId, groupId));
    return head || undefined;
  }

  async appendGroupChainEntry(entry: {
    groupId: number;
    entryCid: string;
    prevCid: string | null;
    action: string;
    payloadCid: string;
    signature: string;
    authorDid: string;
    metadata?: Record<string, unknown>;
  }): Promise<GroupChainEntry> {
    const [created] = await db.insert(groupChainEntries).values(entry).returning();
    if (!created) throw new Error("Failed to append group chain entry");
    const [head] = await db.select().from(groupChainHeads).where(eq(groupChainHeads.groupId, entry.groupId));
    if (head) {
      await db.update(groupChainHeads).set({ headCid: entry.entryCid, updatedAt: new Date() }).where(eq(groupChainHeads.groupId, entry.groupId));
    } else {
      await db.insert(groupChainHeads).values({ groupId: entry.groupId, headCid: entry.entryCid });
    }
    return created;
  }

  async getGroupChainEntries(groupId: number, limit: number = 50): Promise<GroupChainEntry[]> {
    return db.select().from(groupChainEntries).where(eq(groupChainEntries.groupId, groupId)).orderBy(desc(groupChainEntries.createdAt)).limit(limit);
  }
}

// Replace memory storage with database storage
export const storage = new DatabaseStorage();
