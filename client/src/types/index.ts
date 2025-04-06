// Common types used throughout the application

export interface User {
  id: number;
  username: string;
  displayName: string;
  bio?: string;
  avatarCid?: string;
  did: string;
}

export interface Post {
  id: number;
  userId: number;
  content: string;
  imageCid?: string;
  contentCid: string;
  createdAt: string;
  user?: User; // To be populated from the user data
}

export interface Device {
  id: number;
  userId: number;
  deviceId: string;
  name: string;
  type: string; // "pc" or "mobile"
  lastSynced: string;
}

export interface PeerConnection {
  id: number;
  userId: number;
  peerId: string;
  lastSeen: string;
  status: string; // "online", "offline", "syncing"
  user?: User; // To be populated from the user data
}

export interface PinnedContent {
  id: number;
  userId: number;
  contentCid: string;
  pinType: PinType;
  postId?: number;
  pinnedAt: string;
  deviceId?: string;
  post?: Post; // To be populated from the post data
}

export enum PinType {
  LIKE = "like",
  LOVE = "love"
}

export enum NetworkStatus {
  ONLINE = "online",
  OFFLINE = "offline",
  CONNECTING = "connecting"
}

export enum SyncStatus {
  SYNCED = "synced",
  SYNCING = "syncing",
  ERROR = "error"
}

export interface IPFSPinnedContent {
  cid: string;
  type: string; // Can be "post", "image", etc.
  size: number;
  devices: string[]; // List of device IDs where content is pinned
}

export interface UserWithDevices extends User {
  devices: Device[];
}

export interface IPFSStats {
  pinnedCount: number;
  totalSize: number;
  allocatedSize: number;
}
