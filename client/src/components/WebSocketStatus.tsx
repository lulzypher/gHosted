import React from 'react';
import { Cable, Clock, WifiOff, RefreshCw } from 'lucide-react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Button } from '@/components/ui/button';

interface WebSocketStatusProps {
  showReconnect?: boolean;
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ showReconnect = false }) => {
  const { isConnected, lastActivity, reconnect } = useWebSocket();

  // Format the last activity time
  const formatLastActivity = () => {
    if (!lastActivity) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastActivity.getTime();
    
    // If less than a minute, show seconds
    if (diff < 60000) {
      const seconds = Math.floor(diff / 1000);
      return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    }
    
    // If less than an hour, show minutes
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    
    // Otherwise show hours
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  };

  return (
    <div className="relative group">
      <div className="flex items-center space-x-2">
        {isConnected ? (
          <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-status-synced text-xs rounded-full">
            <Cable className="h-3 w-3" />
            <span>Connected</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-status-error text-xs rounded-full">
            <WifiOff className="h-3 w-3" />
            <span>Disconnected</span>
          </div>
        )}
        
        {showReconnect && !isConnected && (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-6 text-xs px-2 py-0"
            onClick={() => reconnect()}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reconnect
          </Button>
        )}
      </div>
      
      <div className="hidden group-hover:block absolute bg-black text-white text-xs p-2 rounded whitespace-nowrap left-0 mt-1 z-50">
        {isConnected ? (
          <div className="flex items-center">
            <span>Real-time updates active</span>
            {lastActivity && (
              <div className="flex items-center ml-2 text-gray-300">
                <Clock className="h-3 w-3 mr-1" />
                <span>Last activity: {formatLastActivity()}</span>
              </div>
            )}
          </div>
        ) : (
          <span>Real-time updates disabled. You may miss new content. Use the diagnostic tool to check your connection.</span>
        )}
      </div>
    </div>
  );
};

export default WebSocketStatus;