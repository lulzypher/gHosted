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
  LOCAL = 'local',    // Pin to local device only (Heart reaction ❤️)
  LIKE = 'like',      // Alias for LOCAL - used for consistency with UI
  REMOTE = 'remote',  // Pin to remote devices as well (Fire Heart reaction ❤️‍🔥)
  LOVE = 'love',      // The love-heart-fire reaction (alias for REMOTE)
  LIGHT = 'light',    // Light pin for metadata only, not media content (📌)
  ALL = 'all'         // Matches any type for querying purposes
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
  usedSize?: number; // Used storage size for direct IPFS
  isConnected?: boolean; // Whether connected to IPFS network
  lastSync?: Date | null; // Last time content was synced
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
  // Associated post data that may be populated from the server or client
  post?: {
    content?: string;
    imageCid?: string;
    title?: string;
    metadata?: Record<string, any>;
    createdAt?: Date;
  };
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