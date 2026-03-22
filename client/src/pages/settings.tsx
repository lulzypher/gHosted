import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useUser } from '@/contexts/UserContext';
import { useIPFS } from '@/contexts/IPFSContext';
import { Header } from '@/components/Header';
import { LeftSidebar } from '@/components/LeftSidebar';
import MobileNavigation from '@/components/MobileNavigation';
import { LocalPeers } from '@/components/LocalPeers';
import { DevicePairing } from '@/components/DevicePairing';
import { SyncStatusCompact } from '@/components/SyncStatus';
import { WebSocketStatus } from '@/components/WebSocketStatus';
import { DebugPanel } from '@/components/DebugPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Shield,
  UserCog,
  HardDrive,
  Smartphone,
  Globe,
  Bell,
  Eye,
  Trash2,
  RefreshCw,
  Wifi,
  Bug,
  ChevronRight,
} from 'lucide-react';
import Login from './login';

const SETTINGS_KEY = 'ghosted-settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        darkMode: Boolean(parsed.darkMode),
        notifications: parsed.notifications !== false,
        publicProfile: parsed.publicProfile !== false,
        autoSync: parsed.autoSync !== false,
      };
    }
  } catch {
    /* ignore */
  }
  return { darkMode: false, notifications: true, publicProfile: true, autoSync: true };
}

function saveSettings(settings: Record<string, boolean>) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

