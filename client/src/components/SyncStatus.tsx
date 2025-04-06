import React from 'react';
import { useSync } from '@/contexts/SyncContext';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export function SyncStatus() {
  const { syncStatus, triggerSync, isOnline, isOffline, isSyncing } = useSync();
  
  // Format last sync time 
  const lastSyncFormatted = syncStatus.lastSyncTime 
    ? formatDistanceToNow(new Date(syncStatus.lastSyncTime), { addSuffix: true })
    : 'never';
  
  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Online/Offline Status */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-amber-500" />
              )}
              <span className={isOnline ? "text-green-500" : "text-amber-500"}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isOnline 
                ? "You're connected to the network" 
                : "You're working offline. Changes will sync when you reconnect."}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Sync Status */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
              ) : syncStatus.hasErrors ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span 
                className={
                  isSyncing 
                    ? "text-blue-500" 
                    : syncStatus.hasErrors 
                      ? "text-red-500" 
                      : "text-green-500"
                }
              >
                {isSyncing 
                  ? "Syncing..." 
                  : syncStatus.hasErrors 
                    ? "Sync error" 
                    : `Synced ${lastSyncFormatted}`}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isSyncing ? (
              <p>Synchronizing your data with the network</p>
            ) : syncStatus.hasErrors ? (
              <div>
                <p>Failed to sync:</p>
                <ul className="list-disc pl-4 mt-1">
                  {syncStatus.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>Last synchronized {lastSyncFormatted}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Manual Sync Button */}
      {isOnline && !isSyncing && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6" 
          onClick={() => triggerSync()}
          disabled={isSyncing}
        >
          <RefreshCw className="h-3 w-3" />
          <span className="sr-only">Sync now</span>
        </Button>
      )}
    </div>
  );
}

// Simplified version for the mobile/sidebar view
export function SyncStatusCompact() {
  const { syncStatus, triggerSync, isOnline, isSyncing } = useSync();
  
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="flex items-center gap-2 h-8"
      onClick={() => triggerSync()}
      disabled={isSyncing || !isOnline}
    >
      {isOnline ? (
        isSyncing ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : syncStatus.hasErrors ? (
          <AlertCircle className="h-4 w-4 text-red-500" />
        ) : (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )
      ) : (
        <WifiOff className="h-4 w-4 text-amber-500" />
      )}
      <span className="text-xs">
        {isOnline ? (
          isSyncing ? (
            "Syncing..."
          ) : syncStatus.hasErrors ? (
            "Sync failed"
          ) : (
            "Synced"
          )
        ) : (
          "Offline"
        )}
      </span>
    </Button>
  );
}