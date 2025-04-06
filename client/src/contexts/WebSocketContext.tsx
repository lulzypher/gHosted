import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from './UserContext';

interface WebSocketContextProps {
  isConnected: boolean;
  lastActivity: Date | null;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextProps | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

    // Determine WebSocket URL based on current protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // Make sure we use the correct path that matches the server
    const wsUrl = `${protocol}//${host}/api/ws?userId=${user.id}`;
    
    console.log('Attempting to connect to WebSocket at:', wsUrl);
    
    // We'll try to connect directly without checking server health first
    // This makes the application more resilient to temporary server issues
    try {
      ws.current = new WebSocket(wsUrl);

      // Set a timeout for the connection attempt
      const connectionTimeout = setTimeout(() => {
        if (ws.current && ws.current.readyState !== WebSocket.OPEN) {
          console.warn('WebSocket connection timeout');
          ws.current.close();
          setIsConnected(false);
        }
      }, 10000);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        clearTimeout(connectionTimeout);
        setIsConnected(true);
        
        // Clear any reconnect timeouts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = undefined;
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected', event);
        clearTimeout(connectionTimeout);
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

        // Try to reconnect after 5 seconds, with exponential backoff
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
        // Don't show toast for every connection error as it can be annoying
        // Only show for unexpected errors
        if (navigator.onLine) {
          toast({
            variant: 'destructive',
            title: 'Connection Error',
            description: 'WebSocket connection failed. Some real-time updates may not work.'
          });
        }
      };
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          console.log('WebSocket message received:', data);
          
          // Update last activity time whenever we receive any message
          setLastActivity(new Date());

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
            case 'PING':
              // Server ping to keep connection alive, send pong
              if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'PONG' }));
              }
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
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user?.id]);
  
  // Set up a ping interval to keep the connection alive
  useEffect(() => {
    if (!isConnected || !ws.current) return;
    
    // Send a ping every 30 seconds to keep the connection alive
    const pingInterval = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'PING' }));
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
    connectWebSocket();
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, lastActivity, reconnect }}>
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