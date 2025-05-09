import { pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum, unique } from "drizzle-orm/pg-core";
import { relations, desc, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const nodeRoleEnum = pgEnum('node_role', ['website', 'server', 'mobile', 'browser']);
export const nodeStatusEnum = pgEnum('node_status', ['online', 'offline', 'syncing']);
export const pinTypeEnum = pgEnum('pin_type', ['pc', 'mobile', 'both']);
export const contentTypeEnum = pgEnum('content_type', ['post', 'comment', 'media', 'profile']);
export const reactionTypeEnum = pgEnum('reaction_type', ['like', 'love', 'save']);
export const messageStatusEnum = pgEnum('message_status', ['sent', 'delivered', 'read', 'failed']);
export const encryptionTypeEnum = pgEnum('encryption_type', ['asymmetric', 'symmetric', 'hybrid']);

// User schema with enhanced public key cryptography
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  // Password is optional as we primarily use public key auth
  password: text("password"),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarCid: text("avatar_cid"),
  // Decentralized identifier
  did: text("did").notNull().unique(),
  // Public key for verification and encryption
  publicKey: text("public_key").notNull(),
  // Optional encryption key for private content
  encryptionKey: text("encryption_key"),
  // User's profile as IPNS address
  ipnsAddress: text("ipns_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // User preferences and settings
  settings: jsonb("settings"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  bio: true,
  avatarCid: true,
  did: true,
  publicKey: true,
  encryptionKey: true,
  ipnsAddress: true,
  settings: true,
});

// Node schema for distributed hosting
export const nodes = pgTable("nodes", {
  id: serial("id").primaryKey(),
  // Owner of this node
  userId: integer("user_id").notNull().references(() => users.id),
  // Node identifier
  nodeId: text("node_id").notNull().unique(),
  // Human-readable name
  name: text("name").notNull(),
  // Node type/role
  role: nodeRoleEnum("role").notNull(),
  // Current status
  status: nodeStatusEnum("status").notNull().default('offline'),
  // Public key for node authentication
  publicKey: text("public_key").notNull(),
  // Last seen online timestamp
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  // Connection information (URL, IP, port)
  connectionInfo: jsonb("connection_info"),
  // IPFS peer ID
  ipfsPeerId: text("ipfs_peer_id"),
  // Storage capacity
  storageCapacity: integer("storage_capacity"),
  // Current storage usage
  storageUsed: integer("storage_used").default(0),
  // Node capabilities (JSON of supported features)
  capabilities: jsonb("capabilities"),
  // Is this node hosting the website?
  isHostingWebsite: boolean("is_hosting_website").default(false),
  // Registration date
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNodeSchema = createInsertSchema(nodes).pick({
  userId: true,
  nodeId: true,
  name: true,
  role: true,
  status: true,
  publicKey: true,
  connectionInfo: true,
  ipfsPeerId: true,
  storageCapacity: true,
  capabilities: true,
  isHostingWebsite: true,
});

// Create a separate schema to avoid circular reference
export const contentSchema = {
  id: serial("id").primaryKey(),
  // Creator of this content
  userId: integer("user_id").notNull().references(() => users.id),
  // Content type
  contentType: contentTypeEnum("content_type").notNull(),
  // IPFS CID of the content
  cid: text("cid").notNull().unique(),
  // Actual content text (if not too large)
  content: text("content"),
  // Media CID if present
  mediaCid: text("media_cid"),
  // Content metadata
  metadata: jsonb("metadata"),
  // Digital signature by the author for verification
  signature: text("signature").notNull(),
  // Is content encrypted?
  isEncrypted: boolean("is_encrypted").default(false),
  // Creation timestamp
  createdAt: timestamp("created_at").notNull().defaultNow(),
};

// Content schema for posts, comments, media
export const contents = pgTable("contents", {
  ...contentSchema,
  // Optional parent content reference (for comments/replies)
  parentId: integer("parent_id"),
});

// We'll handle the self-reference in the relations definitions instead of using foreignKey
// This avoids the circular reference issue without using the foreignKey method

export const insertContentSchema = createInsertSchema(contents).pick({
  userId: true,
  contentType: true,
  cid: true,
  content: true,
  mediaCid: true,
  parentId: true,
  metadata: true,
  signature: true,
  isEncrypted: true,
});

// Pins track which content is pinned on which nodes
export const pins = pgTable("pins", {
  id: serial("id").primaryKey(),
  // User who pinned the content
  userId: integer("user_id").notNull().references(() => users.id),
  // Content being pinned
  contentId: integer("content_id").notNull().references(() => contents.id),
  // Node where this is pinned
  nodeId: integer("node_id").references(() => nodes.id),
  // Pin type (pc, mobile, both)
  pinType: pinTypeEnum("pin_type").notNull(),
  // Device-specific pin if applicable
  deviceId: text("device_id"),
  // Pin timestamp
  pinnedAt: timestamp("pinned_at").notNull().defaultNow(),
  // Is this pin active?
  isActive: boolean("is_active").default(true),
}, (table) => {
  return {
    // Ensure unique pins per user, content, node and type
    uniquePin: unique().on(table.userId, table.contentId, table.nodeId, table.pinType),
  };
});

export const insertPinSchema = createInsertSchema(pins).pick({
  userId: true,
  contentId: true,
  nodeId: true,
  pinType: true,
  deviceId: true,
  isActive: true,
});

// Node connections track distributed network topology
export const nodeConnections = pgTable("node_connections", {
  id: serial("id").primaryKey(),
  // Source node
  sourceNodeId: integer("source_node_id").notNull().references(() => nodes.id),
  // Target node
  targetNodeId: integer("target_node_id").notNull().references(() => nodes.id),
  // Connection status
  status: text("status").notNull(),
  // Connection strength/quality
  quality: integer("quality"),
  // Last successful connection
  lastConnected: timestamp("last_connected"),
  // Connection metadata (latency, protocol, etc.)
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    // Ensure unique connections between nodes
    uniqueConnection: unique().on(table.sourceNodeId, table.targetNodeId),
  };
});

export const insertNodeConnectionSchema = createInsertSchema(nodeConnections).pick({
  sourceNodeId: true,
  targetNodeId: true,
  status: true,
  quality: true,
  metadata: true,
});

// Website hosting contributions
export const websiteHosting = pgTable("website_hosting", {
  id: serial("id").primaryKey(),
  // Node hosting the website
  nodeId: integer("node_id").notNull().references(() => nodes.id),
  // Start time of hosting
  startTime: timestamp("start_time").notNull().defaultNow(),
  // End time of hosting (if applicable)
  endTime: timestamp("end_time"),
  // Domain/subdomain being hosted
  domain: text("domain").notNull(),
  // Health status
  health: integer("health").default(100),
  // Hosting statistics
  stats: jsonb("stats"),
});

export const insertWebsiteHostingSchema = createInsertSchema(websiteHosting).pick({
  nodeId: true,
  domain: true,
  health: true,
  stats: true,
});

// Define relationships between tables
export const usersRelations = relations(users, ({ many }) => ({
  nodes: many(nodes),
  contents: many(contents),
  pins: many(pins),
}));

export const nodesRelations = relations(nodes, ({ one, many }) => ({
  user: one(users, {
    fields: [nodes.userId],
    references: [users.id],
  }),
  outgoingConnections: many(nodeConnections, { relationName: "outgoingConnections" }),
  incomingConnections: many(nodeConnections, { relationName: "incomingConnections" }),
  pins: many(pins),
  websiteHosting: many(websiteHosting),
}));

export const contentsRelations = relations(contents, ({ one, many }) => ({
  user: one(users, {
    fields: [contents.userId],
    references: [users.id],
  }),
  parent: one(contents, {
    fields: [contents.parentId],
    references: [contents.id],
  }),
  pins: many(pins),
  children: many(contents, { relationName: "children" }),
}));

export const pinsRelations = relations(pins, ({ one }) => ({
  user: one(users, {
    fields: [pins.userId],
    references: [users.id],
  }),
  content: one(contents, {
    fields: [pins.contentId],
    references: [contents.id],
  }),
  node: one(nodes, {
    fields: [pins.nodeId],
    references: [nodes.id],
  }),
}));

export const nodeConnectionsRelations = relations(nodeConnections, ({ one }) => ({
  sourceNode: one(nodes, {
    fields: [nodeConnections.sourceNodeId],
    references: [nodes.id],
    relationName: "outgoingConnections",
  }),
  targetNode: one(nodes, {
    fields: [nodeConnections.targetNodeId],
    references: [nodes.id],
    relationName: "incomingConnections",
  }),
}));

// Posts schema for social media posts
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  mediaCid: text("media_cid"),
  contentCid: text("content_cid").notNull().unique(),
  signature: text("signature"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  likes: integer("likes").default(0),
  shares: integer("shares").default(0),
  comments: integer("comments").default(0),
  isDeleted: boolean("is_deleted").default(false),
  isPrivate: boolean("is_private").default(false),
  metadata: jsonb("metadata"),
});

export const insertPostSchema = createInsertSchema(posts).pick({
  userId: true,
  content: true,
  mediaCid: true,
  contentCid: true,
  signature: true,
  isPrivate: true,
  metadata: true,
});

// Reactions schema for post reactions (likes, loves, etc.)
export const reactions = pgTable("reactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  postId: integer("post_id").notNull().references(() => posts.id),
  reactionType: reactionTypeEnum("reaction_type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Pin settings
  pinToPC: boolean("pin_to_pc").default(false),
  pinToMobile: boolean("pin_to_mobile").default(false),
}, (table) => {
  return {
    // Ensure unique reactions per user and post
    uniqueReaction: unique().on(table.userId, table.postId),
  };
});

export const insertReactionSchema = createInsertSchema(reactions).pick({
  userId: true,
  postId: true,
  reactionType: true,
  pinToPC: true,
  pinToMobile: true,
});

// Define post relations
export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  reactions: many(reactions),
}));

