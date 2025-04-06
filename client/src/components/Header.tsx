import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useUser } from '@/contexts/UserContext';
import { usePeerConnections } from '@/hooks/use-peer-connection';
import { useIPFS } from '@/contexts/IPFSContext';
import NetworkStatus from './NetworkStatus';
import WebSocketStatus from './WebSocketStatus';
import { NetworkStatus as NetworkStatusEnum, SyncStatus } from '@/types';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Ghost, Search, HardDrive, Bell, LogOut, User, Settings, Activity } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout } = useUser();
  const { onlinePeers, isWebSocketConnected } = usePeerConnections();
  const { stats } = useIPFS();
  const [networkStatus, setNetworkStatus] = useState<NetworkStatusEnum>(NetworkStatusEnum.ONLINE);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.SYNCED);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [notificationsCount, setNotificationsCount] = useState<number>(2);
  
  // Update network status based on online status and WebSocket connection
  const updateNetworkStatus = () => {
    if (!navigator.onLine) {
      setNetworkStatus(NetworkStatusEnum.OFFLINE);
      setSyncStatus(SyncStatus.ERROR);
    } else if (!isWebSocketConnected) {
      setNetworkStatus(NetworkStatusEnum.CONNECTING);
      setSyncStatus(SyncStatus.SYNCING);
    } else {
      setNetworkStatus(NetworkStatusEnum.ONLINE);
      setSyncStatus(SyncStatus.SYNCED);
    }
  };
  
  // Update status when WebSocket connection changes
  useEffect(() => {
    updateNetworkStatus();
  }, [isWebSocketConnected]);
  
  // Listen for online/offline browser events
  useEffect(() => {
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, [isWebSocketConnected]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search for:', searchTerm);
    // TODO: Implement search functionality
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2 text-accent font-bold text-2xl">
              <Ghost className="h-6 w-6" />
              <span>gHosted</span>
            </Link>
            
            {/* Network Status Indicator */}
            <NetworkStatus status={networkStatus} peerCount={onlinePeers} />
            
            {/* WebSocket Status Indicator */}
            {user && <WebSocketStatus />}
          </div>
          
          {/* Search Bar - Hidden on mobile */}
          <div className="hidden md:block flex-1 max-w-md mx-6">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Input
                type="text"
                placeholder="Search gHosted"
                className="w-full rounded-full px-4 py-2 bg-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <Search className="absolute right-3 top-2.5 text-gray-400 h-5 w-5" />
            </form>
          </div>
          
          {/* Right side icons */}
          <div className="flex items-center space-x-4">
            {/* Sync Status */}
            <div className="relative group">
              <div className={`text-status-${syncStatus}`}>
                <HardDrive className="h-5 w-5" />
              </div>
              <div className="hidden group-hover:block absolute bg-black text-white text-xs p-2 rounded whitespace-nowrap right-0 mt-1">
                {syncStatus === SyncStatus.SYNCED && 'All content synced'}
                {syncStatus === SyncStatus.SYNCING && 'Syncing content...'}
                {syncStatus === SyncStatus.ERROR && 'Sync error'}
                <div className="text-xs mt-1">
                  {stats.totalSize > 0 && `${(stats.totalSize / (1024 * 1024)).toFixed(2)} MB used`}
                </div>
              </div>
            </div>
            
            {/* Notifications */}
            <div className="relative group">
              <div className="relative">
                <Bell className="h-5 w-5" />
                {notificationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-white rounded-full text-xs px-1.5">
                    {notificationsCount}
                  </span>
                )}
              </div>
              <div className="hidden group-hover:block absolute bg-black text-white text-xs p-2 rounded whitespace-nowrap right-0 mt-1">
                {notificationsCount > 0 ? `${notificationsCount} new notifications` : 'No new notifications'}
              </div>
            </div>
            
            {/* Profile Picture & Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-primary cursor-pointer">
                    {user.avatarCid ? (
                      <img 
                        src={`https://ipfs.io/ipfs/${user.avatarCid}`}
                        alt={`${user.displayName}'s profile`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-600">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{user.displayName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="w-full cursor-pointer">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/storage" className="w-full cursor-pointer">Storage</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="w-full cursor-pointer">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/diagnostics" className="w-full cursor-pointer">
                      <div className="flex items-center">
                        <Activity className="mr-2 h-4 w-4" />
                        <span>Network Diagnostics</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-500 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login" className="text-primary font-medium">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
