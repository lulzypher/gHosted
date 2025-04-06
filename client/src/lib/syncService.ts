import { 
  getUnsyncedPosts, 
  saveRemotePosts, 
  updateLastSuccessfulSync, 
  updateNetworkStatus,
  getDeviceId,
  getSyncInfo
} from './localStore';
import { PostType } from '@/components/Post';
import { apiRequest } from './queryClient';
import { usePeerDiscovery } from '@/contexts/PeerDiscoveryContext';
import React from 'react';

// Singleton for sync state
export class SyncManager {
  private static instance: SyncManager;
  private isSyncing: boolean = false;
  private networkListenerInitialized: boolean = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private onlineStatus: boolean = navigator.onLine;
  private syncListeners: Array<(status: SyncStatus) => void> = [];
  private syncErrors: string[] = [];
  private lastSyncTime: number = 0;
  private deviceId: string = 'unknown';
  private p2pSyncEnabled: boolean = true;
  
  // Private constructor for singleton
  private constructor() {
    // Initialize network listeners
    this.initNetworkListeners();
    
    // Initialize device ID
    this.initDeviceId();
  }
  
  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }
  
  private async initDeviceId(): Promise<void> {
    this.deviceId = await getDeviceId();
  }
  
  private initNetworkListeners(): void {
    if (this.networkListenerInitialized) return;
    
    // Listen for network status changes
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Initialize sync interval when online
    if (navigator.onLine) {
      this.startSyncInterval();
    }
    
    this.networkListenerInitialized = true;
  }
  
  private handleOnline = async (): Promise<void> => {
    console.log('Network is online');
    this.onlineStatus = true;
    await updateNetworkStatus(true);
    
    // Notify listeners
    this.notifyListeners({
      isOnline: true,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      hasErrors: this.syncErrors.length > 0,
      errors: this.syncErrors
    });
    
    // Start sync interval
    this.startSyncInterval();
    
    // Trigger immediate sync
    this.syncData();
  };
  
  private handleOffline = async (): Promise<void> => {
    console.log('Network is offline');
    this.onlineStatus = false;
    await updateNetworkStatus(false);
    
    // Stop sync interval
    this.stopSyncInterval();
    
    // Notify listeners
    this.notifyListeners({
      isOnline: false,
      isSyncing: false,
      lastSyncTime: this.lastSyncTime,
      hasErrors: false,
      errors: []
    });
  };
  
  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      this.syncData();
    }, 30000);
  }
  
  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  // Main synchronization method
  public async syncData(): Promise<void> {
    // Skip if already syncing or offline
    if (this.isSyncing || !this.onlineStatus) return;
    
    this.isSyncing = true;
    this.syncErrors = [];
    
    this.notifyListeners({
      isOnline: this.onlineStatus,
      isSyncing: true,
      lastSyncTime: this.lastSyncTime,
      hasErrors: false,
      errors: []
    });
    
    try {
      // 1. Send local changes to server
      await this.pushLocalChanges();
      
      // 2. Get updates from server
      await this.pullRemoteChanges();
      
      // 3. Sync with peers if enabled
      if (this.p2pSyncEnabled) {
        await this.syncWithPeers();
      }
      
      // Update sync time
      this.lastSyncTime = Date.now();
      await updateLastSuccessfulSync();
    } catch (error) {
      console.error('Sync error:', error);
      this.syncErrors.push(error instanceof Error ? error.message : 'Unknown sync error');
    } finally {
      this.isSyncing = false;
      
      this.notifyListeners({
        isOnline: this.onlineStatus,
        isSyncing: false,
        lastSyncTime: this.lastSyncTime,
        hasErrors: this.syncErrors.length > 0,
        errors: this.syncErrors
      });
    }
  }
  
  // Push local unsynced changes to server
  private async pushLocalChanges(): Promise<void> {
    // Get unsynced posts
    const unsyncedPosts = await getUnsyncedPosts();
    
    if (unsyncedPosts.length === 0) return;
    
    console.log(`Pushing ${unsyncedPosts.length} local changes to server`);
    
    // Group by action type (create/update/delete)
    const postsToCreate = unsyncedPosts.filter(post => post.cid.startsWith('local-'));
    const postsToUpdate = unsyncedPosts.filter(post => !post.cid.startsWith('local-') && !post.deleted);
    const postsToDelete = unsyncedPosts.filter(post => post.deleted);
    
    // Process creates
    if (postsToCreate.length > 0) {
      try {
        for (const post of postsToCreate) {
          // Server would assign real ID and CID
          const { id, authorId, authorName, authorUsername, content, mediaUrl } = post;
          
          await apiRequest('POST', '/api/posts', {
            authorId, 
            authorName,
            authorUsername,
            content,
            mediaUrl,
            deviceId: this.deviceId
          });
        }
      } catch (error) {
        console.error('Error creating posts:', error);
        throw new Error('Failed to create posts on server');
      }
    }
    
    // Process updates
    if (postsToUpdate.length > 0) {
      try {
        for (const post of postsToUpdate) {
          await apiRequest('PUT', `/api/posts/${post.id}`, {
            content: post.content,
            deviceId: this.deviceId
          });
        }
      } catch (error) {
        console.error('Error updating posts:', error);
        throw new Error('Failed to update posts on server');
      }
    }
    
    // Process deletes
    if (postsToDelete.length > 0) {
      try {
        for (const post of postsToDelete) {
          await apiRequest('DELETE', `/api/posts/${post.id}`, {
            deviceId: this.deviceId
          });
        }
      } catch (error) {
        console.error('Error deleting posts:', error);
        throw new Error('Failed to delete posts on server');
      }
    }
  }
  
  // Pull changes from server
  private async pullRemoteChanges(): Promise<void> {
    try {
      // Get sync info for last sync time
      const syncInfo = await getSyncInfo();
      
      // Get posts updated since last sync
      const response = await apiRequest('GET', `/api/posts?since=${syncInfo.lastSuccessfulSync}`);
      const posts = await response.json();
      
      if (posts.length > 0) {
        console.log(`Got ${posts.length} posts from server`);
        await saveRemotePosts(posts);
      }
    } catch (error) {
      console.error('Error pulling remote changes:', error);
      throw new Error('Failed to get updates from server');
    }
  }
  
  // Sync with connected peers
  private async syncWithPeers(): Promise<void> {
    // This would use the usePeerDiscovery context
    // Since we can't use hooks directly here, this would be triggered from components
    // that have access to the peer discovery context
    console.log('Peer sync would happen here');
  }
  
  // Register a listener for sync status updates
  public addSyncListener(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    
    // Call immediately with current status
    listener({
      isOnline: this.onlineStatus,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      hasErrors: this.syncErrors.length > 0,
      errors: this.syncErrors
    });
    
    // Return a function to remove this listener
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }
  
  // Notify all listeners of sync status changes
  private notifyListeners(status: SyncStatus): void {
    this.syncListeners.forEach(listener => listener(status));
  }
  
  // Enable/disable P2P sync
  public setP2PSyncEnabled(enabled: boolean): void {
    this.p2pSyncEnabled = enabled;
  }
  
  // Get current sync status
  public getSyncStatus(): SyncStatus {
    return {
      isOnline: this.onlineStatus,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      hasErrors: this.syncErrors.length > 0,
      errors: this.syncErrors
    };
  }
  
  // Clean up when no longer needed
  public destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncListeners = [];
  }
}

// Status interface for sync events
export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number;
  hasErrors: boolean;
  errors: string[];
}

// Helper functions for components to interact with the sync service

// Function to sync data explicitly
export function syncData(): Promise<void> {
  return SyncManager.getInstance().syncData();
}

// Hook for components to use sync status
export function useSyncStatus(callback: (status: SyncStatus) => void): void {
  React.useEffect(() => {
    // Register listener and get cleanup function
    const unregister = SyncManager.getInstance().addSyncListener(callback);
    
    // Return cleanup function
    return unregister;
  }, [callback]);
}

// Initialize the sync service
export async function initializeSyncService(): Promise<void> {
  // Just get the instance to ensure it's initialized
  SyncManager.getInstance();
}

// Singleton might need to be accessed in special cases
export function getSyncManager(): SyncManager {
  return SyncManager.getInstance();
}