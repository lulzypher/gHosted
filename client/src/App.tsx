import React, { useState, useEffect, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Redirect } from 'wouter';
import { Toaster } from '@/components/ui/toaster';

// Import contexts
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { UserProvider } from '@/contexts/UserContext';
import { IPFSProvider } from '@/contexts/IPFSContext';
import { OrbitDBProvider } from '@/contexts/OrbitDBContext';
import { PeerDiscoveryProvider } from '@/contexts/PeerDiscoveryContext';

// Import components
import WebSocketStatus from '@/components/WebSocketStatus';
import { NetworkStatus as NetworkStatusEnum } from '@/types';
import NetworkStatus from '@/components/NetworkStatus';

// Import pages
import LoginPage from '@/pages/login';
import RegisterPage from '@/pages/register';
import NotFoundPage from '@/pages/not-found';

// Import query client
import { queryClient } from '@/lib/queryClient';

// Lazy load heavier components
const HomePage = React.lazy(() => import('@/pages/home'));
const ProfilePage = React.lazy(() => import('@/pages/profile'));

// Simple loading component
const Loading = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading gHosted...</p>
    </div>
  </div>
);

// Simple error boundary
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("App error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen flex-col p-4">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
          <p className="mb-6 text-gray-700">
            We're experiencing technical difficulties with the P2P components.
          </p>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </button>
          <button 
            className="px-4 py-2 mt-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
            onClick={() => window.location.href = '/login'}
          >
            Go to Login
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatusEnum>(
    navigator.onLine ? NetworkStatusEnum.ONLINE : NetworkStatusEnum.OFFLINE
  );
  const [peerCount, setPeerCount] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Try to determine if app is ready
  useEffect(() => {
    // Simple check to see if basic services are accessible
    const checkAppReady = async () => {
      try {
        const response = await fetch('/api/healthcheck');
        if (response.ok) {
          console.log('Server is healthy');
          setIsLoaded(true);
        } else {
          console.warn('Server health check failed');
        }
      } catch (error) {
        console.error('Could not connect to server', error);
      }
    };
    
    checkAppReady();
    
    // Set a fallback timer to show the app anyway after 3 seconds
    const timer = setTimeout(() => {
      if (!isLoaded) {
        console.log('Forcing app to load after timeout');
        setIsLoaded(true);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [isLoaded]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkStatus(NetworkStatusEnum.ONLINE);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkStatus(NetworkStatusEnum.OFFLINE);
    };

    // Simulate peer connections for demo
    const interval = setInterval(() => {
      if (isOnline) {
        // Random number between 1 and 5 for demo
        setPeerCount(Math.floor(Math.random() * 5) + 1);
      } else {
        setPeerCount(0);
      }
    }, 10000);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  // Show loading state when app is not yet loaded
  if (!isLoaded) {
    return <Loading />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <WebSocketProvider>
            <IPFSProvider>
              <OrbitDBProvider>
                <PeerDiscoveryProvider>
                <div className="min-h-screen flex flex-col">
                  {/* Status Bar */}
                  <div className="bg-gray-100 dark:bg-gray-800 py-1 px-4 flex justify-end items-center text-sm border-b">
                    <div className="flex space-x-4 items-center">
                      <NetworkStatus status={networkStatus} peerCount={peerCount} />
                      <WebSocketStatus />
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1">
                    <Suspense fallback={<Loading />}>
                      <Switch>
                        <Route path="/" component={HomePage} />
                        <Route path="/login" component={LoginPage} />
                        <Route path="/register" component={RegisterPage} />
                        <Route path="/profile/:id?" component={ProfilePage} />
                        <Route component={NotFoundPage} />
                      </Switch>
                    </Suspense>
                  </div>

                  {/* Footer */}
                  <footer className="bg-gray-100 dark:bg-gray-800 py-4 border-t text-center text-sm text-gray-600 dark:text-gray-400">
                    <p>gHosted - Decentralized Social Media {new Date().getFullYear()}</p>
                    <p className="text-xs mt-1">Powered by IPFS and OrbitDB</p>
                  </footer>

                  {/* Toast notifications */}
                  <Toaster />
                </div>
                </PeerDiscoveryProvider>
              </OrbitDBProvider>
            </IPFSProvider>
          </WebSocketProvider>
        </UserProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
