import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFoundPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [countdownTime, setCountdownTime] = useState<number>(10);

  // Check if we're offline
  useEffect(() => {
    const isOffline = !navigator.onLine;
    setWasOffline(isOffline);
    
    // If we're offline, start a countdown timer and redirect to home
    // since we might have cached content there
    let interval: ReturnType<typeof setInterval>;
    if (isOffline && countdownTime > 0) {
      interval = setInterval(() => {
        setCountdownTime((prevTime) => {
          const newTime = prevTime - 1;
          if (newTime <= 0) {
            clearInterval(interval);
            setLocation('/');
          }
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [countdownTime, setLocation]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
      
      {wasOffline ? (
        <div className="mb-6 max-w-md">
          <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg mb-4">
            <p>You're currently offline. This page might not be available offline.</p>
            <p className="mt-2">Redirecting to home page in {countdownTime} seconds...</p>
          </div>
          <p>You'll be redirected to the home page where you can view cached content.</p>
        </div>
      ) : (
        <p className="text-gray-500 mb-6 max-w-md">
          The page you're looking for doesn't exist or might have been moved.
        </p>
      )}
      
      <div className="flex flex-wrap gap-4 justify-center">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
        
        <Button
          onClick={() => setLocation('/')}
          className="flex items-center"
        >
          <Home className="mr-2 h-4 w-4" />
          Home Page
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;