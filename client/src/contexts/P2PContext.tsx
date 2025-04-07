import { createContext, ReactNode, useContext, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

// Simplified enums and types
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

export enum PeerType {
  BROWSER = 'browser',
  MOBILE = 'mobile',
  PC = 'pc',
  SERVER = 'server'
}

export interface PeerInfo {
  peerId: string;
  name?: string;
  deviceType: PeerType;
  isLocal: boolean;
  isConnected: boolean;
  lastSeen: Date;
}

export interface ConnectionStats {
  totalConnections: number;
  localPeers: number;
  remotePeers: number;
  bandwidth: {
    sent: number;
    received: number;
  };
  pingLatency: number;
}

interface P2PContextType {
  isInitialized: boolean;
  connectionState: ConnectionState;
  peers: PeerInfo[];
  localPeers: PeerInfo[];
  stats: ConnectionStats;
  deviceType: PeerType;
  peerId?: string;
  initializeP2P: () => Promise<boolean>;
  connectToPeer: (peerId: string) => Promise<boolean>;
  disconnectFromPeer: (peerId: string) => Promise<boolean>;
  sendToPeer: (peerId: string, data: any) => Promise<boolean>;
  broadcast: (data: any) => Promise<{success: number, failed: number}>;
}

const P2PContext = createContext<P2PContextType | null>(null);

export function P2PProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [peers] = useState<PeerInfo[]>([]);
  const [localPeers] = useState<PeerInfo[]>([]);
  const [stats] = useState<ConnectionStats>({
    totalConnections: 0,
    localPeers: 0,
    remotePeers: 0,
    bandwidth: {
      sent: 0,
      received: 0,
    },
    pingLatency: 0,
  });
  const [deviceType] = useState<PeerType>(PeerType.BROWSER);
  const [peerId] = useState<string | undefined>("mock-peer-id");

  // Simplified mock implementation that just shows toasts
  const initializeP2P = async (): Promise<boolean> => {
    try {
      if (isInitialized) return true;
      
      setIsInitialized(true);
      setConnectionState(ConnectionState.CONNECTED);
      
      toast({
        title: "P2P Network Connected",
        description: "Your node is now connected to the gHosted network",
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize P2P:', error);
      toast({
        title: "P2P Connection Error",
        description: "Could not connect to P2P network",
        variant: "destructive",
      });
      return false;
    }
  };

  // Mock implementations of P2P methods
  const connectToPeer = async (): Promise<boolean> => {
    toast({
      title: "P2P Connect",
      description: "Connecting to peer...",
    });
    return true;
  };
  
  const disconnectFromPeer = async (): Promise<boolean> => {
    toast({
      title: "P2P Disconnect",
      description: "Disconnecting from peer...",
    });
    return true;
  };
  
  const sendToPeer = async (): Promise<boolean> => {
    toast({
      title: "P2P Send",
      description: "Sending data to peer...",
    });
    return true;
  };
  
  const broadcast = async (): Promise<{success: number, failed: number}> => {
    toast({
      title: "P2P Broadcast",
      description: "Broadcasting data to all peers...",
    });
    return { success: 0, failed: 0 };
  };

  return (
    <P2PContext.Provider
      value={{
        isInitialized,
        connectionState,
        peers,
        localPeers,
        stats,
        deviceType,
        peerId,
        initializeP2P,
        connectToPeer,
        disconnectFromPeer,
        sendToPeer,
        broadcast,
      }}
    >
      {children}
    </P2PContext.Provider>
  );
}

export function useP2P() {
  const context = useContext(P2PContext);
  
  if (!context) {
    throw new Error("useP2P must be used within a P2PProvider");
  }
  
  return context;
}