import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { LeftSidebar } from '@/components/LeftSidebar';
import { CreatePostWithOffline } from '@/components/CreatePostWithOffline';
import { ContentFeed } from '@/components/ContentFeed';
import { WebsiteHosting } from '@/components/WebsiteHosting';
import { useP2P } from '@/contexts/P2PContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Server, Globe, Home } from 'lucide-react';

export default function HomePage() {
  const { isInitialized, initializeP2P } = useP2P();
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    if (!isInitialized) {
      initializeP2P();
    }
  }, [isInitialized, initializeP2P]);

  return (
    <div className="h-screen flex flex-col bg-[#18191a] text-[#e4e6eb]">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />

        <main className="flex-1 overflow-y-auto py-4 px-4 md:px-6 bg-[#18191a]">
          <Tabs defaultValue="home" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="max-w-2xl mx-auto">
              <div className="mb-4">
                <TabsList className="bg-[#242526]">
                  <TabsTrigger value="home" className="text-[#e4e6eb] gap-2">
                    <Home size={16} /> Feed
                  </TabsTrigger>
                  <TabsTrigger value="hosting" className="text-[#e4e6eb] gap-2">
                    <Server size={16} /> Hosting
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="home" className="mt-0">
                <div className="my-4">
                  <CreatePostWithOffline />
                </div>
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
      </div>
    </div>
  );
}