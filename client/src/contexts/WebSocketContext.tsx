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
      ws.current.close();
    }

    // Determine WebSocket URL based on current protocol (check if window is defined for SSR compatibility)
    const protocol = (typeof window !== 'undefined' && window.location.protocol === 'https:') ? 'wss:' : 'ws:';
    const host = (typeof window !== 'undefined') ? window.location.host : 'localhost:5000';
    const wsUrl = `${protocol}//${host}/api/ws?userId=${user.id}`;

    // Create new WebSocket connection
    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        // Clear any reconnect timeouts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = undefined;
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected', event);
        setIsConnected(false);

        // Try to reconnect after 5 seconds
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = undefined;
            connectWebSocket();
          }, 5000);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          variant: 'destructive',
          title: 'Connection Error',
          description: 'WebSocket connection failed. Some real-time updates may not work.'
        });
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