import React from 'react';
import { Wifi, WifiOff, Loader } from 'lucide-react';
import { NetworkStatus as NetworkStatusEnum } from '@/types';

interface NetworkStatusProps {
  status: NetworkStatusEnum;
  peerCount: number;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({ status, peerCount }) => {
  const getStatusContent = () => {
    switch (status) {
      case NetworkStatusEnum.ONLINE:
        return (
          <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-status-synced text-xs rounded-full">
            <Wifi className="h-3 w-3" />
            <span>Online</span>
          </div>
        );
      case NetworkStatusEnum.OFFLINE:
        return (
          <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-status-error text-xs rounded-full">
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </div>
        );
      case NetworkStatusEnum.CONNECTING:
        return (
          <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-status-syncing text-xs rounded-full">
            <Loader className="h-3 w-3 animate-spin" />
            <span>Connecting</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative group">
      {getStatusContent()}
      <div className="hidden group-hover:block absolute bg-black text-white text-xs p-2 rounded whitespace-nowrap left-0 mt-1 z-50">
        {status === NetworkStatusEnum.ONLINE && `Connected to ${peerCount} peers`}
        {status === NetworkStatusEnum.OFFLINE && 'You are offline. Content can still be created and will sync when you reconnect.'}
        {status === NetworkStatusEnum.CONNECTING && 'Establishing peer connections...'}
      </div>
    </div>
  );
};

export default NetworkStatus;
