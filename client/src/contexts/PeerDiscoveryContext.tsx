import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

// Define the LocalPeer type directly in this file to avoid circular dependencies
export interface LocalPeer {
  id: string;
  displayName?: string;
  deviceType?: 'pc' | 'mobile' | 'server' | 'unknown';
  status: 'discovered' | 'connecting' | 'connected' | 'disconnected';
  lastSeen: Date;
}

// Define the context types
export type ConnectionStatus = 'initializing' | 'ready' | 'error' | 'disconnected';

interface PeerDiscoveryContextProps {
  localPeers: LocalPeer[];
  isDiscovering: boolean;
  connectionStatus: ConnectionStatus;
  startDiscovery: () => void;
  stopDiscovery: () => void;
  connectToPeer: (peerId: string) => Promise<boolean>;
  disconnectFromPeer: (peerId: string) => void;
  sendToPeer: (peerId: string, data: any) => boolean;
  broadcastToAllPeers: (data: any) => void;
}

// Create the context
const PeerDiscoveryContext = createContext<PeerDiscoveryContextProps | null>(null);

// Create a provider component with simplified mock implementation
export const PeerDiscoveryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [localPeers] = useState<LocalPeer[]>([
    {
      id: 'mock-1234',
      displayName: 'Development PC',
      deviceType: 'pc',
      status: 'discovered',
      lastSeen: new Date()
    },
    {
      id: 'mock-5678',
      displayName: 'Test Phone',
      deviceType: 'mobile',
      status: 'discovered',
      lastSeen: new Date(Date.now() - 3 * 60000) // 3 minutes ago
    }
  ]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [connectionStatus] = useState<ConnectionStatus>('ready');

  // Start discovering peers (mock implementation)
  const startDiscovery = () => {
    setIsDiscovering(true);
    
    // Simulate peer discovery
    setTimeout(() => {
      setIsDiscovering(false);
      toast({
        title: "Peer Discovery",
        description: "Found 2 peers on your local network",
      });
    }, 1500);
  };

  // Stop peer discovery (mock implementation)
  const stopDiscovery = () => {
    setIsDiscovering(false);
  };

  // Connect to a specific peer (mock implementation)
  const connectToPeer = async (peerId: string): Promise<boolean> => {
    toast({
      title: "Connecting",
      description: `Connecting to peer ${peerId}...`,
    });
    
    // Simulate successful connection
    return new Promise((resolve) => {
      setTimeout(() => {
        toast({
          title: "Connected",
          description: `Successfully connected to peer`,
        });
        resolve(true);
      }, 1000);
    });
  };

  // Disconnect from a peer (mock implementation)
  const disconnectFromPeer = (peerId: string) => {
    toast({
      title: "Disconnected",
      description: `Disconnected from peer ${peerId}`,
    });
  };

  // Send data to a specific peer (mock implementation)
  const sendToPeer = (peerId: string, data: any): boolean => {
    toast({
      title: "Data Sent",
      description: `Sent data to peer ${peerId}`,
    });
    return true;
  };

  // Broadcast data to all connected peers (mock implementation)
  const broadcastToAllPeers = (data: any) => {
    toast({
      title: "Broadcast",
      description: "Data broadcasted to all peers",
    });
  };

  // Create context value
  const contextValue: PeerDiscoveryContextProps = {
    localPeers,
    isDiscovering,
    connectionStatus,
    startDiscovery,
    stopDiscovery,
    connectToPeer,
    disconnectFromPeer,
    sendToPeer,
    broadcastToAllPeers
  };

  return (
    <PeerDiscoveryContext.Provider value={contextValue}>
      {children}
    </PeerDiscoveryContext.Provider>
  );
};

// Create a custom hook to use the context
export const usePeerDiscovery = (): PeerDiscoveryContextProps => {
  const context = useContext(PeerDiscoveryContext);
  if (!context) {
    throw new Error('usePeerDiscovery must be used within a PeerDiscoveryProvider');
  }
  return context;
};