import React, { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useIPFS } from '@/contexts/IPFSContext';
import Header from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import MobileNavigation from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  HardDrive, 
  Trash2, 
  Download, 
  FileText, 
  Image as ImageIcon, 
  RefreshCw, 
  Search,
  Smartphone
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PinType, PinnedContent } from '@/types';
import Login from './login';

const StorageItemCard: React.FC<{
  item: PinnedContent;
  onDelete: (id: number, cid: string) => void;
}> = ({ item, onDelete }) => {
  const formattedDate = item.pinnedAt 
    ? formatDistanceToNow(new Date(item.pinnedAt), { addSuffix: true })
    : 'Unknown time';

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
          {item.post?.imageCid ? (
            <img 
              src={`https://ipfs.io/ipfs/${item.post.imageCid}`}
              alt="Content thumbnail"
              className="h-full w-full object-cover"
            />
          ) : (
            <FileText className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm truncate max-w-[200px]">
              {item.post?.content?.substring(0, 50) || 'Pinned content'}
              {item.post?.content?.length > 50 ? '...' : ''}
            </span>
            <div className="flex items-center text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
              {item.pinType === PinType.LOVE ? (
                <div className="flex items-center">
                  <HardDrive className="h-3 w-3 mr-0.5" />
                  <Smartphone className="h-3 w-3" />
                </div>
              ) : (
                <HardDrive className="h-3 w-3" />
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>{formattedDate}</span>
            <span>•</span>
            <span className="text-accent truncate max-w-[100px]">{item.contentCid.substring(0, 10)}...</span>
          </div>
        </div>
      </div>
      <div className="flex space-x-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-500 hover:text-blue-700 p-1 h-7 w-7"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700 p-1 h-7 w-7"
          title="Remove"
          onClick={() => onDelete(item.id, item.contentCid)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const Storage: React.FC = () => {
  const { user, isLoading: isUserLoading } = useUser();
  const { pinnedContents, stats, refreshPinnedContents, unpinContent } = useIPFS();
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // If user is not logged in, show login page
  if (!isUserLoading && !user) {
    return <Login />;
  }

  // Filter pinned contents based on search term
  const filteredContents = pinnedContents.filter(content => 
    content.post?.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    content.contentCid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group contents by pin type
  const lovedContents = filteredContents.filter(content => content.pinType === PinType.LOVE);
  const likedContents = filteredContents.filter(content => content.pinType === PinType.LIKE);

  // Storage usage calculations
  const usedStorageMB = (stats.totalSize / (1024 * 1024)).toFixed(0);
  const allocatedStorageGB = (stats.allocatedSize / (1024 * 1024 * 1024)).toFixed(1);
  const usedStoragePercentage = (stats.totalSize / stats.allocatedSize) * 100;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPinnedContents();
    setIsRefreshing(false);
  };

  const handleDelete = async (id: number, cid: string) => {
    await unpinContent(id, cid);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-4 flex flex-col md:flex-row gap-4">
        {/* Left Sidebar */}
        <LeftSidebar />
        
        {/* Storage Content */}
        <div className="flex-1 space-y-4 max-w-2xl mx-auto w-full">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-bold flex items-center">
                <HardDrive className="mr-2 h-5 w-5" />
                Storage
              </h1>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-1"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
            
            {/* Storage Stats */}
            <div className="mb-6">
              <div className="flex justify-between mb-1 text-sm">
                <span>Storage Usage</span>
                <span className="font-medium">{usedStorageMB} MB / {allocatedStorageGB} GB</span>
              </div>
              <Progress value={usedStoragePercentage} className="h-2" />
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>{stats.pinnedCount} files pinned</span>
                <span>{(stats.allocatedSize - stats.totalSize) / (1024 * 1024 * 1024) > 0.1 ? 'Space available' : 'Storage nearly full'}</span>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="mb-4 relative">
              <Input
                placeholder="Search pinned content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            
            {/* Content Type Tabs */}
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold mb-2 flex items-center">
                  <Smartphone className="mr-1 h-4 w-4" />
                  <HardDrive className="mr-1 h-4 w-4" />
                  Loved Content (All Devices)
                </h2>
                {lovedContents.length > 0 ? (
                  <div className="space-y-2">
                    {lovedContents.map(content => (
                      <StorageItemCard 
                        key={content.id} 
                        item={content}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
                    {searchTerm ? 'No loved content matching your search' : 'No loved content yet'}
                  </div>
                )}
              </div>
              
              <div>
                <h2 className="text-sm font-semibold mb-2 flex items-center">
                  <HardDrive className="mr-1 h-4 w-4" />
                  Liked Content (PC Only)
                </h2>
                {likedContents.length > 0 ? (
                  <div className="space-y-2">
                    {likedContents.map(content => (
                      <StorageItemCard 
                        key={content.id} 
                        item={content}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
                    {searchTerm ? 'No liked content matching your search' : 'No liked content yet'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
};

export default Storage;
