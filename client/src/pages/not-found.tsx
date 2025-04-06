import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AlertCircle, Wifi, WifiOff, Ghost } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const updateTime = () => setTime(new Date().toLocaleTimeString());
    
    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Update time every second
    const interval = setInterval(updateTime, 1000);
    
    // Clean up
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const testFetch = async () => {
    try {
      const response = await fetch('/api/healthcheck');
      console.log('Fetch response:', response.status);
      alert(`API response status: ${response.status}`);
    } catch (error) {
      console.error('Fetch error:', error);
      alert(`Fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center mb-6">
            <Ghost className="h-16 w-16 text-primary mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">gHosted - Debug Page</h1>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-gray-600">
                404 Page Not Found - Original page couldn't be loaded
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500 flex-shrink-0" />
              )}
              <p className="text-sm">
                Network Status: <span className={isOnline ? "text-green-600" : "text-red-600"}>
                  {isOnline ? "Online" : "Offline"}
                </span>
              </p>
            </div>
            
            <div className="text-sm text-gray-600">
              Current Time: {time}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" onClick={testFetch}>
            Test API Connection
          </Button>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Try Home Page
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