// Define reaction relations
export const reactionsRelations = relations(reactions, ({ one }) => ({
  user: one(users, {
    fields: [reactions.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [reactions.postId],
    references: [posts.id],
  }),
}));

// Private messages with end-to-end encryption
export const privateMessages = pgTable("private_messages", {
  id: serial("id").primaryKey(),
  // Sender user ID
  senderId: integer("sender_id").notNull().references(() => users.id),
  // Recipient user ID
  recipientId: integer("recipient_id").notNull().references(() => users.id),
  // Conversation ID (derived from sorted user IDs)
  conversationId: text("conversation_id").notNull(),
  // Message content (encrypted)
  encryptedContent: text("encrypted_content").notNull(),
  // Encryption details
  encryptionType: encryptionTypeEnum("encryption_type").notNull(),
  // Initialization vector used for encryption
  iv: text("iv").notNull(),
  // Optional ephemeral key (for hybrid encryption)
  ephemeralKey: text("ephemeral_key"),
  // Content CID if stored on IPFS (for large messages/attachments)
  contentCid: text("content_cid"),
  // Media content if included
  mediaCid: text("media_cid"),
  // Message status
  status: messageStatusEnum("status").notNull().default('sent'),
  // Signature for verification
  signature: text("signature").notNull(),
  // When message was sent
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  // When message was delivered
  deliveredAt: timestamp("delivered_at"),
  // When message was read
  readAt: timestamp("read_at"),
  // Message metadata
  metadata: jsonb("metadata"),
  // Indicates if message should be auto-deleted after read
  isEphemeral: boolean("is_ephemeral").default(false),
  // Indicates if message is a system message
  isSystemMessage: boolean("is_system_message").default(false),
});

export const insertPrivateMessageSchema = createInsertSchema(privateMessages).pick({
  senderId: true,
  recipientId: true,
  conversationId: true,
  encryptedContent: true,
  encryptionType: true,
  iv: true,
  ephemeralKey: true,
  contentCid: true,
  mediaCid: true,
  signature: true,
  metadata: true,
  isEphemeral: true,
  isSystemMessage: true,
});

// Conversations for organizing private messages
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  // Unique conversation identifier
  conversationId: text("conversation_id").notNull().unique(),
  // Is this a group conversation?
  isGroup: boolean("is_group").default(false),
  // Name (for group conversations)
  name: text("name"),
  // Last message timestamp
  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
  // Creation date
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Metadata
  metadata: jsonb("metadata"),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  conversationId: true,
  isGroup: true,
  name: true,
  metadata: true,
});

