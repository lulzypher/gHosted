import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { PostType } from '@/components/Post';
import { v4 as uuidv4 } from 'uuid';

// Define our database schema
interface GhostDBSchema extends DBSchema {
  posts: {
    key: string;
    value: PostType & {
      localId?: string;
      synced: boolean;
      modified: boolean;
      deleted: boolean;
      lastModified: number;
      localCreatedAt?: string;
    };
    indexes: {
      'by-cid': string;
      'by-authorId': number;
      'by-synced': boolean;
      'by-modified': boolean;
      'by-deleted': boolean;
    };
  };
  syncLog: {
    key: string;
    value: {
      id: string;
      entityType: 'post' | 'profile' | 'pin';
      entityId: string | number;
      action: 'create' | 'update' | 'delete';
      timestamp: number;
      conflictResolved?: boolean;
      serverTimestamp?: number;
      data?: any;
    };
    indexes: {
      'by-timestamp': number;
      'by-entityType': string;
      'by-action': string;
      'by-resolved': boolean;
    };
  };
  userProfile: {
    key: number;
    value: {
      id: number;
      username: string;
      displayName: string;
      bio?: string;
      avatarCid?: string;
      publicKey?: string;
      lastSynced: number;
      modified: boolean;
    };
  };
  meta: {
    key: string;
    value: {
      lastSyncAttempt: number;
      lastSuccessfulSync: number;
      deviceId: string;
      networkStatus: 'online' | 'offline';
    };
  };
}

let db: IDBPDatabase<GhostDBSchema> | null = null;

export async function initializeLocalStore(): Promise<IDBPDatabase<GhostDBSchema>> {
  if (db) return db;
  
  db = await openDB<GhostDBSchema>('ghosted-local', 1, {
    upgrade(db) {
      // Create posts store with indexes
      const postStore = db.createObjectStore('posts', { keyPath: 'cid' });
      postStore.createIndex('by-cid', 'cid');
      postStore.createIndex('by-authorId', 'authorId');
      postStore.createIndex('by-synced', 'synced');
      postStore.createIndex('by-modified', 'modified');
      postStore.createIndex('by-deleted', 'deleted');

      // Create sync log store
      const syncLogStore = db.createObjectStore('syncLog', { keyPath: 'id' });
      syncLogStore.createIndex('by-timestamp', 'timestamp');
      syncLogStore.createIndex('by-entityType', 'entityType');
      syncLogStore.createIndex('by-action', 'action');
      syncLogStore.createIndex('by-resolved', 'conflictResolved');

      // Create user profile store
      db.createObjectStore('userProfile', { keyPath: 'id' });

      // Create meta store for sync info
      const metaStore = db.createObjectStore('meta', { keyPath: 'key' });
      
      // Initialize meta with default values
      const deviceId = localStorage.getItem('deviceId') || uuidv4();
      localStorage.setItem('deviceId', deviceId);
      
      metaStore.put({
        key: 'syncInfo',
        lastSyncAttempt: 0,
        lastSuccessfulSync: 0,
        deviceId,
        networkStatus: navigator.onLine ? 'online' : 'offline'
      });
    }
  });
  
  return db;
}

// Add a local post that will be synced when online
export async function addLocalPost(post: Omit<PostType, 'id' | 'cid' | 'createdAt'>): Promise<PostType> {
  const database = await initializeLocalStore();
  
  // Generate a local ID and placeholder CID
  const localId = uuidv4();
  const tempCid = `local-${localId}`;
  const now = new Date().toISOString();
  
  const newPost: PostType & {
    synced: boolean;
    modified: boolean;
    deleted: boolean;
    lastModified: number;
    localId: string;
    localCreatedAt: string;
  } = {
    ...post as PostType,
    id: 0, // Will be assigned by server
    cid: tempCid,
    createdAt: now,
    localId,
    localCreatedAt: now,
    synced: false,
    modified: true,
    deleted: false,
    lastModified: Date.now(),
  };
  
  await database.put('posts', newPost);
  
  // Add to sync log
  await database.add('syncLog', {
    id: uuidv4(),
    entityType: 'post',
    entityId: tempCid,
    action: 'create',
    timestamp: Date.now(),
    conflictResolved: false,
    data: newPost
  });
  
  return newPost;
}