const Settings: React.FC = () => {
  const { user, isLoading: isUserLoading, logout } = useUser();
  const { stats } = useIPFS();

  const loaded = loadSettings();
  const [storageLimit, setStorageLimit] = useState<number>(1);
  const [darkMode, setDarkMode] = useState<boolean>(loaded.darkMode);
  const [notifications, setNotifications] = useState<boolean>(loaded.notifications);
  const [publicProfile, setPublicProfile] = useState<boolean>(loaded.publicProfile);
  const [autoSync, setAutoSync] = useState<boolean>(loaded.autoSync);
  const [debugOpen, setDebugOpen] = useState<boolean>(false);

  // Persist settings when they change
  useEffect(() => {
    saveSettings({ darkMode, notifications, publicProfile, autoSync });
  }, [darkMode, notifications, publicProfile, autoSync]);

  // Set initial storage limit based on stats
  useEffect(() => {
    if (stats) {
      setStorageLimit((stats.allocatedSize ?? 0) / (1024 * 1024 * 1024));
    }
  }, [stats]);

  // Apply dark mode to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // If user is not logged in, show login page
  if (!isUserLoading && !user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-4 flex flex-col md:flex-row gap-4">
        {/* Left Sidebar */}
        <LeftSidebar />
        
        {/* Settings Content */}
        <div className="flex-1 space-y-4 max-w-2xl mx-auto w-full">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h1 className="text-xl font-bold mb-4">Settings</h1>
            
            <Tabs defaultValue="account">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="account" className="flex items-center space-x-1">
                  <UserCog className="h-4 w-4" />
                  <span>Account</span>
                </TabsTrigger>
                <TabsTrigger value="storage" className="flex items-center space-x-1">
                  <HardDrive className="h-4 w-4" />
                  <span>Storage</span>
                </TabsTrigger>
                <TabsTrigger value="privacy" className="flex items-center space-x-1">
                  <Shield className="h-4 w-4" />
                  <span>Privacy</span>
                </TabsTrigger>
                <TabsTrigger value="network" className="flex items-center space-x-1">
                  <Wifi className="h-4 w-4" />
                  <span>Network</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Account Settings */}
              <TabsContent value="account" className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-md font-semibold">Account Information</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-sm text-gray-500">Username</label>
                        <Input value={user?.username} readOnly />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm text-gray-500">Display Name</label>
                        <Input value={user?.displayName} />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-sm text-gray-500">Decentralized Identifier (DID)</label>
                      <Input value={user?.did} readOnly />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <h2 className="text-md font-semibold">Preferences</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm">Dark Mode</div>
                        <div className="text-xs text-gray-500">Enable dark theme</div>
                      </div>
                      <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm">Notifications</div>
                        <div className="text-xs text-gray-500">Enable push notifications</div>
                      </div>
                      <Switch checked={notifications} onCheckedChange={setNotifications} />
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                  <Button 
                    variant="destructive" 
                    className="flex items-center space-x-1"
                    onClick={logout}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </div>
              </TabsContent>
              
              {/* Storage Settings */}
              <TabsContent value="storage" className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-md font-semibold">Storage Usage</h2>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Used</span>
                      <span className="text-sm font-medium">
                        {((stats.totalSize ?? 0) / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-primary h-2.5 rounded-full" 
                        style={{ width: `${(((stats.totalSize ?? 0) / Math.max(1, (stats.allocatedSize ?? 1))) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">0 MB</span>
                      <span className="text-xs text-gray-500">
                        {((stats.allocatedSize ?? 0) / (1024 * 1024 * 1024)).toFixed(1)} GB
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-2 space-y-1">
                    <label className="text-sm">Storage Limit</label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        value={[storageLimit]}
                        onValueChange={(values) => setStorageLimit(values[0])}
                        min={0.1}
                        max={10}
                        step={0.1}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-16 text-right">{storageLimit.toFixed(1)} GB</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <h2 className="text-md font-semibold">Connected Devices</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <HardDrive className="h-5 w-5 text-gray-600" />
                        <div>
                          <div className="text-sm font-medium">Desktop</div>
                          <div className="text-xs text-gray-500">Last synced: Today, 10:35 AM</div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Smartphone className="h-5 w-5 text-gray-600" />
                        <div>
                          <div className="text-sm font-medium">Mobile</div>
                          <div className="text-xs text-gray-500">Last synced: Yesterday, 8:22 PM</div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <h2 className="text-md font-semibold">Sync Settings</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm">Auto Sync</div>
                        <div className="text-xs text-gray-500">Automatically sync content across devices</div>
                      </div>
                      <Switch checked={autoSync} onCheckedChange={setAutoSync} />
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                  <Button className="flex items-center space-x-1">
                    <RefreshCw className="h-4 w-4" />
                    <span>Sync Now</span>
                  </Button>
                </div>
              </TabsContent>
              
              {/* Privacy Settings */}
              <TabsContent value="privacy" className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-md font-semibold">Privacy Settings</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm">Public Profile</div>
                        <div className="text-xs text-gray-500">Make your profile visible to everyone</div>
                      </div>
                      <Switch checked={publicProfile} onCheckedChange={setPublicProfile} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm">Peer Discovery</div>
                        <div className="text-xs text-gray-500">Allow others to discover your node</div>
                      </div>
                      <Switch checked={true} />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <h2 className="text-md font-semibold">Visibility Controls</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-gray-600" />
                        <div className="text-sm">Who can see my posts</div>
                      </div>
                      <select className="text-sm border rounded px-2 py-1">
                        <option>Everyone</option>
                        <option>Followers Only</option>
                        <option>Nobody</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bell className="h-4 w-4 text-gray-600" />
                        <div className="text-sm">Who can message me</div>
                      </div>
                      <select className="text-sm border rounded px-2 py-1">
                        <option>Everyone</option>
                        <option>Followers Only</option>
                        <option>Nobody</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-gray-600" />
                        <div className="text-sm">Activity status</div>
                      </div>
                      <select className="text-sm border rounded px-2 py-1">
                        <option>Show to Everyone</option>
                        <option>Show to Followers</option>
                        <option>Hide</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                  <Button variant="outline" className="flex items-center space-x-1">
                    <Shield className="h-4 w-4" />
                    <span>Advanced Privacy Settings</span>
                  </Button>
                </div>
              </TabsContent>

              {/* Network Settings */}
              <TabsContent value="network" className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-md font-semibold">Sync Status</h2>
                  <div className="bg-gray-100 p-4 rounded-lg dark:bg-[#242526] dark:border dark:border-[#3a3b3c]">
                    <SyncStatusCompact />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <h2 className="text-md font-semibold">Connection</h2>
                  <div className="bg-gray-100 p-4 rounded-lg dark:bg-[#242526] dark:border dark:border-[#3a3b3c]">
                    <WebSocketStatus showReconnect={true} />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <h2 className="text-md font-semibold">P2P Network</h2>
                  <p className="text-xs text-gray-500">Nearby devices on the decentralized network</p>
                  <LocalPeers />
                </div>

                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <h2 className="text-md font-semibold">Device Pairing</h2>
                  <p className="text-xs text-gray-500">Pair this device with others for sync</p>
                  <DevicePairing />
                </div>

                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <Collapsible open={debugOpen} onOpenChange={setDebugOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                      <Bug className="h-4 w-4" />
                      <span>Debug / Connection Info</span>
                      <ChevronRight className={`h-4 w-4 transition-transform ${debugOpen ? 'rotate-90' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <DebugPanel inline />
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <Link href="/diagnostics">
                    <Button variant="outline" className="flex items-center space-x-1">
                      <Wifi className="h-4 w-4" />
                      <span>Full Network Diagnostics</span>
                    </Button>
                  </Link>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
};

export default Settings;
