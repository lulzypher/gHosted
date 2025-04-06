import React, { useEffect } from 'react';
import { Header } from '@/components/Header';
import { LeftSidebar } from '@/components/LeftSidebar';
import { CreatePostWithOffline } from '@/components/CreatePostWithOffline';
import { PostType } from '@/components/Post';
import { NetworkStatus } from '@/components/NetworkStatus';
import { WebSocketStatus } from '@/components/WebSocketStatus';
import { LocalPeers } from '@/components/LocalPeers';
import { DevicePairing } from '@/components/DevicePairing';
import { SyncStatus, SyncStatusCompact } from '@/components/SyncStatus';
import { ContentFeed } from '@/components/ContentFeed';
import { usePeerDiscovery } from '@/contexts/PeerDiscoveryContext';
import { useSync } from '@/contexts/SyncContext';

export default function HomePage() {
  const { startDiscovery, connectionStatus, localPeers } = usePeerDiscovery();
  
  // Start peer discovery when the component mounts
  useEffect(() => {
    // Automatically start discovery when the component mounts if the connection is ready
    if (connectionStatus === 'ready') {
      startDiscovery();
    }
  }, [connectionStatus, startDiscovery]);
  
  // We'll use the ContentFeed component which handles posts with offline capabilities

  return (
    <div className="h-screen flex flex-col bg-[#18191a] text-[#e4e6eb]">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto py-4 px-4 md:px-6 bg-[#18191a]">
          <div className="max-w-2xl mx-auto">
            <div className="mb-4 flex justify-between items-center">
              <h1 className="text-2xl font-semibold text-[#e4e6eb]">Home Feed</h1>
              <div className="flex items-center gap-4">
                <SyncStatus />
                <WebSocketStatus />
              </div>
            </div>
            
            <NetworkStatus />
            
            <div className="my-4">
              <CreatePostWithOffline />
            </div>
            
            {/* Content Feed with offline capabilities */}
            <ContentFeed />
          </div>
        </main>
        
        {/* Right Sidebar - Custom with Network Components */}
        <div className="w-full max-w-[320px] h-[calc(100vh-3.5rem)] overflow-y-auto flex flex-col bg-[#18191a] border-l border-[#3a3b3c] py-4 px-4">
          <div className="mb-4">
            <h2 className="text-[#e4e6eb] font-semibold text-lg mb-2">Sync Status</h2>
            <div className="bg-[#242526] rounded-lg p-3 mb-4">
              <SyncStatusCompact />
            </div>
          </div>
          
          <div className="mb-4">
            <h2 className="text-[#e4e6eb] font-semibold text-lg mb-3">P2P Network</h2>
            <LocalPeers />
          </div>
          
          <div className="mb-4">
            <h2 className="text-[#e4e6eb] font-semibold text-lg mb-3">Device Pairing</h2>
            <DevicePairing />
          </div>
          
          <div className="mt-auto">
            <div className="text-xs text-center text-[#b0b3b8] pt-4 border-t border-[#3a3b3c]">
              <p>All content is stored on IPFS</p>
              <p className="mt-1">gHosted v0.1.0-alpha</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}