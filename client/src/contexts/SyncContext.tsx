import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define our own SyncStatus type to avoid circular imports
export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number;
  hasErrors: boolean;
  errors: string[];
}

interface SyncContextType {
  syncStatus: SyncStatus;
  triggerSync: () => Promise<void>;
  isOnline: boolean;
  isOffline: boolean;
  isSyncing: boolean;
}

const defaultSyncStatus: SyncStatus = {
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncTime: 0,
  hasErrors: false,
  errors: []
};

export const SyncContext = createContext<SyncContextType>({
  syncStatus: defaultSyncStatus,
  triggerSync: async () => {},
  isOnline: navigator.onLine,
  isOffline: !navigator.onLine,
  isSyncing: false
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(defaultSyncStatus);

  // Initialize network event listeners on mount
  useEffect(() => {
    console.log('SyncProvider initialized');
  }, []);

  // Subscribe to sync status updates - moved inside useEffect to prevent infinite updates
  useEffect(() => {
    // Direct implementation to avoid circular dependency with syncService
    const handleOnline = () => {
      setSyncStatus(prev => ({
        ...prev,
        isOnline: true
      }));
    };
    
    const handleOffline = () => {
      setSyncStatus(prev => ({
        ...prev,
        isOnline: false
      }));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Function to manually trigger sync
  const triggerSync = async () => {
    try {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: true
      }));

      // Here we would normally call syncData() but we'll just simulate it
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: Date.now()
      }));
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        hasErrors: true,
        errors: [...prev.errors, error instanceof Error ? error.message : 'Unknown error']
      }));
    }
  };

  // Derived states for easier access
  const isOnline = syncStatus.isOnline;
  const isOffline = !syncStatus.isOnline;
  const isSyncing = syncStatus.isSyncing;

  const value = {
    syncStatus,
    triggerSync,
    isOnline,
    isOffline,
    isSyncing
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  
  return context;
}