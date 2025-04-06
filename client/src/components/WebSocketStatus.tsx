import React, { useState, useEffect } from 'react';
import { usePeerDiscovery } from '@/contexts/PeerDiscoveryContext';
import { RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';

interface WebSocketStatusProps {
  showReconnect?: boolean;
}

export function WebSocketStatus({ showReconnect = true }: WebSocketStatusProps) {
  const { connectionStatus, startDiscovery } = usePeerDiscovery();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Update the last updated timestamp when connection status changes
  useEffect(() => {
    setLastUpdated(new Date());
  }, [connectionStatus]);
  
  const handleReconnect = () => {
    setIsReconnecting(true);
    // Attempt to restart discovery process
    startDiscovery();
    // For development, simulate reconnection
    setTimeout(() => {
      setIsReconnecting(false);
    }, 2000);
  };
  
  const formatLastUpdated = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  let statusText = '';
  let statusColor = '';
  let statusIcon = null;
  
  switch (connectionStatus) {
    case 'ready':
      statusText = 'Connected';
      statusColor = 'text-green-400';
      statusIcon = <Wifi className="h-4 w-4" />;
      break;
    case 'initializing':
      statusText = 'Connecting';
      statusColor = 'text-amber-400';
      statusIcon = <RefreshCw className="h-4 w-4 animate-spin" />;
      break;
    case 'error':
      statusText = 'Connection Error';
      statusColor = 'text-red-400';
      statusIcon = <WifiOff className="h-4 w-4" />;
      break;
    case 'disconnected':
      statusText = 'Disconnected';
      statusColor = 'text-red-400';
      statusIcon = <WifiOff className="h-4 w-4" />;
      break;
    default:
      statusText = 'Offline';
      statusColor = 'text-[#b0b3b8]';
      statusIcon = <WifiOff className="h-4 w-4" />;
  }
  
  return (
    <div className="p-3 bg-[#242526] rounded-lg border border-[#3a3b3c]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className={`${statusColor}`}>
            {statusIcon}
          </span>
          <span className="text-sm font-medium text-[#e4e6eb]">WebSocket Status</span>
        </div>
        <div className="flex items-center text-xs text-[#b0b3b8]">
          <Clock className="h-3.5 w-3.5 mr-1" />
          Updated at {formatLastUpdated(lastUpdated)}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className={`text-sm ${statusColor}`}>{statusText}</span>
        </div>
        
        {showReconnect && (connectionStatus === 'error' || connectionStatus === 'disconnected') && (
          <button 
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="text-xs flex items-center px-2 py-1 rounded bg-[#3499f0] text-white hover:bg-[#3499f0]/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isReconnecting ? 'animate-spin' : ''}`} />
            {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
          </button>
        )}
      </div>
    </div>
  );
}