// Participants in conversations
export const conversationParticipants = pgTable("conversation_participants", {
  id: serial("id").primaryKey(),
  // Conversation ID
  conversationId: text("conversation_id").notNull().references(() => conversations.conversationId),
  // User ID
  userId: integer("user_id").notNull().references(() => users.id),
  // Has the user left the conversation?
  hasLeft: boolean("has_left").default(false),
  // Is admin (for group conversations)
  isAdmin: boolean("is_admin").default(false),
  // Last time the user read the conversation
  lastReadAt: timestamp("last_read_at"),
  // Joined at timestamp
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => {
  return {
    // Ensure unique participants per conversation
    uniqueParticipant: unique().on(table.conversationId, table.userId),
  };
});

export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants).pick({
  conversationId: true,
  userId: true,
  isAdmin: true,
});

// Relations for private messages
export const privateMessagesRelations = relations(privateMessages, ({ one }) => ({
  sender: one(users, {
    fields: [privateMessages.senderId],
    references: [users.id],
  }),
  recipient: one(users, {
    fields: [privateMessages.recipientId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [privateMessages.conversationId],
    references: [conversations.conversationId],
  }),
}));

// Relations for conversations
export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(privateMessages),
  participants: many(conversationParticipants),
}));

// Relations for conversation participants
export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  user: one(users, {
    fields: [conversationParticipants.userId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.conversationId],
  }),
}));

