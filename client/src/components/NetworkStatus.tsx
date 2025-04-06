import React from 'react';
import { WifiIcon, WifiOff, Laptop, Database } from 'lucide-react';

export enum NetworkStatusEnum {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
  OFFLINE = 'offline'
}

interface NetworkStatusProps {
  status: NetworkStatusEnum;
  peerCount: number;
}

export function NetworkStatus({ status, peerCount }: NetworkStatusProps) {
  const getStatusDetails = () => {
    switch (status) {
      case NetworkStatusEnum.CONNECTED:
        return {
          icon: <WifiIcon className="h-4 w-4 text-green-500" />,
          text: `Connected to ${peerCount} peer${peerCount !== 1 ? 's' : ''}`,
          color: 'text-green-500 dark:text-green-400'
        };
      case NetworkStatusEnum.CONNECTING:
        return {
          icon: <WifiIcon className="h-4 w-4 text-amber-500 animate-pulse" />,
          text: 'Connecting to network...',
          color: 'text-amber-500 dark:text-amber-400'
        };
      case NetworkStatusEnum.DISCONNECTED:
        return {
          icon: <WifiOff className="h-4 w-4 text-red-500" />,
          text: 'Disconnected from network',
          color: 'text-red-500 dark:text-red-400'
        };
      case NetworkStatusEnum.OFFLINE:
        return {
          icon: <WifiOff className="h-4 w-4 text-muted-foreground" />,
          text: 'Operating in offline mode',
          color: 'text-muted-foreground'
        };
      default:
        return {
          icon: <WifiIcon className="h-4 w-4 text-muted-foreground" />,
          text: 'Unknown status',
          color: 'text-muted-foreground'
        };
    }
  };
  
  const statusDetails = getStatusDetails();
  
  return (
    <div className="bg-card dark:bg-card/90 rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/10">
        <h3 className="text-sm font-medium text-foreground">Network Status</h3>
        <div className="flex items-center space-x-1">
          <span className={`text-xs ${statusDetails.color}`}>{statusDetails.text}</span>
          {statusDetails.icon}
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm">
            <Laptop className="h-4 w-4 text-muted-foreground mr-2" />
            <span className="text-foreground">Local Node</span>
          </div>
          <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
            Running
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm">
            <Database className="h-4 w-4 text-muted-foreground mr-2" />
            <span className="text-foreground">IPFS Gateway</span>
          </div>
          <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
            Online
          </span>
        </div>
        
        <div className="pt-2 border-t border-border/10">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-muted-foreground">Network Latency</span>
            <span className="text-xs font-medium text-foreground">28ms</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-muted/50 dark:bg-muted/20 overflow-hidden">
            <div className="h-full bg-green-500" style={{ width: '25%' }}></div>
          </div>
        </div>
        
        <div className="pt-2 border-t border-border/10">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-muted-foreground">Bandwidth Usage</span>
            <span className="text-xs font-medium text-foreground">1.2 MB/s</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-muted/50 dark:bg-muted/20 overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}