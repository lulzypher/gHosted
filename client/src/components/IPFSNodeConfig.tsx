import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Server, 
  HardDrive, 
  Smartphone, 
  Wifi, 
  Users, 
  Share2,
  Settings,
  Radio,
  Shield,
  Globe
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

interface IPFSNodeSettings {
  nodeType: 'full' | 'light';
  storagePath: string;
  maxStorage: number; // in GB
  enableGateway: boolean;
  gatewayPort: number;
  enableRelay: boolean;
  enableDHT: boolean;
  enableNATTraversal: boolean;
  enableMDNS: boolean;
  bootstrapNodes: string[];
  swarmPort: number;
  apiPort: number;
  ipnsPublishInterval: number; // in minutes
  discoveryMode: 'local' | 'dht' | 'both';
}

interface IPFSNodeStats {
  peersConnected: number;
  objectsStored: number;
  storageUsed: number; // in bytes
  bandwidth: {
    upStream: number; // in bytes
    downStream: number; // in bytes
  };
  gatewayRequests: number;
  ipnsRecords: number;
  pinCount: number;
  nodeUptime: number; // in seconds
  lastSeenOnline: string;
}

// This will be used to generate node ID based subdomain
function shortenNodeId(nodeId: string): string {
  if (!nodeId) return '';
  return nodeId.substring(0, 8);
}

// Format a CID for display
function formatCID(cid: string): string {
  if (!cid) return '';
  return `${cid.substring(0, 6)}...${cid.substring(cid.length - 4)}`;
}

