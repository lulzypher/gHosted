import React, { useEffect } from 'react';
import { Header } from '@/components/Header';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { CreatePost } from '@/components/CreatePost';
import { Post, PostType } from '@/components/Post';
import { NetworkStatus } from '@/components/NetworkStatus';
import { WebSocketStatus } from '@/components/WebSocketStatus';
import { LocalPeers } from '@/components/LocalPeers';
import { DevicePairing } from '@/components/DevicePairing';
import { usePeerDiscovery } from '@/contexts/PeerDiscoveryContext';

export default function HomePage() {
  const { startDiscovery, connectionStatus, localPeers } = usePeerDiscovery();
  
  // Start peer discovery when the component mounts
  useEffect(() => {
    // Automatically start discovery when the component mounts if the connection is ready
    if (connectionStatus === 'ready') {
      startDiscovery();
    }
  }, [connectionStatus, startDiscovery]);
  
  // This would come from an API in a real application
  const mockPosts: PostType[] = [
    {
      id: 1,
      authorId: 101,
      authorName: 'Sarah Johnson',
      authorUsername: 'sarahj',
      authorAvatar: 'QmV5jMKALn3fqYzq9uLAYemY1gX7ScdEdVy4YF1PYYVUdf',
      content: "Just finished setting up my personal gHosted node. It's incredible how this works without central servers! 🚀\n\nIf you're on my network, you should be able to see this post even if the internet goes down. #decentralized #p2p",
      createdAt: '2025-04-06T14:32:00.000Z',
      cid: 'QmcQsS8RDxQMstKNAoRZnHHEYXRfCmPnhTQ1rFKfJFdmvS',
      likes: 23,
      comments: 5,
      reposts: 3,
      isLiked: false,
      isLoved: true
    },
    {
      id: 2,
      authorId: 102,
      authorName: 'Alex Chen',
      authorUsername: 'alexc',
      authorAvatar: 'QmR8YrtoA5KN39zH4PyfJz2fxR1zDvtZvAKasXQVKrSuNF',
      content: "I've been testing gHosted for a week now and I'm impressed with the resilience of the network. No central authority controlling what we say or share. True freedom!",
      mediaCid: 'QmUsvWrCnX9t1GFk6kFyVJA2Fwzu4BgQWKK5nHn1vJ5wCq',
      createdAt: '2025-04-06T12:15:00.000Z',
      cid: 'QmVXjKmNNQ13S5JYW7LL9qcKubvvPwuvPQWKpzfpNZhHBZ',
      likes: 14,
      comments: 2,
      reposts: 1,
      isLiked: true
    },
    {
      id: 3,
      authorId: 103,
      authorName: 'Taylor Miyamoto',
      authorUsername: 'taylorm',
      content: "Just paired my mobile phone with my desktop node. Now all my content is synced across devices without any cloud service! The future is decentralized. #gHosted #p2p",
      createdAt: '2025-04-05T23:42:00.000Z',
      cid: 'QmehR8Y4q2uPXeAeEEUFyDKMz8nmQHBGgDq2aPWvAG6Hum',
      likes: 8,
      comments: 1,
      reposts: 0
    }
  ];

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
              <WebSocketStatus />
            </div>
            
            <NetworkStatus />
            
            <div className="my-4">
              <CreatePost />
            </div>
            
            <div className="space-y-4">
              {mockPosts.map((post) => (
                <Post key={post.id} post={post} />
              ))}
            </div>
          </div>
        </main>
        
        {/* Right Sidebar - Custom with Network Components */}
        <div className="w-full max-w-[320px] h-[calc(100vh-3.5rem)] overflow-y-auto flex flex-col bg-[#18191a] border-l border-[#3a3b3c] py-4 px-4">
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