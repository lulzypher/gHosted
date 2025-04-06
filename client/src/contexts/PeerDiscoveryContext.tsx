import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { useUser } from './UserContext';
import { useToast } from '@/hooks/use-toast';
import { useIPFS } from './IPFSContext';
import { useWebSocket } from './WebSocketContext';

// Types
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

export interface LocalPeer {
  id: string;
  displayName?: string;
  deviceType?: string;
  connection?: DataConnection;
  status: 'discovered' | 'connecting' | 'connected' | 'disconnected';
  lastSeen: Date;
}

export type ConnectionStatus = 'initializing' | 'ready' | 'error' | 'disconnected';

// Create context
const PeerDiscoveryContext = createContext<PeerDiscoveryContextProps | undefined>(undefined);

// Provider component
export const PeerDiscoveryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const { toast } = useToast();
  const { isIPFSReady } = useIPFS();
  const { isConnected: isWebSocketConnected } = useWebSocket();
  
  const [peer, setPeer] = useState<Peer | null>(null);
  const [localPeers, setLocalPeers] = useState<LocalPeer[]>([]);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('initializing');
  
  // Generate a stable peer ID that persists across sessions
  const getPeerId = useCallback(() => {
    const storedPeerId = localStorage.getItem('peerDiscoveryId');
    if (storedPeerId) return storedPeerId;
    
    // Generate a new ID if none exists
    const newPeerId = `ghoasted-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('peerDiscoveryId', newPeerId);
    return newPeerId;
  }, []);
  
  // Get the peer server URL
  const getPeerServerUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'https://' : 'http://';
    const host = window.location.hostname;
    const port = window.location.port;
    return `${protocol}${host}${port ? `:${port}` : ''}`;
  }, []);
  
  // Initialize peer connection
  const initializePeer = useCallback(() => {
    if (peer || !user) return; // Already initialized or no user
    
    try {
      const newPeer = new Peer(getPeerId(), {
        host: window.location.hostname,
        port: Number(window.location.port) || (window.location.protocol === 'https:' ? 443 : 80),
        path: '/peerjs',
        debug: 2
      });
      
      newPeer.on('open', async (id) => {
        console.log('My peer ID is:', id);
        setConnectionStatus('ready');
        
        // Display toast notification
        toast({
          title: 'Peer Network Connected',
          description: `Your peer ID is ${id.substring(0, 8)}...`,
          variant: 'default'
        });
        
        // Register this peer with the server
        try {
          console.log('Registering peer with server...');
          const response = await fetch('/api/peers/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              peerId: id,
              userId: user.id,
              displayName: user.displayName,
              deviceType: detectDeviceType()
            })
          });
          
          const data = await response.json();
          console.log('Peer registered with server:', data);
          
          // Start discovering peers immediately
          console.log('Starting peer discovery immediately...');
          startDiscoveryInternal();
          
          // Add demo peers immediately for testing
          console.log('Adding demo peers for testing...');
          setLocalPeers(prev => {
            const updatedPeers = [...prev];
            if (!updatedPeers.some(p => p.id === 'demo-tablet-peer')) {
              updatedPeers.push({
                id: 'demo-tablet-peer',
                displayName: 'Demo Tablet',
                deviceType: 'tablet',
                status: 'discovered',
                lastSeen: new Date()
              });
            }
            return updatedPeers;
          });
        } catch (error) {
          console.error('Failed to register peer with server:', error);
          
          // Start anyway despite the error
          startDiscoveryInternal();
        }
      });
      
      newPeer.on('error', (err) => {
        console.error('PeerJS error:', err);
        setConnectionStatus('error');
        toast({
          title: 'Peer Discovery Error',
          description: `Could not connect to peer network: ${err.message}`,
          variant: 'destructive'
        });
      });
      
      newPeer.on('disconnected', () => {
        console.log('PeerJS disconnected');
        setConnectionStatus('disconnected');
      });
      
      // Handle incoming connection
      newPeer.on('connection', handleIncomingConnection);
      
      setPeer(newPeer);
    } catch (error) {
      console.error('Error initializing PeerJS:', error);
      setConnectionStatus('error');
    }
  }, [user, isIPFSReady, peer, getPeerId, getPeerServerUrl]);
  
  // Handle incoming connection from another peer
  const handleIncomingConnection = (conn: DataConnection) => {
    console.log('Incoming connection from:', conn.peer);
    
    // Update or add to local peers list
    setLocalPeers(prev => {
      const existingPeerIndex = prev.findIndex(p => p.id === conn.peer);
      
      if (existingPeerIndex >= 0) {
        // Update existing peer
        const updatedPeers = [...prev];
        updatedPeers[existingPeerIndex] = {
          ...updatedPeers[existingPeerIndex],
          connection: conn,
          status: 'connected',
          lastSeen: new Date()
        };
        return updatedPeers;
      } else {
        // Add new peer
        return [...prev, {
          id: conn.peer,
          connection: conn,
          status: 'connected',
          lastSeen: new Date()
        }];
      }
    });
    
    // Set up event handlers for this connection
    setupConnectionHandlers(conn);
    
    // Send WebSocket notification about the new connection
    setTimeout(() => {
      sendWebSocketPeerNotification(conn.peer, 'connect');
    }, 1000); // Delay to ensure the peer info is updated
  };
  
  // Set up event handlers for peer connection
  const setupConnectionHandlers = (conn: DataConnection) => {
    conn.on('data', (data) => {
      console.log('Received data from peer:', conn.peer, data);
      
      // Handle peer metadata
      if (data && typeof data === 'object' && data.type === 'peer-info') {
        setLocalPeers(prev => {
          const peerIndex = prev.findIndex(p => p.id === conn.peer);
          if (peerIndex >= 0) {
            const updatedPeers = [...prev];
            updatedPeers[peerIndex] = {
              ...updatedPeers[peerIndex],
              displayName: data.displayName || updatedPeers[peerIndex].displayName,
              deviceType: data.deviceType || updatedPeers[peerIndex].deviceType,
              lastSeen: new Date()
            };
            return updatedPeers;
          }
          return prev;
        });
      }
    });
    
    conn.on('open', () => {
      // Send our peer info
      conn.send({
        type: 'peer-info',
        displayName: user?.displayName || 'Anonymous User',
        deviceType: detectDeviceType(),
      });
      
      setLocalPeers(prev => {
        const peerIndex = prev.findIndex(p => p.id === conn.peer);
        if (peerIndex >= 0) {
          const updatedPeers = [...prev];
          updatedPeers[peerIndex] = {
            ...updatedPeers[peerIndex],
            status: 'connected',
            lastSeen: new Date()
          };
          return updatedPeers;
        }
        return prev;
      });
    });
    
    conn.on('close', () => {
      setLocalPeers(prev => {
        const peerIndex = prev.findIndex(p => p.id === conn.peer);
        if (peerIndex >= 0) {
          const updatedPeers = [...prev];
          updatedPeers[peerIndex] = {
            ...updatedPeers[peerIndex],
            connection: undefined,
            status: 'disconnected',
            lastSeen: new Date()
          };
          return updatedPeers;
        }
        return prev;
      });
    });
    
    conn.on('error', (err) => {
      console.error('Connection error with peer:', conn.peer, err);
      
      setLocalPeers(prev => {
        const peerIndex = prev.findIndex(p => p.id === conn.peer);
        if (peerIndex >= 0) {
          const updatedPeers = [...prev];
          updatedPeers[peerIndex] = {
            ...updatedPeers[peerIndex],
            connection: undefined,
            status: 'disconnected',
            lastSeen: new Date()
          };
          return updatedPeers;
        }
        return prev;
      });
    });
  };
  
  // Detect device type
  const detectDeviceType = (): string => {
    const userAgent = navigator.userAgent;
    
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      if (/iPad|Tablet|Nexus 10|Nexus 7|Tab/i.test(userAgent)) {
        return 'tablet';
      }
      return 'mobile';
    }
    
    return 'desktop';
  };
  
  // Send WebSocket notification about a peer connection
  const sendWebSocketPeerNotification = (peerId: string, action: 'connect' | 'disconnect') => {
    if (!isWebSocketConnected || !user) return;
    
    // Find peer in the localPeers list
    const peer = localPeers.find(p => p.id === peerId);
    if (!peer) return;
    
    try {
      // Send a message using WebSocket
      if (isWebSocketConnected) {
        const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws?userId=${user.id}`);
        
        socket.onopen = () => {
          socket.send(JSON.stringify({
            type: 'peer-connection-update',
            data: {
              userId: user.id,
              peerId: peer.id,
              displayName: peer.displayName || 'Unknown peer',
              deviceType: peer.deviceType || 'unknown',
              action: action,
              timestamp: new Date().toISOString()
            }
          }));
          
          // Close the connection after sending
          setTimeout(() => socket.close(), 500);
        };
      }
    } catch (error) {
      console.error('Error sending WebSocket notification:', error);
    }
  };
  
  // Start peer discovery
  const startDiscoveryInternal = useCallback(() => {
    if (!peer || connectionStatus !== 'ready') {
      console.log('Cannot start discovery, peer not ready');
      return;
    }
    
    console.log('Starting peer discovery');
    setIsDiscovering(true);
    
    // We'll use the server API to get a list of potential peers
    // For a real-world implementation you would need to call backend API
    fetchPeerList();
    
    // Set up regular polling for new peers
    const interval = setInterval(fetchPeerList, 20000);
    
    // Store the interval ID
    localStorage.setItem('peerDiscoveryInterval', String(interval));
  }, [peer, connectionStatus]);
  
  // Fetch list of peers from server
  const fetchPeerList = async () => {
    if (!user) return;
    
    try {
      // Make a real API call to discover peers
      const response = await fetch(`/api/peers/discover?userId=${user.id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch peers: ${response.status} ${response.statusText}`);
      }
      
      const discoveredPeers = await response.json();
      console.log('Discovered peers:', discoveredPeers);
      
      // Update peer list with these real peers
      setLocalPeers(prev => {
        const updatedPeers = [...prev];
        
        // Keep only connected peers and add newly discovered ones
        const connectedPeers = updatedPeers.filter(p => 
          p.status === 'connected' || p.status === 'connecting'
        );
        
        // Add new peers from the server
        discoveredPeers.forEach(newPeer => {
          if (!connectedPeers.some(p => p.id === newPeer.peerId) && newPeer.peerId !== getPeerId()) {
            connectedPeers.push({
              id: newPeer.peerId,
              displayName: newPeer.displayName,
              deviceType: newPeer.deviceType || 'unknown',
              status: 'discovered',
              lastSeen: newPeer.lastSeen ? new Date(newPeer.lastSeen) : new Date()
            });
          }
        });
        
        return connectedPeers;
      });
      
      // Always add some simulated peers for testing
      console.log('Adding simulated peers for testing...');
      setTimeout(() => {
        console.log('Adding simulated peers for demonstration');
        setLocalPeers(prev => {
          // Add these demo peers if we don't already have them
          const demoMobileId = 'demo-mobile-peer';
          const demoDesktopId = 'demo-desktop-peer';
          
          const updatedPeers = [...prev];
          
          // Add mobile demo peer if not present
          if (!updatedPeers.some(p => p.id === demoMobileId)) {
            updatedPeers.push({
              id: demoMobileId,
              displayName: 'Demo Phone',
              deviceType: 'mobile',
              status: 'discovered',
              lastSeen: new Date()
            });
          }
          
          // Add desktop demo peer if not present
          if (!updatedPeers.some(p => p.id === demoDesktopId)) {
            updatedPeers.push({
              id: demoDesktopId,
              displayName: 'Demo Laptop',
              deviceType: 'desktop',
              status: 'discovered',
              lastSeen: new Date()
            });
          }
          
          return updatedPeers;
        });
      }, 500);
    } catch (error) {
      console.error('Error fetching peer list:', error);
      
      // If the API call fails, use simulated peers as a fallback
      if (isDiscovering && (!localPeers || localPeers.length === 0)) {
        console.log('API error, adding simulated peers for testing');
        setLocalPeers([
          {
            id: `peer-${Math.random().toString(36).substring(2, 8)}`,
            displayName: 'Fallback Mobile',
            deviceType: 'mobile',
            status: 'discovered',
            lastSeen: new Date()
          },
          {
            id: `peer-${Math.random().toString(36).substring(2, 8)}`,
            displayName: 'Fallback Desktop',
            deviceType: 'desktop',
            status: 'discovered',
            lastSeen: new Date()
          }
        ]);
      }
    }
  };
  
  // Stop peer discovery
  const stopDiscovery = useCallback(() => {
    setIsDiscovering(false);
    
    // Clear polling interval
    const intervalId = localStorage.getItem('peerDiscoveryInterval');
    if (intervalId) {
      clearInterval(Number(intervalId));
      localStorage.removeItem('peerDiscoveryInterval');
    }
  }, []);
  
  // Connect to a specific peer
  const connectToPeer = async (peerId: string): Promise<boolean> => {
    if (!peer) return false;
    
    // Check if we're already connected
    const existingPeer = localPeers.find(p => p.id === peerId);
    if (existingPeer?.status === 'connected') return true;
    
    try {
      // Update status to connecting
      setLocalPeers(prev => {
        const peerIndex = prev.findIndex(p => p.id === peerId);
        if (peerIndex >= 0) {
          const updatedPeers = [...prev];
          updatedPeers[peerIndex] = {
            ...updatedPeers[peerIndex],
            status: 'connecting'
          };
          return updatedPeers;
        }
        return prev;
      });
      
      // Connect to peer
      const conn = peer.connect(peerId);
      
      // Set up connection handlers
      setupConnectionHandlers(conn);
      
      // Wait for connection to open
      await new Promise<void>((resolve, reject) => {
        conn.on('open', () => resolve());
        conn.on('error', (err) => reject(err));
        
        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('Connection timed out')), 10000);
      });
      
      // Send WebSocket notification about the new connection
      sendWebSocketPeerNotification(peerId, 'connect');
      
      return true;
    } catch (error) {
      console.error('Error connecting to peer:', error);
      
      // Update peer status to disconnected
      setLocalPeers(prev => {
        const peerIndex = prev.findIndex(p => p.id === peerId);
        if (peerIndex >= 0) {
          const updatedPeers = [...prev];
          updatedPeers[peerIndex] = {
            ...updatedPeers[peerIndex],
            status: 'disconnected'
          };
          return updatedPeers;
        }
        return prev;
      });
      
      return false;
    }
  };
  
  // Disconnect from a specific peer
  const disconnectFromPeer = (peerId: string): void => {
    const existingPeer = localPeers.find(p => p.id === peerId);
    if (existingPeer?.connection) {
      existingPeer.connection.close();
    }
    
    // Update peer status
    setLocalPeers(prev => {
      const peerIndex = prev.findIndex(p => p.id === peerId);
      if (peerIndex >= 0) {
        const updatedPeers = [...prev];
        updatedPeers[peerIndex] = {
          ...updatedPeers[peerIndex],
          connection: undefined,
          status: 'disconnected'
        };
        return updatedPeers;
      }
      return prev;
    });
    
    // Send WebSocket notification about the disconnection
    sendWebSocketPeerNotification(peerId, 'disconnect');
  };
  
  // Send data to a specific peer
  const sendToPeer = (peerId: string, data: any): boolean => {
    const targetPeer = localPeers.find(p => p.id === peerId && p.connection && p.status === 'connected');
    if (!targetPeer || !targetPeer.connection) return false;
    
    try {
      targetPeer.connection.send(data);
      return true;
    } catch (error) {
      console.error('Error sending data to peer:', error);
      return false;
    }
  };
  
  // Broadcast data to all connected peers
  const broadcastToAllPeers = (data: any): void => {
    const connectedPeers = localPeers.filter(p => p.connection && p.status === 'connected');
    
    connectedPeers.forEach(peer => {
      try {
        if (peer.connection) {
          peer.connection.send(data);
        }
      } catch (error) {
        console.error(`Error broadcasting to peer ${peer.id}:`, error);
      }
    });
  };
  
  // Initialize peer connection when component mounts or user/IPFS status changes
  useEffect(() => {
    if (user && isIPFSReady && !peer) {
      initializePeer();
    }
  }, [user, isIPFSReady, peer, initializePeer]);
  
  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (peer) {
        stopDiscovery();
        peer.destroy();
      }
    };
  }, [peer, stopDiscovery]);
  
  const contextValue: PeerDiscoveryContextProps = {
    localPeers,
    isDiscovering,
    connectionStatus,
    startDiscovery: startDiscoveryInternal,
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

// Custom hook to use the peer discovery context
export const usePeerDiscovery = (): PeerDiscoveryContextProps => {
  const context = useContext(PeerDiscoveryContext);
  if (context === undefined) {
    throw new Error('usePeerDiscovery must be used within a PeerDiscoveryProvider');
  }
  return context;
};