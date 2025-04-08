import React, { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useIPFS } from '@/contexts/IPFSContext';
import { Header } from '@/components/Header';
import { LeftSidebar } from '@/components/LeftSidebar';
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
  Smartphone,
  Heart
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
    
  // Determine the pin type color and icon
  const getPinTypeDisplay = () => {
    switch (item.pinType) {
      case PinType.LOVE:
      case PinType.REMOTE:
        return {
          bgColor: "bg-orange-100 dark:bg-orange-900/20",
          textColor: "text-orange-700 dark:text-orange-400",
          borderColor: "border-orange-200 dark:border-orange-800",
          label: "All Devices",
          icon: (
            <div className="flex items-center">
              <HardDrive className="h-3 w-3 mr-0.5" />
              <Smartphone className="h-3 w-3" />
            </div>
          )
        };
      case PinType.LOCAL:
        return {
          bgColor: "bg-red-100 dark:bg-red-900/20",
          textColor: "text-red-700 dark:text-red-400",
          borderColor: "border-red-200 dark:border-red-800",
          label: "PC Only",
          icon: <HardDrive className="h-3 w-3" />
        };
      default:
        return {
          bgColor: "bg-blue-100 dark:bg-blue-900/20",
          textColor: "text-blue-700 dark:text-blue-400",
          borderColor: "border-blue-200 dark:border-blue-800",
          label: "Unknown",
          icon: <FileText className="h-3 w-3" />
        };
    }
  };
  
  const pinTypeDisplay = getPinTypeDisplay();

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border-l-4 ${pinTypeDisplay.borderColor} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="h-12 w-12 flex-shrink-0 rounded overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            {item.post?.imageCid ? (
              <img 
                src={`https://ipfs.io/ipfs/${item.post.imageCid}`}
                alt="Content thumbnail"
                className="h-full w-full object-cover"
              />
            ) : (
              <FileText className="h-6 w-6 text-gray-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
              <span className="font-medium text-sm truncate max-w-[200px] dark:text-white">
                {item.post?.content ? (
                  <>
                    {item.post.content.substring(0, 50)}
                    {(item.post.content.length || 0) > 50 ? '...' : ''}
                  </>
                ) : (
                  'Pinned content'
                )}
              </span>
              <div className={`flex items-center text-xs px-2 py-1 rounded mt-1 sm:mt-0 ${pinTypeDisplay.bgColor} ${pinTypeDisplay.textColor}`}>
                {pinTypeDisplay.icon}
                <span className="ml-1">{pinTypeDisplay.label}</span>
              </div>
            </div>
            <div className="flex items-center mt-1 space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{formattedDate}</span>
              <span>•</span>
              <div className="flex items-center">
                <span className="font-mono truncate max-w-[120px]" title={item.contentCid}>
                  {item.contentCid.substring(0, 10)}...{item.contentCid.substring(item.contentCid.length - 4)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-1 ml-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/20 p-1 h-8 w-8 rounded-full"
            title="Download Content"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 p-1 h-8 w-8 rounded-full"
            title="Remove Content"
            onClick={() => onDelete(item.id, item.contentCid)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const Storage: React.FC = () => {
  const { user, isLoading: isUserLoading } = useUser();
  const { pinnedContents, stats, refreshPinnedContents, unpinContent } = useIPFS();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Handler function for search input change
  const handleSearchChange = (e: any) => {
    if (e && e.target && typeof e.target.value === 'string') {
      setSearchTerm(e.target.value);
    }
  };
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

  // Storage usage calculations with safe defaults
  const totalSize = stats?.totalSize || 0;
  const allocatedSize = stats?.allocatedSize || 1024 * 1024 * 1024; // Default 1GB if not provided
  
  const usedStorageMB = (totalSize / (1024 * 1024)).toFixed(0);
  const allocatedStorageGB = (allocatedSize / (1024 * 1024 * 1024)).toFixed(1);
  const usedStoragePercentage = Math.min((totalSize / allocatedSize) * 100, 100); // Cap at 100%

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
            
            {/* Storage Stats Dashboard */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Storage Usage Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <h3 className="text-sm font-semibold mb-2 flex items-center">
                    <HardDrive className="h-4 w-4 mr-1 text-blue-500" />
                    Storage Usage
                  </h3>
                  
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Used Space</span>
                    <span className="font-medium">{usedStorageMB} MB / {allocatedStorageGB} GB</span>
                  </div>
                  
                  <div className="relative pt-1">
                    <Progress 
                      value={usedStoragePercentage} 
                      className="h-2.5 rounded-full" 
                      // Change color based on usage
                      style={{
                        backgroundColor: usedStoragePercentage > 80 
                          ? 'rgba(239, 68, 68, 0.2)' 
                          : usedStoragePercentage > 60 
                            ? 'rgba(245, 158, 11, 0.2)' 
                            : 'rgba(59, 130, 246, 0.2)',
                        color: usedStoragePercentage > 80 
                          ? 'rgb(239, 68, 68)' 
                          : usedStoragePercentage > 60 
                            ? 'rgb(245, 158, 11)' 
                            : 'rgb(59, 130, 246)'
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{Math.round(usedStoragePercentage)}% used</span>
                    <span>{((allocatedSize - totalSize) / (1024 * 1024 * 1024)).toFixed(1)} GB free</span>
                  </div>
                </div>
                
                {/* Pinned Content Stats Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <h3 className="text-sm font-semibold mb-2 flex items-center">
                    <Heart className="h-4 w-4 mr-1 text-red-500" />
                    Pinned Content
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-red-50 dark:bg-red-900/10 p-2 rounded-md border border-red-100 dark:border-red-900/20">
                      <div className="text-xs text-gray-500 dark:text-gray-400">PC Only</div>
                      <div className="text-xl font-semibold text-red-600 dark:text-red-400 flex items-center">
                        {likedContents.length}
                        <HardDrive className="h-4 w-4 ml-1" />
                      </div>
                    </div>
                    
                    <div className="bg-orange-50 dark:bg-orange-900/10 p-2 rounded-md border border-orange-100 dark:border-orange-900/20">
                      <div className="text-xs text-gray-500 dark:text-gray-400">All Devices</div>
                      <div className="text-xl font-semibold text-orange-600 dark:text-orange-400 flex items-center">
                        {lovedContents.length}
                        <div className="relative ml-1">
                          <HardDrive className="h-4 w-4" />
                          <Smartphone className="h-3 w-3 absolute -top-1 -right-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Total of {stats?.pinnedCount || stats?.numPins || 0} items pinned to IPFS network
                  </div>
                </div>
              </div>
              
              {/* Content Type Distribution */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm mb-4">
                <h3 className="text-sm font-semibold mb-3">Content Distribution</h3>
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                      <div className="h-full bg-red-500" style={{ width: `${(likedContents.length / (likedContents.length + lovedContents.length || 1)) * 100}%` }}></div>
                      <div className="h-full bg-orange-500" style={{ width: `${(lovedContents.length / (likedContents.length + lovedContents.length || 1)) * 100}%` }}></div>
                    </div>
                  </div>
                  <div className="text-xs flex items-center space-x-2">
                    <span className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                      PC: {Math.round((likedContents.length / (likedContents.length + lovedContents.length || 1)) * 100)}%
                    </span>
                    <span className="flex items-center">
                      <div className="w-3 h-3 bg-orange-500 rounded-full mr-1"></div>
                      All: {Math.round((lovedContents.length / (likedContents.length + lovedContents.length || 1)) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="mb-4 relative">
              <Input
                placeholder="Search pinned content..."
                value={searchTerm}
                onChange={handleSearchChange}
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
