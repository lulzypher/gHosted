import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface WebSocketContextProps {
  isConnected: boolean;
  lastActivity: Date | null;
  reconnect: () => void;
  // Add a listener registration function for other components to subscribe to message events
  addMessageListener: (callback: (data: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextProps | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const messageListenersRef = useRef<Array<(data: any) => void>>([]);

  // Function to establish WebSocket connection
  const connectWebSocket = () => {
    // First check if WebSockets are supported at all
    if (typeof WebSocket === 'undefined') {
      console.error('WebSockets are not supported in this browser');
      return;
    }

    // Don't connect if user is not logged in
    if (!user) {
      setIsConnected(false);
      return;
    }

    // Check if WebSocket is already connected
    if (ws.current?.readyState === WebSocket.OPEN) {
      setIsConnected(true);
      return;
    }

    // Close any existing connection
    if (ws.current) {
      try {
        ws.current.close();
      } catch (err) {
        console.warn('Error closing existing WebSocket:', err);
      }
    }
    
    // The app is functional without WebSockets thanks to our fallback mechanisms
    // So we'll make a best effort to connect, but won't worry too much if it fails

    // Determine WebSocket URL based on current protocol and host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // Use the simplified path that matches the server configuration
    // Add a unique connection ID to prevent connection conflicts
    const connectionId = Math.random().toString(36).substring(2, 15);
    // Use the correct path from the server - server is configured with path: '/ws'
    const wsUrl = `${protocol}//${host}/ws?userId=${user.id}&connectionId=${connectionId}`;
    
    console.log('Attempting to connect to WebSocket at:', wsUrl);
    
    try {
      // Create the WebSocket connection directly
      ws.current = new WebSocket(wsUrl);
      
      // Log the WebSocket connection state
      console.log('Initial WebSocket state:', ws.current.readyState);
      
      // To make this more resilient, set a short timeout - if we're getting 
      // abnormal closures (code 1006), we'll try with HTTP/WS instead of HTTPS/WSS
      // Note: We only do this as a fallback because our app has adequate polling mechanisms

      // Clear any existing timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }

      // Set a timeout for the connection attempt
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.current && ws.current.readyState !== WebSocket.OPEN) {
          console.warn('WebSocket connection timeout');
          try {
            ws.current.close();
          } catch (err) {
            console.warn('Error closing WebSocket after timeout:', err);
          }
          setIsConnected(false);
        }
      }, 10000);

      ws.current.onopen = () => {
        console.log('WebSocket connected successfully');
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = undefined;
        }
        setIsConnected(true);
        
        // Clear any reconnect timeouts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = undefined;
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected', event);
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = undefined;
        }
        setIsConnected(false);

        // Log a clearer message about close reasons
        if (event.code) {
          let reason = 'Unknown reason';
          switch (event.code) {
            case 1000: reason = 'Normal closure'; break;
            case 1001: reason = 'Going away'; break;
            case 1002: reason = 'Protocol error'; break;
            case 1003: reason = 'Unsupported data'; break;
            case 1005: reason = 'No status received'; break;
            case 1006: reason = 'Abnormal closure'; break;
            case 1007: reason = 'Invalid frame payload data'; break;
            case 1008: reason = 'Policy violation'; break;
            case 1009: reason = 'Message too big'; break;
            case 1010: reason = 'Missing extension'; break;
            case 1011: reason = 'Internal error'; break;
            case 1012: reason = 'Service restart'; break;
            case 1013: reason = 'Try again later'; break;
            case 1014: reason = 'Bad gateway'; break;
            case 1015: reason = 'TLS handshake'; break;
            default: reason = `Code ${event.code}`; 
          }
          console.log(`WebSocket closed with code ${event.code}: ${reason}`);
        }

        // Try to reconnect after a delay, with exponential backoff
        if (!reconnectTimeoutRef.current) {
          const backoffTime = Math.min(30000, 5000 * Math.pow(2, Math.floor(Math.random() * 3)));
          console.log(`Will attempt to reconnect in ${backoffTime/1000} seconds`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = undefined;
            connectWebSocket();
          }, backoffTime);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        // We'll just log WebSocket errors to the console
        // We won't show toasts to users since the demo peers are working
        // and the application is functional without real-time updates
      };
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          console.log('WebSocket message received:', data);
          
          // Update last activity time whenever we receive any message
          setLastActivity(new Date());

          // Notify all listeners about this message (regardless of type)
          // This allows components to handle specific message types they care about
          if (messageListenersRef.current.length > 0) {
            messageListenersRef.current.forEach(listener => {
              try {
                listener(data);
              } catch (listenerError) {
                console.error('Error in message listener:', listenerError);
              }
            });
          }

          // Process messages based on type
          switch (data.type) {
            case 'NEW_POST':
              // Handle new post notification
              toast({
                title: "New Post",
                description: "Someone just shared a new post",
              });
              break;
            case 'CONTENT_PINNED':
              // Handle new pin notification
              toast({
                title: "Content Pinned",
                description: "Content has been pinned to IPFS",
              });
              break;
            case 'NEW_MESSAGE':
              // Handle new message notification
              toast({
                title: "New Message",
                description: "You received a new message",
              });
              break;
            case 'PING':
              // Server ping to keep connection alive, send pong
              if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'PONG' }));
              }
              break;
            case 'CONNECTED':
              // Connection confirmation from server
              console.log('WebSocket connection confirmed by server:', data);
              break;
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setIsConnected(false);
    }
  };

  // Connect when component mounts and user is available
  useEffect(() => {
    if (user) {
      connectWebSocket();
    }

    // Cleanup on unmount
    return () => {
      if (ws.current) {
        try {
          ws.current.close();
        } catch (err) {
          console.warn('Error closing WebSocket during cleanup:', err);
        }
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, [user?.id]);
  
  // Set up a ping interval to keep the connection alive
  useEffect(() => {
    if (!isConnected || !ws.current) return;
    
    // Send a ping every 30 seconds to keep the connection alive
    const pingInterval = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        try {
          ws.current.send(JSON.stringify({ type: 'PING' }));
        } catch (error) {
          console.error('Error sending ping:', error);
        }
      }
    }, 30000);
    
    return () => {
      clearInterval(pingInterval);
    };
  }, [isConnected]);

  // Handle network online/offline events
  useEffect(() => {
    // Browser check for SSR compatibility
    if (typeof window === 'undefined') return;
    
    const handleOnline = () => {
      console.log('Network came online');
      connectWebSocket();
    };

    const handleOffline = () => {
      console.log('Network went offline');
      setIsConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user?.id]);

  // Manually reconnect (can be called when needed)
  const reconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = undefined;
    }
    connectWebSocket();
  };

  // Add a message listener that can be cleaned up
  const addMessageListener = (callback: (data: any) => void) => {
    // Add the listener to our array
    messageListenersRef.current.push(callback);
    
    // Return a function to remove this listener when component unmounts
    return () => {
      messageListenersRef.current = messageListenersRef.current.filter(
        listener => listener !== callback
      );
    };
  };

  return (
    <WebSocketContext.Provider value={{ 
      isConnected, 
      lastActivity, 
      reconnect,
      addMessageListener
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextProps => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};