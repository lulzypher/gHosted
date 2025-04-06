import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Server, 
  Globe, 
  Clock, 
  Users, 
  Database,
  BarChart3
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface HostingNode {
  id: number;
  name: string;
  role: string;
  domain: string;
  health: number;
  status: 'online' | 'offline' | 'syncing';
  uptime: number; // in seconds
  startTime: string;
  endTime?: string;
  stats: {
    requestsServed: number;
    bandwidth: number; // in bytes
    uptime: number; // percentage
    latency: number; // in ms
  };
}

interface HostingStatus {
  isHosting: boolean;
  eligibleNodes: {
    id: number;
    name: string;
    role: string;
    status: 'online' | 'offline' | 'syncing';
  }[];
  activeHostingNodes: HostingNode[];
  networkStats: {
    totalNodes: number;
    activeHosts: number;
    totalUptime: number; // in hours
    redundancyFactor: number; // how many copies of the website are hosted
    healthScore: number; // overall health percentage
  };
}

export function WebsiteHosting() {
  const { toast } = useToast();
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  
  // Fetch hosting status
  const { data: hostingStatus, isLoading, error } = useQuery<HostingStatus>({ 
    queryKey: ['/api/website-hosting'],
    retry: false,
  });

  // Toggle hosting status mutation
  const toggleHostingMutation = useMutation({
    mutationFn: async ({ nodeId, isHosting }: { nodeId: number, isHosting: boolean }) => {
      const endpoint = isHosting 
        ? '/api/website-hosting/start' 
        : '/api/website-hosting/stop';
      
      const res = await apiRequest('POST', endpoint, { nodeId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/website-hosting'] });
      toast({
        title: 'Hosting status updated',
        description: 'Your hosting preferences have been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update hosting status',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Select first eligible node as default if not set and list is loaded
  useEffect(() => {
    if (!selectedNodeId && hostingStatus?.eligibleNodes && hostingStatus.eligibleNodes.length > 0) {
      setSelectedNodeId(hostingStatus.eligibleNodes[0].id);
    }
  }, [hostingStatus, selectedNodeId]);

  // Handle hosting toggle
  const handleHostingToggle = (isChecked: boolean) => {
    if (selectedNodeId) {
      toggleHostingMutation.mutate({ 
        nodeId: selectedNodeId, 
        isHosting: isChecked 
      });
    } else {
      toast({
        title: 'No node selected',
        description: 'Please select a node to host the website.',
        variant: 'destructive',
      });
    }
  };

  // Check if selected node is currently hosting
  const isNodeHosting = () => {
    if (!selectedNodeId || !hostingStatus?.activeHostingNodes) return false;
    return hostingStatus.activeHostingNodes.some(node => node.id === selectedNodeId);
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

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-[#242526] border-[#3a3b3c]">
        <CardHeader>
          <CardTitle className="text-[#e4e6eb]">Website Hosting</CardTitle>
          <CardDescription className="text-[#b0b3b8]">Loading hosting status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-32 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3499f0]"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-[#242526] border-[#3a3b3c]">
        <CardHeader>
          <CardTitle className="text-[#e4e6eb]">Website Hosting</CardTitle>
          <CardDescription className="text-[#b0b3b8]">Failed to load hosting status</CardDescription>
        </CardHeader>
        <CardContent className="text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>Error: {(error as Error).message}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#242526] border-[#3a3b3c]">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-[#e4e6eb]">Website Hosting</CardTitle>
            <CardDescription className="text-[#b0b3b8]">
              Help keep gHosted alive by hosting the website
            </CardDescription>
          </div>
          <Badge 
            className={`${
              hostingStatus?.networkStats?.healthScore && hostingStatus.networkStats.healthScore > 80
                ? 'bg-green-600 hover:bg-green-700'
                : hostingStatus?.networkStats?.healthScore && hostingStatus.networkStats.healthScore > 50
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {hostingStatus?.networkStats?.healthScore ?? 0}% Health
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs defaultValue="hosting" className="w-full">
          <TabsList className="grid grid-cols-2 bg-[#3a3b3c]">
            <TabsTrigger value="hosting" className="text-[#e4e6eb]">Hosting</TabsTrigger>
            <TabsTrigger value="network" className="text-[#e4e6eb]">Network Stats</TabsTrigger>
          </TabsList>
          
          <TabsContent value="hosting" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="hosting-node" className="text-[#e4e6eb]">Select a node to host with:</Label>
              
              <div className="grid gap-2">
                {hostingStatus?.eligibleNodes.map(node => (
                  <div 
                    key={node.id}
                    className={`flex justify-between items-center p-3 rounded-md cursor-pointer border ${
                      selectedNodeId === node.id 
                        ? 'border-[#3499f0] bg-[#3499f0]/10' 
                        : 'border-[#3a3b3c] hover:bg-[#3a3b3c]'
                    }`}
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Server size={16} className="text-[#e4e6eb]" />
                      <span className="text-[#e4e6eb]">{node.name}</span>
                      <Badge 
                        variant="outline" 
                        className={`ml-2 ${
                          node.status === 'online' 
                            ? 'text-green-400 border-green-400/30' 
                            : node.status === 'syncing'
                            ? 'text-yellow-400 border-yellow-400/30'
                            : 'text-red-400 border-red-400/30'
                        }`}
                      >
                        {node.status}
                      </Badge>
                    </div>
                    <Badge>{node.role}</Badge>
                  </div>
                ))}
                
                {hostingStatus?.eligibleNodes.length === 0 && (
                  <div className="text-[#b0b3b8] text-center p-4 border border-[#3a3b3c] rounded-md">
                    No eligible nodes found. Please register a node first.
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 py-4">
              <Switch 
                id="hosting-toggle"
                checked={isNodeHosting()}
                onCheckedChange={handleHostingToggle}
                disabled={!selectedNodeId || toggleHostingMutation.isPending}
              />
              <Label htmlFor="hosting-toggle" className="text-[#e4e6eb]">
                {isNodeHosting() ? 'Currently hosting' : 'Start hosting'}
              </Label>
              
              {toggleHostingMutation.isPending && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#3499f0] ml-2"></div>
              )}
            </div>
            
            {isNodeHosting() && selectedNodeId && (
              <div className="space-y-2 border border-[#3a3b3c] rounded-md p-3">
                <h3 className="text-[#e4e6eb] font-medium">Your Hosting Stats</h3>
                
                {hostingStatus?.activeHostingNodes
                  .filter(node => node.id === selectedNodeId)
                  .map(node => (
                    <div key={node.id} className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#b0b3b8]">Health:</span>
                        <span 
                          className={`${
                            node.health > 80 
                              ? 'text-green-400' 
                              : node.health > 50 
                              ? 'text-yellow-400' 
                              : 'text-red-400'
                          }`}
                        >
                          {node.health}%
                        </span>
                      </div>
                      <Progress value={node.health} className="h-2" />
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-[#b0b3b8]">Requests:</span>
                          <span className="text-[#e4e6eb] float-right">{node.stats.requestsServed}</span>
                        </div>
                        <div>
                          <span className="text-[#b0b3b8]">Bandwidth:</span>
                          <span className="text-[#e4e6eb] float-right">{formatBytes(node.stats.bandwidth)}</span>
                        </div>
                        <div>
                          <span className="text-[#b0b3b8]">Uptime:</span>
                          <span className="text-[#e4e6eb] float-right">{formatUptime(node.uptime)}</span>
                        </div>
                        <div>
                          <span className="text-[#b0b3b8]">Latency:</span>
                          <span className="text-[#e4e6eb] float-right">{node.stats.latency}ms</span>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <span className="text-[#b0b3b8] text-xs">Hosting at:</span>
                        <a 
                          href={`http://${node.domain}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#3499f0] hover:underline text-sm ml-1"
                        >
                          {node.domain}
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="network" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#3a3b3c] rounded-md p-3 flex flex-col items-center justify-center">
                <Users size={24} className="text-[#3499f0] mb-2" />
                <div className="text-2xl font-bold text-[#e4e6eb]">{hostingStatus?.networkStats.activeHosts || 0}</div>
                <div className="text-xs text-[#b0b3b8]">Active Hosts</div>
              </div>
              
              <div className="bg-[#3a3b3c] rounded-md p-3 flex flex-col items-center justify-center">
                <Globe size={24} className="text-[#3499f0] mb-2" />
                <div className="text-2xl font-bold text-[#e4e6eb]">{hostingStatus?.networkStats.redundancyFactor.toFixed(1) || 0}x</div>
                <div className="text-xs text-[#b0b3b8]">Redundancy</div>
              </div>
              
              <div className="bg-[#3a3b3c] rounded-md p-3 flex flex-col items-center justify-center">
                <Database size={24} className="text-[#3499f0] mb-2" />
                <div className="text-2xl font-bold text-[#e4e6eb]">{hostingStatus?.networkStats.totalNodes || 0}</div>
                <div className="text-xs text-[#b0b3b8]">Total Nodes</div>
              </div>
              
              <div className="bg-[#3a3b3c] rounded-md p-3 flex flex-col items-center justify-center">
                <Clock size={24} className="text-[#3499f0] mb-2" />
                <div className="text-2xl font-bold text-[#e4e6eb]">
                  {Math.floor(hostingStatus?.networkStats.totalUptime || 0)}h
                </div>
                <div className="text-xs text-[#b0b3b8]">Total Uptime</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-[#e4e6eb] font-medium">Active Hosting Nodes</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {hostingStatus?.activeHostingNodes.map(node => (
                  <div 
                    key={node.id}
                    className="flex justify-between items-center p-2 rounded-md border border-[#3a3b3c]"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        node.status === 'online' 
                          ? 'bg-green-400' 
                          : node.status === 'syncing' 
                          ? 'bg-yellow-400' 
                          : 'bg-red-400'
                      }`} />
                      <span className="text-[#e4e6eb]">{node.name}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-[#b0b3b8] text-xs mr-2">{formatUptime(node.uptime)}</span>
                      <Badge 
                        variant="outline" 
                        className={`${
                          node.health > 80 
                            ? 'text-green-400 border-green-400/30' 
                            : node.health > 50 
                            ? 'text-yellow-400 border-yellow-400/30' 
                            : 'text-red-400 border-red-400/30'
                        }`}
                      >
                        {node.health}%
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {(!hostingStatus?.activeHostingNodes || hostingStatus.activeHostingNodes.length === 0) && (
                  <div className="text-[#b0b3b8] text-center p-4 border border-[#3a3b3c] rounded-md">
                    No active hosting nodes found. Be the first to contribute!
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex flex-col">
        <Separator className="mb-4 bg-[#3a3b3c]" />
        <p className="text-[#b0b3b8] text-xs text-center">
          By hosting the website, you help keep gHosted decentralized and always available to users. Each hosting node receives website visits based on proximity and node health.
        </p>
      </CardFooter>
    </Card>
  );
}