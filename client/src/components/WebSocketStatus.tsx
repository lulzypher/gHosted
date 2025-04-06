import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface WebSocketStatusProps {
  showReconnect?: boolean;
}

export function WebSocketStatus({ showReconnect = true }: WebSocketStatusProps) {
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [reconnecting, setReconnecting] = useState(false);
  
  useEffect(() => {
    // Simulate a WebSocket connection
    setWsStatus('connected');
    setLastUpdated(new Date());
    
    // In a real app, this would come from actual WebSocket events
    const intervalId = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const handleReconnect = () => {
    setReconnecting(true);
    setWsStatus('connecting');
    
    // Simulate a reconnection attempt
    setTimeout(() => {
      setWsStatus('connected');
      setLastUpdated(new Date());
      setReconnecting(false);
    }, 2000);
  };
  
  const formatLastUpdated = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) {
      return `${seconds} sec${seconds !== 1 ? 's' : ''} ago`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  };
  
  return (
    <div className="flex items-center">
      {wsStatus === 'connected' && (
        <CheckCircle2 
          className="h-4 w-4 text-green-500 mr-1.5" 
          aria-hidden="true" 
        />
      )}
      
      {wsStatus === 'connecting' && (
        <RefreshCw 
          className="h-4 w-4 text-amber-500 mr-1.5 animate-spin" 
          aria-hidden="true" 
        />
      )}
      
      {wsStatus === 'disconnected' && (
        <AlertCircle 
          className="h-4 w-4 text-red-500 mr-1.5" 
          aria-hidden="true" 
        />
      )}
      
      <span className="text-xs text-muted-foreground">
        {wsStatus === 'connected' && `Synced ${formatLastUpdated(lastUpdated)}`}
        {wsStatus === 'connecting' && 'Connecting...'}
        {wsStatus === 'disconnected' && 'Disconnected'}
      </span>
      
      {showReconnect && wsStatus !== 'connecting' && (
        <button
          onClick={handleReconnect}
          disabled={reconnecting}
          className="ml-2 text-xs text-primary hover:text-primary/80 disabled:text-muted-foreground disabled:cursor-not-allowed"
        >
          {reconnecting ? (
            <span className="flex items-center">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Reconnecting...
            </span>
          ) : (
            'Reconnect'
          )}
        </button>
      )}
    </div>
  );
}