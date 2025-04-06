import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SyncStatus, useSyncStatus, syncData, initializeSyncService } from '@/lib/syncService';

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

  // Initialize sync service on mount
  useEffect(() => {
    initializeSyncService().catch(err => 
      console.error('Failed to initialize sync service:', err)
    );
  }, []);

  // Subscribe to sync status updates
  useSyncStatus((status) => {
    setSyncStatus(status);
  });

  // Function to manually trigger sync
  const triggerSync = async () => {
    await syncData();
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