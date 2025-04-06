import React, { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { NetworkStatus } from '@/types';
import Header from '@/components/Header';

// This is a placeholder home page that shows our network status functionality
const HomePage: React.FC = () => {
  const { user } = useUser();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineTimestamp, setOfflineTimestamp] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineTimestamp(null);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOfflineTimestamp(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Welcome to gHosted</h1>
          
          {/* Network Status Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Network Status</h2>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Connection Status:</span>
                <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              {!isOnline && offlineTimestamp && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Offline Since:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {offlineTimestamp.toLocaleTimeString()}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Offline Functionality:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {isOnline ? 'Available (will work when offline)' : 'Active'}
                </span>
              </div>
            </div>
            
            {!isOnline && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded text-yellow-800 dark:text-yellow-200 text-sm">
                <p>You are currently offline. gHosted will continue to work, and your content will be synchronized when you reconnect.</p>
              </div>
            )}
          </div>
          
          {/* App Description */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">About gHosted</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              gHosted is a decentralized social media platform that works across all platforms and devices.
              Content is stored using IPFS (InterPlanetary File System) and can be preserved across devices.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center">
                  <span className="mr-2">❤️</span> Heart Reaction 
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Stores and pins content to IPFS on your PC only
                </p>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center">
                  <span className="mr-2">❤️‍🔥</span> Fire Heart Reaction
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Pins content to both PC and mobile devices
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;