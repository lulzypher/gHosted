import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarCid: text("avatar_cid"),
  did: text("did").notNull().unique(),
  publicKey: text("public_key").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  bio: true,
  avatarCid: true,
  did: true,
  publicKey: true,
});

// Post schema
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  imageCid: text("image_cid"),
  contentCid: text("content_cid").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPostSchema = createInsertSchema(posts).pick({
  userId: true,
  content: true,
  imageCid: true,
  contentCid: true,
});

// Peer connection schema
export const peerConnections = pgTable("peer_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  peerId: text("peer_id").notNull(),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  status: text("status").notNull(),
});

export const insertPeerConnectionSchema = createInsertSchema(peerConnections).pick({
  userId: true,
  peerId: true,
  status: true,
});

// Device schema
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  deviceId: text("device_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  lastSynced: timestamp("last_synced").notNull().defaultNow(),
});

export const insertDeviceSchema = createInsertSchema(devices).pick({
  userId: true,
  deviceId: true,
  name: true,
  type: true,
});

// PinnedContent schema
export const pinnedContents = pgTable("pinned_contents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  contentCid: text("content_cid").notNull(),
  pinType: text("pin_type").notNull(), // "like" or "love"
  postId: integer("post_id").references(() => posts.id),
  pinnedAt: timestamp("pinned_at").notNull().defaultNow(),
  deviceId: text("device_id"), // If pinned on a specific device
});

export const insertPinnedContentSchema = createInsertSchema(pinnedContents).pick({
  userId: true,
  contentCid: true,
  pinType: true,
  postId: true,
  deviceId: true,
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  devices: many(devices),
  pinnedContents: many(pinnedContents),
  peerConnections: many(peerConnections),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  pinnedContents: many(pinnedContents),
}));

export const peerConnectionsRelations = relations(peerConnections, ({ one }) => ({
  user: one(users, {
    fields: [peerConnections.userId],
    references: [users.id],
  }),
}));

export const devicesRelations = relations(devices, ({ one }) => ({
  user: one(users, {
    fields: [devices.userId],
    references: [users.id],
  }),
}));

export const pinnedContentsRelations = relations(pinnedContents, ({ one }) => ({
  user: one(users, {
    fields: [pinnedContents.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [pinnedContents.postId],
    references: [posts.id],
  }),
}));

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type PeerConnection = typeof peerConnections.$inferSelect;
export type InsertPeerConnection = z.infer<typeof insertPeerConnectionSchema>;

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

export type PinnedContent = typeof pinnedContents.$inferSelect;
export type InsertPinnedContent = z.infer<typeof insertPinnedContentSchema>;
