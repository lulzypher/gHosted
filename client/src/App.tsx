import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ghost, Wifi, WifiOff } from "lucide-react";

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const updateTime = () => setTime(new Date().toLocaleTimeString());
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const interval = setInterval(updateTime, 1000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const testApiConnection = async () => {
    setIsLoading(true);
    setError(null);
    setApiResponse(null);
    
    try {
      const response = await fetch('/api/healthcheck');
      const data = await response.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("API connection error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center mb-6">
            <Ghost className="h-16 w-16 text-primary mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">gHosted - Connectivity Test</h1>
            <p className="text-gray-500 mt-2 text-center">
              Testing basic connectivity to ensure our app can communicate with the server
            </p>
          </div>

          <div className="space-y-4 mt-6">
            <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-md">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="font-medium">Network Status</p>
                <p className={isOnline ? "text-green-600" : "text-red-600"}>
                  {isOnline ? "Browser reports online" : "Browser reports offline"}
                </p>
              </div>
            </div>
            
            <div className="p-2 bg-gray-100 rounded-md">
              <p className="font-medium">Current Time</p>
              <p>{time}</p>
            </div>
            
            {apiResponse && (
              <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                <p className="font-medium text-green-800">API Response</p>
                <pre className="mt-2 text-xs overflow-auto p-2 bg-white rounded border border-green-100">
                  {apiResponse}
                </pre>
              </div>
            )}
            
            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="font-medium text-red-800">Error</p>
                <p className="mt-1 text-red-600">{error}</p>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-2">
          <Button 
            className="w-full" 
            onClick={testApiConnection}
            disabled={isLoading}
          >
            {isLoading ? "Testing..." : "Test API Connection"}
          </Button>
          <p className="text-xs text-center text-gray-500 mt-2">
            Once connectivity is working, we'll restore the full application.
          </p>
        </CardFooter>
      </Card>
      <Toaster />
    </div>
  );
}

export default App;