// Followers table to track user relationships
export const followers = pgTable("followers", {
  id: serial("id").primaryKey(),
  // The user who is following
  followerId: integer("follower_id").notNull().references(() => users.id),
  // The user being followed
  followeeId: integer("followee_id").notNull().references(() => users.id),
  // When the follow relationship was created
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    // Ensure unique follower-followee relationships
    uniqueFollow: unique().on(table.followerId, table.followeeId),
  };
});

export const insertFollowerSchema = createInsertSchema(followers).pick({
  followerId: true,
  followeeId: true,
});

// Update user relations to include messages and conversations
export const usersRelationsExtended = relations(users, ({ many }) => ({
  nodes: many(nodes),
  contents: many(contents),
  pins: many(pins),
  sentMessages: many(privateMessages, { relationName: "sentMessages" }),
  receivedMessages: many(privateMessages, { relationName: "receivedMessages" }),
  conversations: many(conversationParticipants),
  following: many(followers, { relationName: "following" }),
  followers: many(followers, { relationName: "followers" }),
}));

export const followersRelations = relations(followers, ({ one }) => ({
  follower: one(users, {
    fields: [followers.followerId],
    references: [users.id],
    relationName: "following",
  }),
  followee: one(users, {
    fields: [followers.followeeId],
    references: [users.id],
    relationName: "followers",
  }),
}));

export const websiteHostingRelations = relations(websiteHosting, ({ one }) => ({
  node: one(nodes, {
    fields: [websiteHosting.nodeId],
    references: [nodes.id],
  }),
}));

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Node = typeof nodes.$inferSelect;
export type InsertNode = z.infer<typeof insertNodeSchema>;

export type Content = typeof contents.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;

export type Pin = typeof pins.$inferSelect;
export type InsertPin = z.infer<typeof insertPinSchema>;

export type NodeConnection = typeof nodeConnections.$inferSelect;
export type InsertNodeConnection = z.infer<typeof insertNodeConnectionSchema>;

export type WebsiteHosting = typeof websiteHosting.$inferSelect;
export type InsertWebsiteHosting = z.infer<typeof insertWebsiteHostingSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type Reaction = typeof reactions.$inferSelect;
export type InsertReaction = z.infer<typeof insertReactionSchema>;

export type PrivateMessage = typeof privateMessages.$inferSelect;
export type InsertPrivateMessage = z.infer<typeof insertPrivateMessageSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type InsertConversationParticipant = z.infer<typeof insertConversationParticipantSchema>;

export type Follower = typeof followers.$inferSelect;
export type InsertFollower = z.infer<typeof insertFollowerSchema>;
