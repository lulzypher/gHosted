import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { LocalPeer } from '@/components/LocalPeers';
import { WebSocket as WSType } from 'ws';

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

// Create a provider component
export const PeerDiscoveryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [localPeers, setLocalPeers] = useState<LocalPeer[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('initializing');
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Initialize WebSocket connection and peer discovery
  useEffect(() => {
    if (!user) return;

    // Initialize WebSocket connection for signaling server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    
    const newSocket = new WebSocket(wsUrl);
    
    newSocket.onopen = () => {
      console.log('WebSocket connection established');
      setConnectionStatus('ready');
      
      // Register client with signaling server
      const registerMessage = {
        type: 'register',
        userId: user.id,
        deviceType: detectDeviceType(),
        deviceName: navigator.platform
      };
      
      newSocket.send(JSON.stringify(registerMessage));
    };
    
    newSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
    };
    
    newSocket.onclose = () => {
      console.log('WebSocket connection closed');
      setConnectionStatus('disconnected');
    };
    
    setSocket(newSocket);
    
    // Clean up WebSocket on unmount
    return () => {
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        newSocket.close();
      }
    };
  }, [user]);

  // Handle incoming socket messages
  const handleSocketMessage = (message: any) => {
    switch (message.type) {
      case 'peers':
        // Update our list of discovered peers
        const receivedPeers = message.peers.map((peer: any) => ({
          id: peer.id,
          displayName: peer.deviceName,
          deviceType: peer.deviceType,
          status: 'discovered',
          lastSeen: new Date(peer.lastSeen)
        }));
        setLocalPeers(receivedPeers);
        setIsDiscovering(false);
        break;
        
      case 'peerConnected':
        // Update when a peer connects to the network
        setLocalPeers(prevPeers => {
          const peerIndex = prevPeers.findIndex(p => p.id === message.peerId);
          if (peerIndex >= 0) {
            const updatedPeers = [...prevPeers];
            updatedPeers[peerIndex] = {
              ...updatedPeers[peerIndex],
              status: 'discovered',
              lastSeen: new Date()
            };
            return updatedPeers;
          } else {
            // Add new peer if not in the list
            return [...prevPeers, {
              id: message.peerId,
              displayName: message.deviceName,
              deviceType: message.deviceType,
              status: 'discovered',
              lastSeen: new Date()
            }];
          }
        });
        break;
        
      case 'peerDisconnected':
        // Update when a peer disconnects from the network
        setLocalPeers(prevPeers => 
          prevPeers.filter(peer => peer.id !== message.peerId)
        );
        break;
        
      case 'error':
        console.error('Received error from signaling server:', message.error);
        break;
      
      default:
        console.log('Unhandled message type:', message.type);
    }
  };

  // Detect the device type (simplified)
  const detectDeviceType = (): 'pc' | 'mobile' | 'server' => {
    const userAgent = navigator.userAgent;
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      return 'mobile';
    }
    return 'pc';
  };

  // Start discovering peers on the local network
  const startDiscovery = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }
    
    setIsDiscovering(true);
    
    // Request peer list from signaling server
    const discoverMessage = {
      type: 'discover',
      userId: user?.id
    };
    
    socket.send(JSON.stringify(discoverMessage));
    
    // For development purposes, add mock peers if we're in development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        const mockPeers: LocalPeer[] = [
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
        ];
        
        setLocalPeers(mockPeers);
        setIsDiscovering(false);
      }, 1500);
    }
  };

  // Stop peer discovery
  const stopDiscovery = () => {
    setIsDiscovering(false);
  };

  // Connect to a specific peer
  const connectToPeer = async (peerId: string): Promise<boolean> => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }
    
    // Update UI immediately to show connecting status
    setLocalPeers(prevPeers => 
      prevPeers.map(peer => 
        peer.id === peerId 
          ? { ...peer, status: 'connecting' } 
          : peer
      )
    );
    
    // Send connection request to signaling server
    const connectMessage = {
      type: 'connect',
      targetPeerId: peerId,
      userId: user?.id
    };
    
    socket.send(JSON.stringify(connectMessage));
    
    // For development, simulate connection success after delay
    if (process.env.NODE_ENV === 'development') {
      return new Promise((resolve) => {
        setTimeout(() => {
          setLocalPeers(prevPeers => 
            prevPeers.map(peer => 
              peer.id === peerId 
                ? { ...peer, status: 'connected' } 
                : peer
            )
          );
          resolve(true);
        }, 2000);
      });
    }
    
    // In production, return a promise that resolves when the connection is established
    return new Promise((resolve) => {
      // Set up a one-time listener for connection success
      const connectListener = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'connectSuccess' && message.peerId === peerId) {
            socket?.removeEventListener('message', connectListener);
            
            setLocalPeers(prevPeers => 
              prevPeers.map(peer => 
                peer.id === peerId 
                  ? { ...peer, status: 'connected' } 
                  : peer
              )
            );
            
            resolve(true);
          } else if (message.type === 'connectError' && message.peerId === peerId) {
            socket?.removeEventListener('message', connectListener);
            
            setLocalPeers(prevPeers => 
              prevPeers.map(peer => 
                peer.id === peerId 
                  ? { ...peer, status: 'discovered' } 
                  : peer
              )
            );
            
            resolve(false);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      socket.addEventListener('message', connectListener);
      
      // Set a timeout for connection
      setTimeout(() => {
        socket?.removeEventListener('message', connectListener);
        
        setLocalPeers(prevPeers => 
          prevPeers.map(peer => 
            peer.id === peerId && peer.status === 'connecting'
              ? { ...peer, status: 'discovered' } 
              : peer
          )
        );
        
        resolve(false);
      }, 10000); // 10 second timeout
    });
  };

  // Disconnect from a peer
  const disconnectFromPeer = (peerId: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }
    
    // Update UI immediately to show disconnecting
    setLocalPeers(prevPeers => 
      prevPeers.map(peer => 
        peer.id === peerId 
          ? { ...peer, status: 'disconnected' } 
          : peer
      )
    );
    
    // Send disconnect message to signaling server
    const disconnectMessage = {
      type: 'disconnect',
      targetPeerId: peerId,
      userId: user?.id
    };
    
    socket.send(JSON.stringify(disconnectMessage));
    
    // For development, simulate disconnection after delay
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        setLocalPeers(prevPeers => 
          prevPeers.map(peer => 
            peer.id === peerId 
              ? { ...peer, status: 'discovered' } 
              : peer
          )
        );
      }, 1000);
    }
  };

  // Send data to a specific peer
  const sendToPeer = (peerId: string, data: any): boolean => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }
    
    // Find peer in connected peers
    const peer = localPeers.find(p => p.id === peerId && p.status === 'connected');
    if (!peer) {
      console.error('Peer not found or not connected:', peerId);
      return false;
    }
    
    // Send data message to signaling server
    const dataMessage = {
      type: 'data',
      targetPeerId: peerId,
      userId: user?.id,
      data
    };
    
    socket.send(JSON.stringify(dataMessage));
    return true;
  };

  // Broadcast data to all connected peers
  const broadcastToAllPeers = (data: any) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }
    
    // Get all connected peers
    const connectedPeers = localPeers.filter(peer => peer.status === 'connected');
    
    // If no connected peers, do nothing
    if (connectedPeers.length === 0) {
      return;
    }
    
    // Send broadcast message to signaling server
    const broadcastMessage = {
      type: 'broadcast',
      userId: user?.id,
      data
    };
    
    socket.send(JSON.stringify(broadcastMessage));
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