import React from 'react';
import { Link } from 'wouter';
import { Info, ChevronRight } from 'lucide-react';
import { WebsiteHosting } from './WebsiteHosting';

interface NetworkPeer {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
}

interface PinnedContent {
  id: number;
  title: string;
  imageCid?: string;
  cid: string;
  type: 'post' | 'media' | 'website';
}

export function RightSidebar() {
  // These would come from a real API but for now are mocked for the UI
  const activePeers: NetworkPeer[] = [
    { id: '1', name: 'Sarah J.', isOnline: true, avatar: 'QmV5jMKALn3fqYzq9uLAYemY1gX7ScdEdVy4YF1PYYVUdf' },
    { id: '2', name: 'Alex C.', isOnline: true, avatar: 'QmR8YrtoA5KN39zH4PyfJz2fxR1zDvtZvAKasXQVKrSuNF' },
    { id: '3', name: 'Taylor M.', isOnline: true },
    { id: '4', name: 'Jordan L.', isOnline: true, avatar: 'QmPEbNnJq9rkLt5pKQoaVKL2xFNbejebVhzLPmHD1EQJgS' },
    { id: '5', name: 'Pat D.', isOnline: true, avatar: 'QmRNGxRk9ppi5nTQFyTYpHKDh1GBzUFNcUSfvN7KqeyLwy' },
    { id: '6', name: 'Quinn R.', isOnline: false },
    { id: '7', name: 'Robin S.', isOnline: false }
  ];
  
  const onlinePeers = activePeers.filter(peer => peer.isOnline);
  
  const pinnedContents: PinnedContent[] = [
    { 
      id: 1, 
      title: 'Network Infrastructure',
      imageCid: 'QmUsvWrCnX9t1GFk6kFyVJA2Fwzu4BgQWKK5nHn1vJ5wCq',
      cid: 'QmcVPnhKP1MwYbv8mVHYfUz9NuJuBhzwKtLNTbGaQzKJYe',
      type: 'media'
    },
    {
      id: 2,
      title: 'IPFS Introduction',
      cid: 'QmVXjKmNNQ13S5JYW7LL9qcKubvvPwuvPQWKpzfpNZhHBZ',
      type: 'post'
    },
    {
      id: 3,
      title: 'Decentralized App Tutorial',
      imageCid: 'QmZrcMQnMidvjtB3Ft6CuY6cHpb8YzTcZKxEWzZ6XJ9JVe',
      cid: 'QmehR8Y4q2uPXeAeEEUFyDKMz8nmQHBGgDq2aPWvAG6Hum',
      type: 'website'
    }
  ];
  
  return (
    <div className="w-full max-w-[280px] h-[calc(100vh-3.5rem)] overflow-y-auto flex flex-col bg-[#18191a] border-l border-[#3a3b3c] py-4">
      <div className="px-4 mb-4">
        <h2 className="text-[#e4e6eb] font-semibold text-lg mb-3">Network</h2>
        
        <div className="bg-[#242526] rounded-lg p-3 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-[#e4e6eb]">Active Peers</h3>
              <span className="bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full text-xs font-medium">
                {onlinePeers.length} Online
              </span>
            </div>
            
            <div className="flex -space-x-2 overflow-hidden">
              {onlinePeers.slice(0, 5).map((peer) => (
                <div key={peer.id} className="h-8 w-8 rounded-full ring-2 ring-[#18191a] overflow-hidden">
                  {peer.avatar ? (
                    <img
                      src={`https://ipfs.io/ipfs/${peer.avatar}`}
                      alt={peer.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#3a3b3c] flex items-center justify-center text-[#e4e6eb] font-medium">
                      {peer.name.charAt(0)}
                    </div>
                  )}
                </div>
              ))}
              {onlinePeers.length > 5 && (
                <div className="h-8 w-8 rounded-full ring-2 ring-[#18191a] flex items-center justify-center bg-[#3a3b3c] text-xs font-medium text-[#e4e6eb]">
                  +{onlinePeers.length - 5}
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-2 border-t border-[#3a3b3c]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-[#e4e6eb]">Shared Files</span>
              <span className="text-sm font-medium text-[#e4e6eb]">142</span>
            </div>
          </div>
          
          <div className="pt-2 border-t border-[#3a3b3c]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-[#e4e6eb]">Total Storage Used</span>
              <span className="text-sm font-medium text-[#e4e6eb]">1.2 GB</span>
            </div>
          </div>
          
          <div className="pt-2 border-t border-[#3a3b3c]">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#e4e6eb]">Network Health</span>
              <span className="text-sm font-medium text-green-400">Good</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 mb-4">
        <WebsiteHosting />
      </div>
      
      <div className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-[#e4e6eb] font-semibold text-lg">Pinned Content</h2>
          <Link href="/pinned">
            <div className="text-xs text-[#3499f0] hover:underline flex items-center cursor-pointer">
              View All
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </div>
          </Link>
        </div>
        
        <div className="space-y-3">
          {pinnedContents.map((content) => (
            <Link key={content.id} href={`/content/${content.cid}`}>
              <div className="block bg-[#242526] hover:bg-[#3a3b3c]/70 rounded-lg overflow-hidden transition-colors cursor-pointer">
                {content.imageCid ? (
                  <div className="aspect-video w-full overflow-hidden relative">
                    <img
                      src={`https://ipfs.io/ipfs/${content.imageCid}`}
                      alt={content.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      {content.type === 'media' ? 'Media' : content.type === 'website' ? 'Website' : 'Post'}
                    </div>
                  </div>
                ) : (
                  <div className="h-16 flex items-center p-3">
                    <div className="w-10 h-10 rounded flex items-center justify-center bg-[#3a3b3c] text-[#3499f0] mr-3">
                      <Info className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-[#e4e6eb] truncate">{content.title}</h3>
                      <p className="text-xs text-[#b0b3b8] truncate">
                        {content.cid.substring(0, 8)}...
                      </p>
                    </div>
                  </div>
                )}
                {content.imageCid && (
                  <div className="p-2">
                    <h3 className="text-sm font-medium text-[#e4e6eb]">{content.title}</h3>
                    <p className="text-xs text-[#b0b3b8] truncate">
                      {content.cid.substring(0, 10)}...
                    </p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      <div className="mt-auto px-4">
        <div className="text-xs text-center text-[#b0b3b8] pt-4 border-t border-[#3a3b3c]">
          <p>All content is stored on IPFS</p>
          <p className="mt-1">gHosted v0.1.0-alpha</p>
        </div>
      </div>
    </div>
  );
}