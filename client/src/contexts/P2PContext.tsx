import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { p2pConnector, PeerInfo, ConnectionState, ConnectionStats, PeerType } from '@/lib/p2pConnector';
import { useToast } from '@/hooks/use-toast';

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
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [localPeers, setLocalPeers] = useState<PeerInfo[]>([]);
  const [stats, setStats] = useState<ConnectionStats>({
    totalConnections: 0,
    localPeers: 0,
    remotePeers: 0,
    bandwidth: {
      sent: 0,
      received: 0,
    },
    pingLatency: 0,
  });
  const [deviceType, setDeviceType] = useState<PeerType>(PeerType.BROWSER);
  const [peerId, setPeerId] = useState<string | undefined>(undefined);

  // Initialize P2P connector
  const initializeP2P = async (): Promise<boolean> => {
    try {
      if (isInitialized) return true;
      
      const success = await p2pConnector.initialize();
      
      if (success) {
        setIsInitialized(true);
        setPeerId(p2pConnector.getThisPeerId());
        setDeviceType(p2pConnector.getThisDeviceType());
        
        toast({
          title: "P2P Network Connected",
          description: "Your node is now connected to the gHosted network",
        });
      } else {
        toast({
          title: "P2P Connection Failed",
          description: "Could not connect to the gHosted network. Try again later.",
          variant: "destructive",
        });
      }
      
      return success;
    } catch (error) {
      console.error('Failed to initialize P2P:', error);
      toast({
        title: "P2P Connection Error",
        description: `Error: ${(error as Error).message}`,
        variant: "destructive",
      });
      return false;
    }
  };

  // Set up event listeners for P2P connector
  useEffect(() => {
    if (!isInitialized) return;
    
    // Connection state changes
    const handleStateChange = (state: ConnectionState, error?: Error) => {
      setConnectionState(state);
      
      if (state === ConnectionState.ERROR && error) {
        toast({
          title: "Connection Error",
          description: error.message,
          variant: "destructive",
        });
      }
    };
    
    // New peer discovered
    const handlePeerDiscovered = (peer: PeerInfo) => {
      toast({
        title: "New Peer Discovered",
        description: `Found ${peer.name || 'Unknown peer'} on the network`,
      });
      
      // Update peers list
      setPeers(p2pConnector.getPeers());
      setLocalPeers(p2pConnector.getLocalPeers());
    };
    
    // Peer connected
    const handlePeerConnected = (peer: PeerInfo) => {
      toast({
        title: "Peer Connected",
        description: `Connected to ${peer.name || peer.peerId.substring(0, 8)}`,
      });
      
      // Update peers list
      setPeers(p2pConnector.getPeers());
      setLocalPeers(p2pConnector.getLocalPeers());
    };
    
    // Peer disconnected
    const handlePeerDisconnected = (peer: PeerInfo) => {
      // Update peers list
      setPeers(p2pConnector.getPeers());
      setLocalPeers(p2pConnector.getLocalPeers());
    };
    
    // Peer update
    const handlePeerUpdated = (peer: PeerInfo) => {
      // Update peers list
      setPeers(p2pConnector.getPeers());
      setLocalPeers(p2pConnector.getLocalPeers());
    };
    
    // Peer error
    const handlePeerError = (peer: PeerInfo, error: Error) => {
      toast({
        title: "Peer Connection Error",
        description: `Error with ${peer.name || peer.peerId.substring(0, 8)}: ${error.message}`,
        variant: "destructive",
      });
      
      // Update peers list
      setPeers(p2pConnector.getPeers());
      setLocalPeers(p2pConnector.getLocalPeers());
    };
    
    // Stats update
    const handleStatsUpdate = (newStats: ConnectionStats) => {
      setStats(newStats);
    };
    
    // Data received
    const handleDataReceived = (peerId: string, data: any) => {
      console.log(`Data received from ${peerId}:`, data);
      // Handle received data (would dispatch to appropriate handlers)
    };
    
    // Register event listeners
    p2pConnector.on('state', handleStateChange);
    p2pConnector.on('peer:discovered', handlePeerDiscovered);
    p2pConnector.on('peer:connected', handlePeerConnected);
    p2pConnector.on('peer:disconnected', handlePeerDisconnected);
    p2pConnector.on('peer:updated', handlePeerUpdated);
    p2pConnector.on('peer:error', handlePeerError);
    p2pConnector.on('stats', handleStatsUpdate);
    p2pConnector.on('data:received', handleDataReceived);
    
    // Clean up event listeners
    return () => {
      p2pConnector.removeListener('state', handleStateChange);
      p2pConnector.removeListener('peer:discovered', handlePeerDiscovered);
      p2pConnector.removeListener('peer:connected', handlePeerConnected);
      p2pConnector.removeListener('peer:disconnected', handlePeerDisconnected);
      p2pConnector.removeListener('peer:updated', handlePeerUpdated);
      p2pConnector.removeListener('peer:error', handlePeerError);
      p2pConnector.removeListener('stats', handleStatsUpdate);
      p2pConnector.removeListener('data:received', handleDataReceived);
    };
  }, [isInitialized, toast]);

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
        connectToPeer: p2pConnector.connectToPeer.bind(p2pConnector),
        disconnectFromPeer: p2pConnector.disconnectFromPeer.bind(p2pConnector),
        sendToPeer: p2pConnector.sendToPeer.bind(p2pConnector),
        broadcast: p2pConnector.broadcast.bind(p2pConnector),
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