export function IPFSNodeConfig() {
  const { toast } = useToast();
  const [nodeId, setNodeId] = useState<string>('');
  const [ipnsAddress, setIpnsAddress] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [nodeSettings, setNodeSettings] = useState<IPFSNodeSettings>({
    nodeType: 'full',
    storagePath: './.ipfs',
    maxStorage: 10, // 10GB default
    enableGateway: true,
    gatewayPort: 8080,
    enableRelay: true,
    enableDHT: true,
    enableNATTraversal: true,
    enableMDNS: true,
    bootstrapNodes: [
      // Default IPFS bootstrap nodes
      '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
      '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
      '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb'
    ],
    swarmPort: 4001,
    apiPort: 5001,
    ipnsPublishInterval: 60, // 1 hour
    discoveryMode: 'both',
  });
  
  const [nodeStats, setNodeStats] = useState<IPFSNodeStats>({
    peersConnected: 0,
    objectsStored: 0,
    storageUsed: 0,
    bandwidth: {
      upStream: 0,
      downStream: 0,
    },
    gatewayRequests: 0,
    ipnsRecords: 0,
    pinCount: 0,
    nodeUptime: 0,
    lastSeenOnline: new Date().toISOString(),
  });

  // Effect to check IPFS node status on component mount
  useEffect(() => {
    checkNodeStatus();
    
    // Poll for updates every 5 seconds if node is running
    const interval = setInterval(() => {
      if (isRunning) {
        fetchNodeStats();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isRunning]);

  // Check if the IPFS node is running
  const checkNodeStatus = async () => {
    try {
      // For now, this is mocked - in real implementation this will check the local IPFS node
      setIsRunning(false);
      setNodeId('QmYourNodeIdWillBeHere');
      setIpnsAddress('k51qzi5uqu5dkkciu33khkzbcmxtyhn376i1e83tya8kuy7z9euedzyr5nhoew');
    } catch (error) {
      console.error('Error checking node status:', error);
      setIsRunning(false);
    }
  };

  // Fetch current node stats
  const fetchNodeStats = async () => {
    try {
      // For now, this is mocked - in real implementation this will fetch from the local IPFS API
      setNodeStats({
        peersConnected: Math.floor(Math.random() * 10) + 1,
        objectsStored: Math.floor(Math.random() * 100) + 50,
        storageUsed: (Math.random() * 1000000000), // Random value in bytes
        bandwidth: {
          upStream: Math.random() * 50000000,
          downStream: Math.random() * 100000000,
        },
        gatewayRequests: Math.floor(Math.random() * 50),
        ipnsRecords: Math.floor(Math.random() * 5) + 1,
        pinCount: Math.floor(Math.random() * 30) + 10,
        nodeUptime: Math.floor(Math.random() * 86400) + 3600, // Random between 1-24 hours
        lastSeenOnline: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching node stats:', error);
    }
  };

  // Start the IPFS node with current settings
  const startNode = async () => {
    setIsInitializing(true);
    
    try {
      // In a real implementation, this would initialize the js-ipfs node
      // For now we'll simulate the initialization with a timeout
      setTimeout(() => {
        setIsRunning(true);
        setIsInitializing(false);
        
        // Mock node ID and IPNS values
        setNodeId('QmYourNodeIdWillBeGeneratedHere');
        setIpnsAddress('k51qzi5uqu5dkkciu33khkzbcmxtyhn376i1e83tya8kuy7z9euedzyr5nhoew');
        
        fetchNodeStats();
        
        toast({
          title: 'IPFS Node Started',
          description: 'Your node is now running and connected to the network',
        });
      }, 2000);
    } catch (error) {
      setIsInitializing(false);
      toast({
        title: 'Failed to start IPFS node',
        description: 'There was an error starting your node: ' + (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  // Stop the IPFS node
  const stopNode = async () => {
    try {
      // In a real implementation, this would stop the js-ipfs node
      // For now we'll simulate with a timeout
      setTimeout(() => {
        setIsRunning(false);
        toast({
          title: 'IPFS Node Stopped',
          description: 'Your node has been shut down',
        });
      }, 1000);
    } catch (error) {
      toast({
        title: 'Failed to stop IPFS node',
        description: 'There was an error stopping your node: ' + (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  // Save node settings
  const saveSettings = () => {
    // In a real implementation, this would save to local storage and apply to the node
    toast({
      title: 'Settings Saved',
      description: 'Your IPFS node settings have been updated',
    });
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format uptime
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Update a setting
  const updateSetting = (key: keyof IPFSNodeSettings, value: any) => {
    setNodeSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Card className="bg-[#242526] border-[#3a3b3c]">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-[#e4e6eb]">
              {isRunning ? 'IPFS Node Running' : 'IPFS Node Configuration'}
            </CardTitle>
            <CardDescription className="text-[#b0b3b8]">
              {isRunning 
                ? 'Your personal node is active and helping host gHosted content' 
                : 'Configure your personal IPFS node'}
            </CardDescription>
          </div>
          {isRunning && nodeId && (
            <div>
              <Badge className="bg-green-600 hover:bg-green-700">
                Online
              </Badge>
              <div className="text-xs text-[#b0b3b8] mt-1">
                Node ID: {shortenNodeId(nodeId)}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isRunning ? (
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid grid-cols-3 bg-[#3a3b3c]">
              <TabsTrigger value="status" className="text-[#e4e6eb]">Status</TabsTrigger>
              <TabsTrigger value="network" className="text-[#e4e6eb]">Network</TabsTrigger>
              <TabsTrigger value="settings" className="text-[#e4e6eb]">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="status" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#e4e6eb]">Storage Used</Label>
                  <Progress 
                    value={(nodeStats.storageUsed / (nodeSettings.maxStorage * 1024 * 1024 * 1024)) * 100} 
                    className="h-2" 
                  />
                  <div className="flex justify-between text-xs text-[#b0b3b8]">
                    <span>{formatBytes(nodeStats.storageUsed)}</span>
                    <span>{nodeSettings.maxStorage} GB</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[#e4e6eb]">Bandwidth (24h)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-[#b0b3b8]">Upload</div>
                      <div className="text-sm text-[#e4e6eb]">{formatBytes(nodeStats.bandwidth.upStream)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#b0b3b8]">Download</div>
                      <div className="text-sm text-[#e4e6eb]">{formatBytes(nodeStats.bandwidth.downStream)}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#3a3b3c] rounded-md p-3 flex flex-col items-center justify-center">
                  <HardDrive size={20} className="text-[#3499f0] mb-1" />
                  <div className="text-xl font-bold text-[#e4e6eb]">{nodeStats.objectsStored}</div>
                  <div className="text-xs text-[#b0b3b8]">Objects</div>
                </div>
                
                <div className="bg-[#3a3b3c] rounded-md p-3 flex flex-col items-center justify-center">
                  <Share2 size={20} className="text-[#3499f0] mb-1" />
                  <div className="text-xl font-bold text-[#e4e6eb]">{nodeStats.pinCount}</div>
                  <div className="text-xs text-[#b0b3b8]">Pins</div>
                </div>
                
                <div className="bg-[#3a3b3c] rounded-md p-3 flex flex-col items-center justify-center">
                  <Globe size={20} className="text-[#3499f0] mb-1" />
                  <div className="text-xl font-bold text-[#e4e6eb]">{nodeStats.gatewayRequests}</div>
                  <div className="text-xs text-[#b0b3b8]">Gateway Requests</div>
                </div>
                
                <div className="bg-[#3a3b3c] rounded-md p-3 flex flex-col items-center justify-center">
                  <Wifi size={20} className="text-[#3499f0] mb-1" />
                  <div className="text-xl font-bold text-[#e4e6eb]">{nodeStats.peersConnected}</div>
                  <div className="text-xs text-[#b0b3b8]">Peers</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-[#e4e6eb]">Node Information</Label>
                  <span className="text-xs text-[#b0b3b8]">
                    Uptime: {formatUptime(nodeStats.nodeUptime)}
                  </span>
                </div>
                
                <div className="bg-[#3a3b3c] p-3 rounded-md space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#b0b3b8]">Node Type:</span>
                    <span className="text-[#e4e6eb]">{nodeSettings.nodeType === 'full' ? 'Full Node' : 'Light Node'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#b0b3b8]">Node ID:</span>
                    <span className="text-[#e4e6eb] font-mono text-xs">{shortenNodeId(nodeId)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#b0b3b8]">IPNS Address:</span>
                    <span className="text-[#e4e6eb] font-mono text-xs">{formatCID(ipnsAddress)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#b0b3b8]">Your Subdomain:</span>
                    <span className="text-[#e4e6eb]">{shortenNodeId(nodeId)}.ghosted.u</span>
                  </div>
                </div>
              </div>
              
              <Alert className="bg-[#3a3b3c] border-green-600/30">
                <Shield className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-500">Node is functioning normally</AlertTitle>
                <AlertDescription className="text-[#b0b3b8]">
                  Your content is available and being hosted through the network.
                </AlertDescription>
              </Alert>
              
              <Button 
                variant="destructive" 
                onClick={stopNode}
                className="w-full"
              >
                Stop Node
              </Button>
            </TabsContent>
            
            <TabsContent value="network" className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-[#e4e6eb]">Connected Peers</Label>
                  <span className="text-xs text-[#e4e6eb]">{nodeStats.peersConnected} active connections</span>
                </div>
                
                <div className="bg-[#3a3b3c] p-3 rounded-md h-32 overflow-y-auto">
                  {/* This would show actual peers in a real implementation */}
                  <div className="flex justify-between text-sm py-1 border-b border-[#242526]">
                    <span className="text-[#e4e6eb] font-mono text-xs">Qm34F9z1</span>
                    <span className="text-green-400 text-xs">Connected (2m ago)</span>
                  </div>
                  <div className="flex justify-between text-sm py-1 border-b border-[#242526]">
                    <span className="text-[#e4e6eb] font-mono text-xs">QmP8r2Y9</span>
                    <span className="text-green-400 text-xs">Connected (5m ago)</span>
                  </div>
                  <div className="flex justify-between text-sm py-1 border-b border-[#242526]">
                    <span className="text-[#e4e6eb] font-mono text-xs">Qm87H3k2</span>
                    <span className="text-green-400 text-xs">Connected (8m ago)</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#e4e6eb]">Connection Settings</Label>
                <div className="bg-[#3a3b3c] p-3 rounded-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enable-relay" className="text-[#e4e6eb]">Enable Relay</Label>
                      <p className="text-xs text-[#b0b3b8]">Act as a relay node for others</p>
                    </div>
                    <Switch 
                      id="enable-relay" 
                      checked={nodeSettings.enableRelay}
                      onCheckedChange={(checked) => updateSetting('enableRelay', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enable-dht" className="text-[#e4e6eb]">Enable DHT</Label>
                      <p className="text-xs text-[#b0b3b8]">Participate in distributed hash table</p>
                    </div>
                    <Switch 
                      id="enable-dht" 
                      checked={nodeSettings.enableDHT}
                      onCheckedChange={(checked) => updateSetting('enableDHT', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enable-nat" className="text-[#e4e6eb]">NAT Traversal</Label>
                      <p className="text-xs text-[#b0b3b8]">Enable connections through firewalls</p>
                    </div>
                    <Switch 
                      id="enable-nat" 
                      checked={nodeSettings.enableNATTraversal}
                      onCheckedChange={(checked) => updateSetting('enableNATTraversal', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enable-mdns" className="text-[#e4e6eb]">Local Discovery</Label>
                      <p className="text-xs text-[#b0b3b8]">Find peers on your local network</p>
                    </div>
                    <Switch 
                      id="enable-mdns" 
                      checked={nodeSettings.enableMDNS}
                      onCheckedChange={(checked) => updateSetting('enableMDNS', checked)}
                    />
                  </div>
                </div>
              </div>
              
              <Button 
                variant="secondary" 
                onClick={saveSettings}
                className="w-full"
              >
                Apply Network Settings
              </Button>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-[#e4e6eb]">IPFS Node Type</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className={`p-3 rounded-md border cursor-pointer ${
                      nodeSettings.nodeType === 'full' 
                        ? 'border-[#3499f0] bg-[#3499f0]/10' 
                        : 'border-[#3a3b3c]'
                    }`}
                    onClick={() => updateSetting('nodeType', 'full')}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-[#e4e6eb]">Full Node</h3>
                      <Server size={16} className="text-[#e4e6eb]" />
                    </div>
                    <p className="text-xs text-[#b0b3b8]">
                      Stores all content, provides gateway services, helps network reliability
                    </p>
                  </div>
                  
                  <div 
                    className={`p-3 rounded-md border cursor-pointer ${
                      nodeSettings.nodeType === 'light' 
                        ? 'border-[#3499f0] bg-[#3499f0]/10' 
                        : 'border-[#3a3b3c]'
                    }`}
                    onClick={() => updateSetting('nodeType', 'light')}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-[#e4e6eb]">Light Node</h3>
                      <Smartphone size={16} className="text-[#e4e6eb]" />
                    </div>
                    <p className="text-xs text-[#b0b3b8]">
                      Stores only your content and pins, uses less resources, suitable for mobile
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#e4e6eb]">Storage Allocation</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[nodeSettings.maxStorage]}
                    min={1}
                    max={100}
                    step={1}
                    onValueChange={(value) => updateSetting('maxStorage', value[0])}
                    className="flex-1"
                  />
                  <span className="text-[#e4e6eb] font-medium w-20 text-center">
                    {nodeSettings.maxStorage} GB
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#e4e6eb]">Gateway</Label>
                <div className="flex items-center justify-between bg-[#3a3b3c] p-3 rounded-md">
                  <div>
                    <Label htmlFor="enable-gateway" className="text-[#e4e6eb]">Enable HTTP Gateway</Label>
                    <p className="text-xs text-[#b0b3b8]">Allow others to access content through your node</p>
                  </div>
                  <Switch 
                    id="enable-gateway" 
                    checked={nodeSettings.enableGateway}
                    onCheckedChange={(checked) => updateSetting('enableGateway', checked)}
                  />
                </div>
                
                {nodeSettings.enableGateway && (
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <Label htmlFor="gateway-port" className="text-xs text-[#b0b3b8] mb-1 block">Gateway Port</Label>
                      <Input 
                        id="gateway-port"
                        type="number" 
                        value={nodeSettings.gatewayPort} 
                        onChange={(e) => updateSetting('gatewayPort', parseInt(e.target.value))}
                        className="bg-[#3a3b3c] border-[#4a4b4c] text-[#e4e6eb]"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="swarm-port" className="text-xs text-[#b0b3b8] mb-1 block">Swarm Port</Label>
                      <Input 
                        id="swarm-port"
                        type="number" 
                        value={nodeSettings.swarmPort} 
                        onChange={(e) => updateSetting('swarmPort', parseInt(e.target.value))}
                        className="bg-[#3a3b3c] border-[#4a4b4c] text-[#e4e6eb]"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#e4e6eb]">Auto-Publishing</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Radio 
                      checked={nodeSettings.ipnsPublishInterval === 60}
                      onClick={() => updateSetting('ipnsPublishInterval', 60)}
                      className="border-[#3499f0]"
                    />
                    <Label className="text-[#e4e6eb]">Every hour (recommended)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Radio 
                      checked={nodeSettings.ipnsPublishInterval === 360}
                      onClick={() => updateSetting('ipnsPublishInterval', 360)}
                      className="border-[#3499f0]"
                    />
                    <Label className="text-[#e4e6eb]">Every 6 hours</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Radio 
                      checked={nodeSettings.ipnsPublishInterval === 1440}
                      onClick={() => updateSetting('ipnsPublishInterval', 1440)}
                      className="border-[#3499f0]"
                    />
                    <Label className="text-[#e4e6eb]">Daily</Label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6">
            <Alert className="bg-[#3a3b3c] border-blue-600/30">
              <Radio className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-[#e4e6eb]">Help make gHosted decentralized</AlertTitle>
              <AlertDescription className="text-[#b0b3b8]">
                Running your own IPFS node helps keep content available and strengthens the network. Your node will store the content you care about and help distribute it to others.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label className="text-[#e4e6eb]">Choose Node Type</Label>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={`p-3 rounded-md border cursor-pointer ${
                    nodeSettings.nodeType === 'full' 
                      ? 'border-[#3499f0] bg-[#3499f0]/10' 
                      : 'border-[#3a3b3c]'
                  }`}
                  onClick={() => updateSetting('nodeType', 'full')}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-[#e4e6eb]">Full Node</h3>
                    <Server size={16} className="text-[#e4e6eb]" />
                  </div>
                  <p className="text-xs text-[#b0b3b8]">
                    Best for desktop PCs and always-on devices. Stores and shares more content.
                  </p>
                </div>
                
                <div 
                  className={`p-3 rounded-md border cursor-pointer ${
                    nodeSettings.nodeType === 'light' 
                      ? 'border-[#3499f0] bg-[#3499f0]/10' 
                      : 'border-[#3a3b3c]'
                  }`}
                  onClick={() => updateSetting('nodeType', 'light')}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-[#e4e6eb]">Light Node</h3>
                    <Smartphone size={16} className="text-[#e4e6eb]" />
                  </div>
                  <p className="text-xs text-[#b0b3b8]">
                    Best for laptops and devices with limited resources. Stores only what you need.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-[#e4e6eb]">Storage Allocation</Label>
                <span className="text-[#e4e6eb] font-medium">
                  {nodeSettings.maxStorage} GB
                </span>
              </div>
              <Slider
                value={[nodeSettings.maxStorage]}
                min={1}
                max={100}
                step={1}
                onValueChange={(value) => updateSetting('maxStorage', value[0])}
              />
              <p className="text-xs text-[#b0b3b8]">
                Your node will use up to this much disk space to store content
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable-gateway" className="text-[#e4e6eb]">Enable Gateway</Label>
                <p className="text-xs text-[#b0b3b8]">Allow others to access content through your node</p>
              </div>
              <Switch 
                id="enable-gateway" 
                checked={nodeSettings.enableGateway}
                onCheckedChange={(checked) => updateSetting('enableGateway', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable-dht" className="text-[#e4e6eb]">Enable Auto-Discovery</Label>
                <p className="text-xs text-[#b0b3b8]">Automatically find other nodes on your local network</p>
              </div>
              <Switch 
                id="enable-dht" 
                checked={nodeSettings.enableMDNS}
                onCheckedChange={(checked) => updateSetting('enableMDNS', checked)}
              />
            </div>
            
            <Button 
              className="w-full" 
              onClick={startNode}
              disabled={isInitializing}
            >
              {isInitializing ? 'Starting Node...' : 'Start IPFS Node'}
              {isInitializing && (
                <div className="animate-spin ml-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              )}
            </Button>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col">
        <Separator className="mb-4 bg-[#3a3b3c]" />
        <p className="text-[#b0b3b8] text-xs text-center">
          Your IPFS node is completely decentralized and connects directly with other peers.
          No central servers are involved in hosting or serving content.
        </p>
      </CardFooter>
    </Card>
  );
}