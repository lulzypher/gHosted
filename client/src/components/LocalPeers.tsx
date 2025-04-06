import React, { useEffect, useState } from 'react';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePeerDiscovery } from "@/contexts/PeerDiscoveryContext";
import { LocalPeer } from "@/contexts/PeerDiscoveryContext";

import { 
  Wifi, 
  WifiOff, 
  Link,
  Link2Off, 
  Loader2, 
  RefreshCw,
  Smartphone,
  Laptop,
  Tablet,
  MoreHorizontal
} from "lucide-react";

const LocalPeers: React.FC = () => {
  const { toast } = useToast();
  const { 
    localPeers,
    isDiscovering,
    connectionStatus,
    startDiscovery,
    stopDiscovery,
    connectToPeer,
    disconnectFromPeer
  } = usePeerDiscovery();

  // Format the lastSeen date
  const formatLastSeen = (date: Date): string => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  // Get status badge
  const getStatusBadge = (peer: LocalPeer) => {
    switch(peer.status) {
      case 'connected':
        return <Badge variant="outline" className="bg-green-500 text-white">Connected</Badge>;
      case 'connecting':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Connecting...</Badge>;
      case 'disconnected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Disconnected</Badge>;
      default:
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Discovered</Badge>;
    }
  };

  // Handle connection toggle
  const handleConnectionToggle = async (peer: LocalPeer) => {
    if (peer.status === 'connected' || peer.status === 'connecting') {
      disconnectFromPeer(peer.id);
      toast({
        title: "Disconnected",
        description: `Disconnected from peer ${peer.displayName || peer.id.substring(0, 8)}`,
      });
    } else {
      try {
        const success = await connectToPeer(peer.id);
        if (success) {
          toast({
            title: "Connected",
            description: `Connected to peer ${peer.displayName || peer.id.substring(0, 8)}`,
          });
        } else {
          toast({
            title: "Connection failed",
            description: "Unable to establish connection with peer",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Connection error:", error);
        toast({
          title: "Connection error",
          description: "An error occurred while connecting",
          variant: "destructive"
        });
      }
    }
  };

  // Device type icon
  const getDeviceIcon = (peer: LocalPeer) => {
    const deviceType = peer.deviceType || 'unknown';
    
    if (deviceType.includes('mobile') || deviceType.includes('phone')) {
      return <Smartphone className="mr-2" size={16} />;
    } else if (deviceType.includes('tablet')) {
      return <Tablet className="mr-2" size={16} />;
    } else {
      return <Laptop className="mr-2" size={16} />;
    }
  };

  // Get connection button
  const getConnectionButton = (peer: LocalPeer) => {
    if (peer.status === 'connecting') {
      return (
        <Button variant="outline" size="sm" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting
        </Button>
      );
    } else if (peer.status === 'connected') {
      return (
        <Button variant="outline" size="sm" onClick={() => handleConnectionToggle(peer)} className="text-red-500 hover:text-red-700">
          <Link2Off className="mr-2 h-4 w-4" />
          Disconnect
        </Button>
      );
    } else {
      return (
        <Button variant="outline" size="sm" onClick={() => handleConnectionToggle(peer)}>
          <Link className="mr-2 h-4 w-4" />
          Connect
        </Button>
      );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Local Peers</CardTitle>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={isDiscovering ? stopDiscovery : startDiscovery}
              className={isDiscovering ? "text-blue-500" : ""}
            >
              {isDiscovering ? <WifiOff className="h-4 w-4 mr-1" /> : <Wifi className="h-4 w-4 mr-1" />}
              {isDiscovering ? "Stop" : "Discover"}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={startDiscovery}
              disabled={isDiscovering}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>
          {connectionStatus === 'initializing' ? 'Initializing discovery...' :
           connectionStatus === 'error' ? 'Discovery error. Check connection.' :
           connectionStatus === 'disconnected' ? 'Discovery service disconnected' :
           isDiscovering ? 'Actively discovering peers on local network' : 'Peer discovery paused'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {localPeers.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <WifiOff className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No peers discovered on your local network</p>
            <p className="text-sm mt-1">
              {isDiscovering ? 
                "We're looking for peers..." : 
                "Click Discover to find peers on your network"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {localPeers.map((peer) => (
              <div 
                key={peer.id} 
                className="border rounded-md p-3 flex flex-col space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    {getDeviceIcon(peer)}
                    <div>
                      <h4 className="font-medium text-sm">
                        {peer.displayName || `Peer ${peer.id.substring(0, 8)}...`}
                      </h4>
                      <p className="text-xs text-gray-500">Last seen: {formatLastSeen(peer.lastSeen)}</p>
                    </div>
                  </div>
                  {getStatusBadge(peer)}
                </div>
                <div className="flex justify-between items-center">
                  {getConnectionButton(peer)}
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-gray-500 justify-between border-t pt-3">
        <span>{localPeers.length} {localPeers.length === 1 ? 'peer' : 'peers'} discovered</span>
        <span>
          {localPeers.filter(p => p.status === 'connected').length} connected
        </span>
      </CardFooter>
    </Card>
  );
};

export default LocalPeers;