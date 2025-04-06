import React from 'react';
import { useIPFS } from '@/contexts/IPFSContext';
import { usePeerConnections } from '@/hooks/use-peer-connection';
import { User, HardDrive, Smartphone, FileText } from 'lucide-react';
import { PinnedContent } from '@/types';
import { Link } from 'wouter';
import LocalPeers from './LocalPeers';

const RightSidebar: React.FC = () => {
  const { pinnedContents } = useIPFS();
  const { peerConnections, onlinePeers } = usePeerConnections();

  return (
    <aside className="hidden lg:block w-80 space-y-4">
      {/* Peers and Connections */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-semibold text-sm mb-3">Network</h3>
        
        {/* Connected Peers */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs text-gray-500">Active Peers</h4>
            <span className="text-xs font-medium bg-green-100 text-status-synced px-2 py-0.5 rounded-full">
              {onlinePeers} Online
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {peerConnections
              .filter(peer => peer.status === 'online')
              .slice(0, 5)
              .map(peer => (
                <div key={peer.id} className="relative group">
                  <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-status-synced">
                    {peer.user?.avatarCid ? (
                      <img 
                        src={`https://ipfs.io/ipfs/${peer.user.avatarCid}`}
                        alt={peer.user?.displayName || 'Peer'} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-600">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="hidden group-hover:block absolute bg-black text-white text-xs p-2 rounded whitespace-nowrap left-0 mt-1 z-50">
                    {peer.user?.displayName || 'Unknown User'}
                  </div>
                </div>
              ))}
            
            {onlinePeers > 5 && (
              <div className="relative group">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 text-gray-600 text-xs">
                  +{onlinePeers - 5}
                </div>
                <div className="hidden group-hover:block absolute bg-black text-white text-xs p-2 rounded whitespace-nowrap left-0 mt-1 z-50">
                  {onlinePeers - 5} more peers
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Network Stats */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Shared Files</span>
            <span className="font-medium">{pinnedContents.length}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Total Storage Used</span>
            <span className="font-medium">
              {(pinnedContents.reduce((acc, _) => acc + 1, 0) * 0.25).toFixed(1)} MB
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Network Health</span>
            <span className="font-medium text-status-synced">Good</span>
          </div>
        </div>
      </div>
      
      {/* Pinned Posts */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-semibold text-sm mb-3">Pinned Content</h3>
        
        {/* Pinned Post List */}
        <div className="space-y-3">
          {pinnedContents.slice(0, 3).map((content: PinnedContent) => (
            <div key={content.id} className="flex space-x-3 pb-3 border-b border-gray-100">
              <div className="h-10 w-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {content.post?.imageCid ? (
                  <img 
                    src={`https://ipfs.io/ipfs/${content.post.imageCid}`}
                    alt="Post thumbnail" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-200">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-2">
                  {content.post?.content || 'Pinned content'}
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-gray-500">{content.post?.user?.displayName || 'Unknown User'}</span>
                  <div className="w-1 h-1 rounded-full bg-gray-300 mx-1.5"></div>
                  <div className="flex items-center text-xs text-accent">
                    {content.pinType === 'like' ? (
                      <>
                        <HardDrive className="mr-0.5 h-3 w-3" />
                        <span>PC</span>
                      </>
                    ) : (
                      <>
                        <HardDrive className="mr-0.5 h-3 w-3" />
                        <Smartphone className="mr-0.5 h-3 w-3" />
                        <span>All</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {pinnedContents.length > 3 && (
            <Link href="/storage">
              <a className="w-full mt-2 block text-center text-xs text-primary font-medium py-1.5 hover:bg-blue-50 rounded-lg">
                View All Pinned Content
              </a>
            </Link>
          )}

          {pinnedContents.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-2">
              No pinned content yet. Like or Love posts to pin them.
            </p>
          )}
        </div>
      </div>
      
      {/* Local Peers - P2P Discovery */}
      <LocalPeers />
      
      {/* Suggested Communities */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-semibold text-sm mb-3">Suggested Communities</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <i className="ri-code-line"></i>
              </div>
              <div>
                <h4 className="text-sm font-medium">Web3 Developers</h4>
                <p className="text-xs text-gray-500">3.2k members</p>
              </div>
            </div>
            <button className="text-xs text-primary border border-primary px-2 py-1 rounded hover:bg-blue-50">
              Join
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                <i className="ri-earth-line"></i>
              </div>
              <div>
                <h4 className="text-sm font-medium">Decentralized Social</h4>
                <p className="text-xs text-gray-500">1.8k members</p>
              </div>
            </div>
            <button className="text-xs text-primary border border-primary px-2 py-1 rounded hover:bg-blue-50">
              Join
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <i className="ri-file-paper-2-line"></i>
              </div>
              <div>
                <h4 className="text-sm font-medium">Content Creators</h4>
                <p className="text-xs text-gray-500">5.1k members</p>
              </div>
            </div>
            <button className="text-xs text-primary border border-primary px-2 py-1 rounded hover:bg-blue-50">
              Join
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;
