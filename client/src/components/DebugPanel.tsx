import { useIPFS } from '@/contexts/IPFSContext';
import { useUser } from '@/contexts/UserContext';
import { useEffect, useState } from 'react';

/**
 * This component shows debug information about the current state
 * to help diagnose inconsistencies between browser contexts
 */
export const DebugPanel = () => {
  const { user } = useUser();
  const { ipfs, isIPFSReady, usingMockImplementation, pinnedContents } = useIPFS();
  const [sessionId, setSessionId] = useState<string>('unknown');
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString());
  const [deviceInfo, setDeviceInfo] = useState<string>('unknown');
  const [storageKeys, setStorageKeys] = useState<string[]>([]);
  const [storageValues, setStorageValues] = useState<Record<string, string>>({});
  const [showStorage, setShowStorage] = useState<boolean>(false);
  
  // Helper function to get storage value
  const getStorageValue = (key: string): string => {
    try {
      const storage = window.localStorage as Storage;
      const value = storage.getItem(key);
      if (value && value.length > 30) {
        return value.substring(0, 30) + '...';
      }
      return value || 'null';
    } catch {
      return 'error';
    }
  };
  
  // Generate a unique session ID when the component mounts and collect browser info
  useEffect(() => {
    const id = Math.random().toString(36).substring(2, 15);
    setSessionId(id);
    
    // Get basic browser info
    if (typeof window !== 'undefined') {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const browser = navigator.userAgent.match(/(chrome|firefox|safari|edge|opera)/i)?.[0] || 'unknown';
      setDeviceInfo(`${browser} ${isMobile ? 'Mobile' : 'Desktop'}`);
      
      // Get all localStorage keys to debug what's being stored
      try {
        // Force type to avoid TypeScript errors
        const storage = window.localStorage as Storage;
        const keys = Object.keys(storage || {});
        setStorageKeys(keys);
        
        // Get all values
        const values: Record<string, string> = {};
        keys.forEach(key => {
          values[key] = getStorageValue(key);
        });
        setStorageValues(values);
      } catch (e) {
        console.error("Could not access localStorage", e);
      }
    }
    
    // Update timestamp every second
    const interval = setInterval(() => {
      setTimestamp(new Date().toISOString());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed bottom-2 right-2 p-2 bg-black/80 text-white text-xs rounded-md z-50 max-w-[300px] max-h-[400px] overflow-auto">
      <div className="font-bold mb-1">Debug Info</div>
      <div>Session ID: {sessionId}</div>
      <div>Time: {timestamp}</div>
      <div>Device: {deviceInfo}</div>
      <div>User: {user ? `${user.username} (${user.id})` : 'Not logged in'}</div>
      <div>IPFS Ready: {isIPFSReady ? 'Yes' : 'No'}</div>
      <div>Mock IPFS: {usingMockImplementation ? 'Yes' : 'No'}</div>
      <div>Pinned Items: {pinnedContents.length}</div>
      
      <div className="mt-2">
        <div className="font-bold">Local Storage Keys:</div>
        <div className="text-xs opacity-80">
          {storageKeys.map(key => (
            <div key={key} className="truncate">{key}</div>
          ))}
        </div>
      </div>
      
      <div className="mt-1 text-[10px] opacity-80">
        This panel shows unique info for this browser session to help diagnose inconsistencies
      </div>
    </div>
  );
};