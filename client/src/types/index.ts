// Network status enumeration
export enum NetworkStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  CONNECTING = 'connecting'
}

// Sync status enumeration
export enum SyncStatus {
  SYNCED = 'synced',
  SYNCING = 'syncing',
  ERROR = 'error'
}

// Pin type enumeration
export enum PinType {
  LOCAL = 'local',    // Pin to local device only (Heart reaction)
  REMOTE = 'remote',  // Pin to remote devices as well (Fire Heart reaction)
  ALL = 'all'         // Matches either type for querying purposes
}

// Device type enumeration
export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  OTHER = 'other'
}

// Peer connection status
export enum PeerConnectionStatus {
  PENDING = 'pending',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  FAILED = 'failed'
}

// IPFS statistics interface
export interface IPFSStats {
  repoSize: number;
  numObjects: number;
  storageMax: number;
  peersConnected: number;
  totalSize?: number; // Added for compatibility with existing code
  pinnedCount?: number; // Count of pinned contents
  numPins?: number; // Number of pinned items (alias for pinnedCount)
  allocatedSize?: number; // Total allocated storage size
}

// User interface
export interface User {
  id: number;
  username: string;
  displayName: string;
  bio?: string;
  did: string;
  publicKey: string;
  avatarUrl?: string;
  avatarCid?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Post interface
export interface Post {
  id: number;
  userId: number;
  contentCid: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

// Pinned Content interface
export interface PinnedContent {
  id: number;
  userId: number;
  contentCid: string;
  postId: number;
  pinType: PinType;
  deviceId?: number;
  pinnedAt: Date;
}

// Peer connection interface
export interface PeerConnection {
  id: number;
  userId: number;
  peerId: string;
  status: PeerConnectionStatus;
  lastSeen: Date;
  deviceId?: number;
  createdAt: Date;
  updatedAt: Date;
}