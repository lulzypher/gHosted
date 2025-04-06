import React from 'react';
import { Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';
import { usePeerDiscovery } from '@/contexts/PeerDiscoveryContext';

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

export function NetworkStatus() {
  const { connectionStatus, localPeers } = usePeerDiscovery();
  
  // Determine network status based on WebSocket connection
  let status: NetworkStatusEnum;
  switch (connectionStatus) {
    case 'ready':
      status = NetworkStatusEnum.CONNECTED;
      break;
    case 'initializing':
      status = NetworkStatusEnum.CONNECTING;
      break;
    case 'error':
    case 'disconnected':
      status = NetworkStatusEnum.DISCONNECTED;
      break;
    default:
      status = NetworkStatusEnum.OFFLINE;
  }

  // Count connected peers
  const connectedPeerCount = localPeers.filter(peer => peer.status === 'connected').length;
  
  // Render appropriate icon and text based on connection status
  const getStatusIcon = () => {
    switch (status) {
      case NetworkStatusEnum.CONNECTED:
        return <Wifi className="h-4 w-4 text-green-400" />;
      case NetworkStatusEnum.CONNECTING:
        return <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />;
      case NetworkStatusEnum.DISCONNECTED:
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case NetworkStatusEnum.OFFLINE:
        return <WifiOff className="h-4 w-4 text-[#b0b3b8]" />;
    }
  };
  
  const getStatusText = () => {
    switch (status) {
      case NetworkStatusEnum.CONNECTED:
        return connectedPeerCount > 0 
          ? `Connected (${connectedPeerCount} peer${connectedPeerCount > 1 ? 's' : ''})` 
          : 'Connected';
      case NetworkStatusEnum.CONNECTING:
        return 'Connecting...';
      case NetworkStatusEnum.DISCONNECTED:
        return 'Disconnected';
      case NetworkStatusEnum.OFFLINE:
        return 'Offline';
    }
  };
  
  const getStatusClass = () => {
    switch (status) {
      case NetworkStatusEnum.CONNECTED:
        return 'bg-green-900/20 text-green-400 border-green-900/30';
      case NetworkStatusEnum.CONNECTING:
        return 'bg-amber-900/20 text-amber-400 border-amber-900/30';
      case NetworkStatusEnum.DISCONNECTED:
        return 'bg-red-900/20 text-red-400 border-red-900/30';
      case NetworkStatusEnum.OFFLINE:
        return 'bg-[#3a3b3c] text-[#b0b3b8] border-[#4e4f50]';
    }
  };
  
  return (
    <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs border ${getStatusClass()}`}>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </div>
  );
}