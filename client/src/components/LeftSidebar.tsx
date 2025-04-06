import React from 'react';
import { Link, useLocation } from 'wouter';
import { useUser } from '@/contexts/UserContext';
import { useIPFS } from '@/contexts/IPFSContext';
import { 
  Home, 
  User, 
  Users, 
  Bookmark, 
  Settings, 
  HardDrive, 
  Smartphone, 
  CheckCircle, 
  Loader 
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const LeftSidebar: React.FC = () => {
  const { user, devices, getCurrentDevice } = useUser();
  const { stats } = useIPFS();
  const [location] = useLocation();

  if (!user) return null;

  const currentDevice = getCurrentDevice();
  const pcDevice = devices.find(d => d.type === 'pc');
  const mobileDevice = devices.find(d => d.type === 'mobile');
  const usedStoragePercentage = (stats.totalSize / stats.allocatedSize) * 100;
  const usedStorageMB = (stats.totalSize / (1024 * 1024)).toFixed(0);
  const allocatedStorageGB = (stats.allocatedSize / (1024 * 1024 * 1024)).toFixed(1);

  return (
    <aside className="hidden md:block w-64 space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        {/* User Profile Card */}
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 rounded-full overflow-hidden">
            {user.avatarCid ? (
              <img 
                src={`https://ipfs.io/ipfs/${user.avatarCid}`}
                alt={`${user.displayName}'s profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-600">
                <User className="h-6 w-6" />
              </div>
            )}
          </div>
          <div>
            <h2 className="font-semibold">{user.displayName}</h2>
            <p className="text-xs text-gray-500 flex items-center">
              <span className="truncate max-w-[150px]">{user.did}</span>
            </p>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="space-y-1">
          <Link href="/">
            <a className={`flex items-center space-x-3 px-3 py-2 rounded-lg ${location === '/' ? 'bg-blue-50 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <Home className="h-5 w-5" />
              <span>Home</span>
            </a>
          </Link>
          <Link href="/profile">
            <a className={`flex items-center space-x-3 px-3 py-2 rounded-lg ${location === '/profile' ? 'bg-blue-50 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <User className="h-5 w-5" />
              <span>Profile</span>
            </a>
          </Link>
          <Link href="/communities">
            <a className={`flex items-center space-x-3 px-3 py-2 rounded-lg ${location === '/communities' ? 'bg-blue-50 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <Users className="h-5 w-5" />
              <span>Communities</span>
            </a>
          </Link>
          <Link href="/saved">
            <a className={`flex items-center space-x-3 px-3 py-2 rounded-lg ${location === '/saved' ? 'bg-blue-50 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <Bookmark className="h-5 w-5" />
              <span>Saved Posts</span>
            </a>
          </Link>
          <Link href="/settings">
            <a className={`flex items-center space-x-3 px-3 py-2 rounded-lg ${location === '/settings' ? 'bg-blue-50 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </a>
          </Link>
        </nav>
      </div>
      
      {/* Device Sync Status Card */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-semibold mb-3">Device Sync</h3>
        
        {/* PC Device */}
        {pcDevice && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-gray-600" />
              <span className="text-sm">{pcDevice.name}</span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-status-synced">
              <CheckCircle className="h-3 w-3" />
              <span>Synced</span>
            </div>
          </div>
        )}
        
        {/* Mobile Device */}
        {mobileDevice && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-4 w-4 text-gray-600" />
              <span className="text-sm">{mobileDevice.name}</span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-status-syncing">
              <Loader className="h-3 w-3 animate-spin" />
              <span>Syncing</span>
            </div>
          </div>
        )}
        
        {/* Storage Stats */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <h4 className="text-xs font-medium text-gray-500 mb-2">Local Storage</h4>
          <Progress value={usedStoragePercentage} className="h-2.5" />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">{usedStorageMB} MB used</span>
            <span className="text-xs text-gray-500">{allocatedStorageGB} GB allocated</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;
