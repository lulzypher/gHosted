import React, { useEffect, useState } from 'react';
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
import { WebsiteHosting } from '@/components/WebsiteHosting'; 
import { usePeerDiscovery } from '@/contexts/PeerDiscoveryContext';
import { useP2P } from '@/contexts/P2PContext';
import { useSync } from '@/contexts/SyncContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Network, Server, Globe, Home } from 'lucide-react';

export default function HomePage() {
  const { startDiscovery, connectionStatus, localPeers } = usePeerDiscovery();
  const { isInitialized, initializeP2P } = useP2P();
  const [activeTab, setActiveTab] = useState("home");
  
  // Start peer discovery when the component mounts
  useEffect(() => {
    // Automatically start discovery when the component mounts if the connection is ready
    if (connectionStatus === 'ready') {
      startDiscovery();
    }
    
    // Initialize P2P networking if not already initialized
    if (!isInitialized) {
      initializeP2P();
    }
  }, [connectionStatus, startDiscovery, isInitialized, initializeP2P]);

  return (
    <div className="h-screen flex flex-col bg-[#18191a] text-[#e4e6eb]">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar />
        
        {/* Main Content with Tabs */}
        <main className="flex-1 overflow-y-auto py-4 px-4 md:px-6 bg-[#18191a]">
          <Tabs defaultValue="home" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="max-w-2xl mx-auto">
              <div className="mb-4 flex justify-between items-center">
                <TabsList className="bg-[#242526]">
                  <TabsTrigger value="home" className="text-[#e4e6eb] gap-2">
                    <Home size={16} /> Feed
                  </TabsTrigger>
                  <TabsTrigger value="hosting" className="text-[#e4e6eb] gap-2">
                    <Server size={16} /> Hosting
                  </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-4">
                  <SyncStatus />
                  <WebSocketStatus />
                </div>
              </div>
              
              <TabsContent value="home" className="mt-0">
                <NetworkStatus />
                
                <div className="my-4">
                  <CreatePostWithOffline />
                </div>
                
                {/* Content Feed with offline capabilities */}
                <ContentFeed />
              </TabsContent>
              
              <TabsContent value="hosting" className="mt-0">
                <WebsiteHosting />
                
                {!isInitialized && (
                  <div className="p-4 bg-[#242526] rounded-md border border-[#3a3b3c] text-center mt-4">
                    <p className="text-[#e4e6eb] mb-3">Connect to the decentralized network to enable hosting</p>
                    <Button onClick={initializeP2P} className="bg-[#3499f0] hover:bg-[#2d88da]">
                      <Globe className="mr-2 h-4 w-4" />
                      Connect to P2P Network
                    </Button>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
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
          
          {activeTab === "home" && (
            <div className="mb-4">
              <h2 className="text-[#e4e6eb] font-semibold text-lg mb-3">Device Pairing</h2>
              <DevicePairing />
            </div>
          )}
          
          <div className="mt-auto">
            <div className="text-xs text-center text-[#b0b3b8] pt-4 border-t border-[#3a3b3c]">
              <p>All content is stored on IPFS</p>
              <p className="mt-1">gHosted v0.2.0-alpha</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}