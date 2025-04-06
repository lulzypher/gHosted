import React, { useState } from 'react';
import { usePeerDiscovery } from '@/contexts/PeerDiscoveryContext';
import { Smartphone, Laptop, Cloud, RefreshCw, AlertCircle, Loader2, Link as LinkIcon, Link2Off as LinkBroken, Clock, CircleCheck } from 'lucide-react';

export interface LocalPeer {
  id: string;
  displayName?: string;
  deviceType?: 'pc' | 'mobile' | 'server' | 'unknown';
  status: 'discovered' | 'connecting' | 'connected' | 'disconnected';
  lastSeen: Date;
}

export function LocalPeers() {
  const { 
    localPeers, 
    isDiscovering, 
    startDiscovery, 
    connectToPeer, 
    disconnectFromPeer 
  } = usePeerDiscovery();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    startDiscovery();
    
    // Reset refreshing status after a timeout
    setTimeout(() => {
      setIsRefreshing(false);
    }, 3000);
  };
  
  const formatLastSeen = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  const getStatusBadge = (peer: LocalPeer) => {
    switch (peer.status) {
      case 'connected':
        return (
          <div className="px-2 py-0.5 rounded-full text-xs bg-green-900/30 text-green-400 border border-green-900/50">
            <div className="flex items-center space-x-1">
              <CircleCheck className="h-3 w-3" />
              <span>Connected</span>
            </div>
          </div>
        );
      case 'connecting':
        return (
          <div className="px-2 py-0.5 rounded-full text-xs bg-amber-900/30 text-amber-400 border border-amber-900/50">
            <div className="flex items-center space-x-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Connecting</span>
            </div>
          </div>
        );
      case 'disconnected':
        return (
          <div className="px-2 py-0.5 rounded-full text-xs bg-red-900/30 text-red-400 border border-red-900/50">
            <div className="flex items-center space-x-1">
              <AlertCircle className="h-3 w-3" />
              <span>Disconnected</span>
            </div>
          </div>
        );
      default:
        return (
          <div className="px-2 py-0.5 rounded-full text-xs bg-[#3a3b3c] text-[#b0b3b8] border border-[#4e4f50]">
            <div className="flex items-center space-x-1">
              <span>Discovered</span>
            </div>
          </div>
        );
    }
  };
  
  const getDeviceIcon = (peer: LocalPeer) => {
    switch (peer.deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5 text-[#b0b3b8]" />;
      case 'pc':
        return <Laptop className="h-5 w-5 text-[#b0b3b8]" />;
      case 'server':
        return <Cloud className="h-5 w-5 text-[#b0b3b8]" />;
      default:
        return <Laptop className="h-5 w-5 text-[#b0b3b8]" />;
    }
  };
  
  const getConnectionButton = (peer: LocalPeer) => {
    switch (peer.status) {
      case 'connected':
        return (
          <button
            onClick={() => disconnectFromPeer(peer.id)}
            className="p-1.5 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded border border-red-900/30"
            title="Disconnect"
          >
            <LinkBroken className="h-4 w-4" />
          </button>
        );
      case 'connecting':
        return (
          <button
            disabled
            className="p-1.5 bg-[#3a3b3c] text-[#b0b3b8] rounded border border-[#4e4f50] opacity-50 cursor-not-allowed"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
          </button>
        );
      default:
        return (
          <button
            onClick={async () => {
              await connectToPeer(peer.id);
            }}
            className="p-1.5 bg-[#3499f0]/10 hover:bg-[#3499f0]/20 text-[#3499f0] rounded border border-[#3499f0]/20"
            title="Connect"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
        );
    }
  };
  
  return (
    <div className="p-4 bg-[#242526] rounded-lg border border-[#3a3b3c]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#e4e6eb] font-medium">Nearby Devices</h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isDiscovering}
          className="p-1.5 text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#3a3b3c] rounded-full disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing || isDiscovering ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {isDiscovering && !isRefreshing && (
        <div className="flex items-center justify-center py-4">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-[#3499f0] animate-spin mb-2" />
            <p className="text-sm text-[#b0b3b8]">Scanning for nearby peers...</p>
          </div>
        </div>
      )}
      
      {localPeers.length === 0 && !isDiscovering && (
        <div className="text-center py-6 text-[#b0b3b8]">
          <div className="flex flex-col items-center">
            <AlertCircle className="h-10 w-10 text-[#b0b3b8] mb-2 opacity-50" />
            <p className="mb-2">No devices found nearby</p>
            <button
              onClick={handleRefresh}
              className="text-sm text-[#3499f0] hover:text-[#3499f0]/80 flex items-center"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Scan again
            </button>
          </div>
        </div>
      )}
      
      {localPeers.length > 0 && (
        <div className="space-y-3">
          {localPeers.map((peer) => (
            <div 
              key={peer.id} 
              className="flex items-center justify-between p-3 bg-[#18191a] rounded border border-[#3a3b3c]"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getDeviceIcon(peer)}
                </div>
                <div>
                  <div className="font-medium text-[#e4e6eb]">
                    {peer.displayName || peer.id.substring(0, 8)}
                  </div>
                  <div className="flex items-center text-xs text-[#b0b3b8] space-x-2">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1 opacity-70" />
                      <span>{formatLastSeen(peer.lastSeen)}</span>
                    </div>
                    {getStatusBadge(peer)}
                  </div>
                </div>
              </div>
              <div>
                {getConnectionButton(peer)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}