// Get all posts, including local unsynced ones
export async function getAllPosts(includeDeleted: boolean = false): Promise<PostType[]> {
  const database = await initializeLocalStore();
  
  const posts = await database.getAll('posts');
  
  // Filter posts based on the includeDeleted parameter
  return posts
    .filter(post => includeDeleted || !post.deleted)
    .sort((a, b) => {
      const dateA = new Date(b.localCreatedAt || b.createdAt);
      const dateB = new Date(a.localCreatedAt || a.createdAt);
      return dateA.getTime() - dateB.getTime();
    });
}

// Get only unsynchronized posts for syncing
export async function getUnsyncedPosts(): Promise<PostType[]> {
  const database = await initializeLocalStore();
  
  const posts = await database.getAllFromIndex('posts', 'by-synced', false);
  
  return posts;
}

// Save posts from server or peers
export async function saveRemotePosts(posts: PostType[]): Promise<void> {
  const database = await initializeLocalStore();
  
  const tx = database.transaction('posts', 'readwrite');
  
  // Get existing posts first to check for conflicts
  const existingPostsPromises = posts.map(post => 
    tx.store.get(post.cid).then(existingPost => ({ post, existingPost }))
  );
  
  const results = await Promise.all(existingPostsPromises);
  
  // Handle each post individually
  for (const { post, existingPost } of results) {
    if (!existingPost) {
      // New post from remote, just add it
      await tx.store.add({
        ...post,
        synced: true,
        modified: false,
        deleted: false,
        lastModified: Date.now()
      });
    } else if (existingPost.modified) {
      // Potential conflict - local modifications exist
      // In a real app, we'd need more sophisticated conflict resolution
      // For now, we'll keep both versions and mark them for manual resolution
      await handlePostConflict(existingPost, post);
    } else {
      // Update the existing post with server data
      await tx.store.put({
        ...post,
        synced: true,
        modified: false,
        deleted: false,
        lastModified: Date.now()
      });
    }
  }
  
  await tx.done;
}

// Handle conflicts between local and remote versions
async function handlePostConflict(localPost: any, remotePost: PostType): Promise<void> {
  const database = await initializeLocalStore();
  
  // Log the conflict for later resolution
  await database.add('syncLog', {
    id: uuidv4(),
    entityType: 'post',
    entityId: remotePost.cid,
    action: 'conflict',
    timestamp: Date.now(),
    conflictResolved: false,
    data: {
      local: localPost,
      remote: remotePost
    }
  });
  
  // In a real app, you might:
  // 1. Create a copy of the remote version
  // 2. Present both to the user for manual resolution
  // 3. Implement automatic merging strategies
  
  // For now, let's keep the local version but mark it for attention
  await database.put('posts', {
    ...localPost,
    hasConflict: true, // Add a flag to show conflict UI later
    remoteVersion: remotePost // Store the remote version
  });
}

// Mark a post as deleted locally (will be synced when online)
export async function deleteLocalPost(cid: string): Promise<void> {
  const database = await initializeLocalStore();
  
  const post = await database.get('posts', cid);
  
  if (!post) return;
  
  await database.put('posts', {
    ...post,
    deleted: true,
    modified: true,
    synced: false,
    lastModified: Date.now()
  });
  
  // Add to sync log
  await database.add('syncLog', {
    id: uuidv4(),
    entityType: 'post',
    entityId: cid,
    action: 'delete',
    timestamp: Date.now(),
    conflictResolved: false
  });
}

// Update network status
export async function updateNetworkStatus(isOnline: boolean): Promise<void> {
  const database = await initializeLocalStore();
  
  const meta = await database.get('meta', 'syncInfo');
  
  if (meta) {
    await database.put('meta', {
      ...meta,
      networkStatus: isOnline ? 'online' : 'offline',
      lastSyncAttempt: isOnline ? Date.now() : meta.lastSyncAttempt
    });
  }
}

// Get current device ID
export async function getDeviceId(): Promise<string> {
  const database = await initializeLocalStore();
  
  const meta = await database.get('meta', 'syncInfo');
  
  return meta?.deviceId || 'unknown';
}

// Update last successful sync time
export async function updateLastSuccessfulSync(): Promise<void> {
  const database = await initializeLocalStore();
  
  const meta = await database.get('meta', 'syncInfo');
  
  if (meta) {
    await database.put('meta', {
      ...meta,
      lastSuccessfulSync: Date.now()
    });
  }
}

