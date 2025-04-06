import React from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WifiIcon, WifiOffIcon, ClockIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const WebSocketStatus: React.FC = () => {
  const { isConnected, lastActivity, reconnect } = useWebSocket();
  
  const getLastActivityText = () => {
    if (!lastActivity) return 'No activity yet';
    return `Last activity: ${formatDistanceToNow(lastActivity, { addSuffix: true })}`;
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
        isConnected 
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      )}>
        {isConnected ? (
          <>
            <WifiIcon className="h-3 w-3" />
            <span>Connected</span>
          </>
        ) : (
          <>
            <WifiOffIcon className="h-3 w-3" />
            <span>Disconnected</span>
          </>
        )}
      </div>
      
      {!isConnected && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-xs"
          onClick={reconnect}
        >
          Reconnect
        </Button>
      )}
      
      {isConnected && lastActivity && (
        <div className="relative group">
          <ClockIcon className="h-3 w-3 text-gray-500" />
          <div className="hidden group-hover:block absolute bg-black text-white text-xs p-2 rounded whitespace-nowrap left-0 mt-1 z-50">
            {getLastActivityText()}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSocketStatus;