import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { IPFSNodeConfig } from './IPFSNodeConfig';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  AlertCircle, 
  Server, 
  Globe, 
  Clock, 
  Users, 
  Database,
  GanttChartSquare,
  BadgeInfo
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Type definitions
interface PeerNode {
  id: string;
  peerId: string;
  name: string;
  status: 'online' | 'offline' | 'syncing';
  subdomainPrefix: string;
  uptime: number; // in seconds
}

interface NetworkStats {
  activeNodes: number;
  totalPeers: number;
  totalContent: number; // in bytes
  redundancyFactor: number;
  averageLatency: number; // in ms
}

export function WebsiteHosting() {
  const { toast } = useToast();
  // These would normally come from the IPFS API through libp2p
  const [peers, setPeers] = useState<PeerNode[]>([
    {
      id: '1',
      peerId: 'QmHash1',
      name: 'Alice\'s Node',
      status: 'online',
      subdomainPrefix: 'al1ce9',
      uptime: 86400 * 3 + 3600 * 5 // 3 days, 5 hours
    },
    {
      id: '2',
      peerId: 'QmHash2',
      name: 'Bob\'s PC',
      status: 'online',
      subdomainPrefix: 'b0b742',
      uptime: 86400 * 5 + 3600 * 2 // 5 days, 2 hours
    },
    {
      id: '3',
      peerId: 'QmHash3',
      name: 'Charlie\'s Server',
      status: 'syncing',
      subdomainPrefix: 'ch4rl13',
      uptime: 3600 * 8 // 8 hours
    }
  ]);
  
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    activeNodes: 3,
    totalPeers: 15,
    totalContent: 1073741824 * 2.5, // 2.5 GB
    redundancyFactor: 3.2,
    averageLatency: 120
  });

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

  return (
    <Card className="bg-[#242526] border-[#3a3b3c]">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-[#e4e6eb]">
              Decentralized Hosting
            </CardTitle>
            <CardDescription className="text-[#b0b3b8]">
              Run your own IPFS node to host content and contribute to the network
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert className="bg-[#3a3b3c] border-[#4a4b4c]">
          <GanttChartSquare className="h-4 w-4 text-[#3499f0]" />
          <AlertTitle className="text-[#e4e6eb]">Truly Decentralized Hosting</AlertTitle>
          <AlertDescription className="text-[#b0b3b8]">
            Unlike traditional social networks, gHosted has no central server. Content is hosted directly by users and shared peer-to-peer through IPFS.
          </AlertDescription>
        </Alert>
        
        <Tabs defaultValue="node" className="w-full">
          <TabsList className="grid grid-cols-2 bg-[#3a3b3c]">
            <TabsTrigger value="node" className="text-[#e4e6eb]">Your Node</TabsTrigger>
            <TabsTrigger value="peers" className="text-[#e4e6eb]">Network</TabsTrigger>
          </TabsList>
          
          <TabsContent value="node" className="space-y-4 mt-4">
            <IPFSNodeConfig />
          </TabsContent>
          
          <TabsContent value="peers" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#3a3b3c] rounded-md p-3 flex flex-col items-center justify-center">
                <Users size={20} className="text-[#3499f0] mb-2" />
                <div className="text-xl font-bold text-[#e4e6eb]">{networkStats.activeNodes}</div>
                <div className="text-xs text-[#b0b3b8]">Active Nodes</div>
              </div>
              
              <div className="bg-[#3a3b3c] rounded-md p-3 flex flex-col items-center justify-center">
                <Globe size={20} className="text-[#3499f0] mb-2" />
                <div className="text-xl font-bold text-[#e4e6eb]">{networkStats.totalPeers}</div>
                <div className="text-xs text-[#b0b3b8]">Total Peers</div>
              </div>
              
              <div className="bg-[#3a3b3c] rounded-md p-3 flex flex-col items-center justify-center">
                <Database size={20} className="text-[#3499f0] mb-2" />
                <div className="text-xl font-bold text-[#e4e6eb]">{formatBytes(networkStats.totalContent)}</div>
                <div className="text-xs text-[#b0b3b8]">Shared Content</div>
              </div>
              
              <div className="bg-[#3a3b3c] rounded-md p-3 flex flex-col items-center justify-center">
                <Clock size={20} className="text-[#3499f0] mb-2" />
                <div className="text-xl font-bold text-[#e4e6eb]">
                  {networkStats.redundancyFactor.toFixed(1)}x
                </div>
                <div className="text-xs text-[#b0b3b8]">Redundancy</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-[#e4e6eb] font-medium">Connected Peers</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {peers.map(peer => (
                  <div 
                    key={peer.id}
                    className="flex justify-between items-center p-2 rounded-md border border-[#3a3b3c]"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        peer.status === 'online' 
                          ? 'bg-green-400' 
                          : peer.status === 'syncing' 
                          ? 'bg-yellow-400' 
                          : 'bg-red-400'
                      }`} />
                      <span className="text-[#e4e6eb]">{peer.name}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-[#b0b3b8] text-xs mr-2">{formatUptime(peer.uptime)}</span>
                      <span className="text-xs font-mono text-[#b0b3b8]">{peer.subdomainPrefix}.ghosted.u</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <Alert className="bg-[#3a3b3c] border-amber-500/20">
              <BadgeInfo className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-[#e4e6eb]">How it works</AlertTitle>
              <AlertDescription className="text-[#b0b3b8] text-xs">
                <ul className="list-disc pl-4 space-y-1 mt-2">
                  <li>Every user gets a unique subdomain based on their node ID (e.g., ab12cd34.ghosted.u)</li>
                  <li>Content is directly shared between peers using IPFS's content-addressing system</li>
                  <li>When you heart ❤️ content, you pin it to your PC node only</li>
                  <li>When you heart-fire ❤️‍🔥 content, you pin it to both your PC and mobile nodes</li>
                  <li>Users can access each others' content directly, peer-to-peer</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex flex-col">
        <Separator className="mb-4 bg-[#3a3b3c]" />
        <p className="text-[#b0b3b8] text-xs text-center">
          The gHosted network has no central server. All content is stored using IPFS and shared directly between users.
        </p>
      </CardFooter>
    </Card>
  );
}