// Get sync info
export async function getSyncInfo(): Promise<{
  lastSyncAttempt: number;
  lastSuccessfulSync: number;
  deviceId: string;
  networkStatus: 'online' | 'offline';
}> {
  const database = await initializeLocalStore();
  
  const meta = await database.get('meta', 'syncInfo');
  
  if (!meta) {
    return {
      lastSyncAttempt: 0,
      lastSuccessfulSync: 0,
      deviceId: 'unknown',
      networkStatus: navigator.onLine ? 'online' : 'offline'
    };
  }
  
  return meta;
}

// Get all unresolved conflicts
export async function getUnresolvedConflicts(): Promise<any[]> {
  const database = await initializeLocalStore();
  
  const conflicts = await database.getAllFromIndex('syncLog', 'by-resolved', false);
  
  return conflicts.filter(log => log.action === 'conflict');
}

// Resolve a conflict
export async function resolveConflict(
  conflictId: string, 
  resolution: 'local' | 'remote' | 'merged', 
  mergedData?: any
): Promise<void> {
  const database = await initializeLocalStore();
  
  const conflict = await database.get('syncLog', conflictId);
  
  if (!conflict) return;
  
  const tx = database.transaction(['syncLog', 'posts'], 'readwrite');
  
  // Mark as resolved in the log
  await tx.objectStore('syncLog').put({
    ...conflict,
    conflictResolved: true,
    resolution
  });
  
  if (conflict.entityType === 'post') {
    const post = await tx.objectStore('posts').get(conflict.data.remote.cid);
    
    if (post) {
      let resolvedPost;
      
      if (resolution === 'local') {
        // Keep local version
        resolvedPost = {
          ...post,
          hasConflict: false,
          remoteVersion: undefined,
          synced: false,
          modified: true
        };
      } else if (resolution === 'remote') {
        // Use remote version
        resolvedPost = {
          ...conflict.data.remote,
          hasConflict: false,
          remoteVersion: undefined,
          synced: true,
          modified: false,
          deleted: false,
          lastModified: Date.now()
        };
      } else if (resolution === 'merged' && mergedData) {
        // Use merged data
        resolvedPost = {
          ...mergedData,
          hasConflict: false,
          remoteVersion: undefined,
          synced: false,
          modified: true,
          lastModified: Date.now()
        };
      }
      
      if (resolvedPost) {
        await tx.objectStore('posts').put(resolvedPost);
      }
    }
  }
  
  await tx.done;
}

// Create a class to handle all local store operations
class LocalStore {
  private db: Promise<IDBPDatabase<GhostDBSchema>>;
  
  constructor() {
    // Initialize the database connection
    this.db = initializeLocalStore();
  }
  
  // Add methods as needed by other components
  
  // Get the database instance
  async getDB() {
    return await this.db;
  }
  
  // Method to check if the store is ready
  async isReady() {
    try {
      await this.db;
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Save media content locally and return a local URL
export async function saveMediaContent(blob: Blob): Promise<{ cid: string, localUrl: string }> {
  const database = await initializeLocalStore();
  
  // Generate a local ID for the media
  const localId = uuidv4();
  const tempCid = `local-media-${localId}`;
  
  // Convert blob to base64 for storage
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
  
  // Create a store for media if it doesn't exist
  if (!database.objectStoreNames.contains('media')) {
    // Close the database and upgrade it
    database.close();
    const upgradedDb = await openDB<GhostDBSchema & { 
      media: { 
        key: string; 
        value: { 
          cid: string; 
          data: string; 
          mimeType: string; 
          size: number;
          created: number;
          synced: boolean;
        }; 
      } 
    }>('ghosted-local', database.version + 1, {
      upgrade(db) {
        // Create media store
        db.createObjectStore('media', { keyPath: 'cid' });
      }
    });
    
    // Store the media
    await upgradedDb.put('media', {
      cid: tempCid,
      data: base64,
      mimeType: blob.type,
      size: blob.size,
      created: Date.now(),
      synced: false
    });
    
    // Return the new db
    return {
      cid: tempCid,
      localUrl: base64
    };
  }
  
  // If the store exists, use it directly
  const mediaStore = database.transaction('media', 'readwrite').objectStore('media');
  await mediaStore.put({
    cid: tempCid,
    data: base64,
    mimeType: blob.type,
    size: blob.size,
    created: Date.now(),
    synced: false
  });
  
  return {
    cid: tempCid,
    localUrl: base64
  };
}

// Export a singleton instance
export const localStore = new LocalStore();