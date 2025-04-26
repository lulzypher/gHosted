import React, { createContext, useState, useEffect, useContext } from 'react';
import { IPFSHTTPClient } from 'ipfs-http-client';
import { initIPFS, getIPFS, getIPFSStats, pinToIPFS, unpinFromIPFS, isUsingMockIPFS } from '@/lib/ipfs';
import { IPFSStats, PinnedContent, PinType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useUser } from './UserContext';
import { apiRequest } from '@/lib/queryClient';

interface IPFSContextProps {
  ipfs: IPFSHTTPClient | null;
  isIPFSReady: boolean;
  ipfsError: string | null;
  stats: IPFSStats;
  pinnedContents: PinnedContent[];
  pinContent: (contentCid: string, postId: number, pinType: PinType, deviceId?: string) => Promise<void>;
  unpinContent: (pinnedId: number, contentCid: string) => Promise<void>;
  refreshPinnedContents: () => Promise<void>;
  isContentPinned: (contentCid: string, pinType?: PinType) => boolean;
  usingMockImplementation: boolean;
}

const IPFSContext = createContext<IPFSContextProps | undefined>(undefined);

export const IPFSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ipfs, setIpfs] = useState<IPFSHTTPClient | null>(null);
  const [isIPFSReady, setIsIPFSReady] = useState<boolean>(false);
  const [ipfsError, setIpfsError] = useState<string | null>(null);
  const [stats, setStats] = useState<IPFSStats>({
    pinnedCount: 0,
    totalSize: 0,
    numPins: 0,
    repoSize: 0,
    numObjects: 0,
    storageMax: 1073741824,
    allocatedSize: 1073741824,
    peersConnected: 0
  });
  const [pinnedContents, setPinnedContents] = useState<PinnedContent[]>([]);
  const [usingMockImplementation, setUsingMockImplementation] = useState<boolean>(false);
  
  const { toast } = useToast();
  const { user, getCurrentDevice } = useUser();

  // Initialize IPFS on component mount
  useEffect(() => {
    let retry = 0;
    const maxRetries = 3;
    
    const init = async () => {
      try {
        console.log('Attempting to initialize IPFS connection...');
        
        const ipfsInstance = await initIPFS();
        setIpfs(ipfsInstance);
        setIsIPFSReady(true);
        setIpfsError(null);
        
        // Check if we're using the mock implementation
        const usingMock = isUsingMockIPFS();
        setUsingMockImplementation(usingMock);
        
        if (usingMock) {
          toast({
            title: "Using Local Storage",
            description: "Connected to local storage for content. Infura IPFS service is not available.",
            duration: 5000,
          });
        }
        
        // Get initial stats
        const initialStats = await getIPFSStats();
        setStats(initialStats);
        
        console.log('IPFS initialized successfully!', usingMock ? '(using mock implementation)' : '');
      } catch (error) {
        retry += 1;
        let errorMessage = 'Failed to initialize IPFS.';
        
        if (error instanceof Error) {
          errorMessage += ' ' + error.message;
          console.error('Error initializing IPFS:', error.message);
        } else {
          console.error('Error initializing IPFS:', error);
        }
        
        setIpfsError(errorMessage);
        
        // Keep trying to connect to real IPFS, don't fall back to mock
        if (retry >= maxRetries) {
          console.error('Max retries reached for IPFS connection');
          setIsIPFSReady(false);
          
          toast({
            variant: "destructive",
            title: "IPFS Connection Failed",
            description: "Could not connect to IPFS service. Some functionality may be limited. Please refresh to try again.",
            duration: 7000,
          });
          
          // Try one more time with real implementation
          try {
            console.log('Making final attempt to connect to IPFS...');
            
            // Ensure we're not using mock implementation
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.removeItem('use-mock-ipfs');
            }
            
            const ipfsInstance = await initIPFS();
            setIpfs(ipfsInstance);
            setIsIPFSReady(true);
            setIpfsError(null);
            
            // Check if we're using the mock implementation despite trying not to
            const usingMock = isUsingMockIPFS();
            setUsingMockImplementation(usingMock);
            
            // Get initial stats
            const initialStats = await getIPFSStats();
            setStats(initialStats);
            
            console.log('IPFS initialized successfully on final attempt!');
          } catch (finalError) {
            console.error('Failed final IPFS connection attempt:', finalError);
            setIsIPFSReady(false);
          }
        } else {
          console.log(`Retrying IPFS connection (${retry}/${maxRetries}) in 5 seconds...`);
          setTimeout(init, 5000);
        }
      }
    };

    init();
  }, [toast]);

  // Fetch user's pinned content when user changes
  useEffect(() => {
    if (user) {
      refreshPinnedContents();
    } else {
      setPinnedContents([]);
    }
  }, [user]);

  // Refresh the pinned contents list
  const refreshPinnedContents = async (): Promise<void> => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/pinned-content`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch pinned content');
      }
      
      const pinnedData = await response.json();
      setPinnedContents(pinnedData);
    } catch (error) {
      console.error('Error fetching pinned content:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load pinned content.",
      });
    }
  };

  // Pin content to IPFS and save to database
  const pinContent = async (contentCid: string, postId: number, pinType: PinType, deviceId?: string): Promise<void> => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to pin content.",
      });
      return;
    }
    
    try {
      // First pin to IPFS
      await pinToIPFS(contentCid);
      
      // If device ID wasn't provided, use current device
      const currentDevice = getCurrentDevice();
      const effectiveDeviceId = deviceId || currentDevice?.deviceId;
      
      // Then save pin info to database
      await apiRequest('POST', '/api/pinned-content', {
        userId: user.id,
        contentCid,
        pinType,
        postId,
        deviceId: effectiveDeviceId
      });
      
      // Refresh pinned contents
      await refreshPinnedContents();
      
      // Update stats
      const updatedStats = await getIPFSStats();
      setStats(updatedStats);
      
      toast({
        title: pinType === PinType.LOVE || pinType === PinType.REMOTE ? "Loved Content" : "Liked Content",
        description: `Content has been pinned to your ${pinType === PinType.LOVE || pinType === PinType.REMOTE ? "devices" : "PC"}.`,
      });
    } catch (error) {
      console.error('Error pinning content:', error);
      toast({
        variant: "destructive",
        title: "Pinning Failed",
        description: error instanceof Error ? error.message : "Failed to pin content.",
      });
    }
  };

  // Unpin content from IPFS and remove from database
  const unpinContent = async (pinnedId: number, contentCid: string): Promise<void> => {
    try {
      // First remove from database
      await apiRequest('DELETE', `/api/pinned-content/${pinnedId}`);
      
      // Then remove from IPFS
      await unpinFromIPFS(contentCid);
      
      // Refresh pinned contents
      await refreshPinnedContents();
      
      // Update stats
      const updatedStats = await getIPFSStats();
      setStats(updatedStats);
      
      toast({
        title: "Content Unpinned",
        description: "Content has been removed from your storage.",
      });
    } catch (error) {
      console.error('Error unpinning content:', error);
      toast({
        variant: "destructive",
        title: "Unpinning Failed",
        description: error instanceof Error ? error.message : "Failed to unpin content.",
      });
    }
  };

  // Check if content is pinned
  const isContentPinned = (contentCid: string, pinType?: PinType): boolean => {
    if (pinType) {
      // Check for specific pin type, with special handling for LOVE and REMOTE which are equivalent
      if (pinType === PinType.LOVE || pinType === PinType.REMOTE) {
        return pinnedContents.some(
          content => content.contentCid === contentCid && 
                    (content.pinType === PinType.REMOTE || content.pinType === PinType.LOVE)
        );
      }
      
      return pinnedContents.some(
        content => content.contentCid === contentCid && content.pinType === pinType
      );
    } else {
      // Check for any pin type
      return pinnedContents.some(
        content => content.contentCid === contentCid
      );
    }
  };

  return (
    <IPFSContext.Provider value={{
      ipfs,
      isIPFSReady,
      ipfsError,
      stats,
      pinnedContents,
      pinContent,
      unpinContent,
      refreshPinnedContents,
      isContentPinned,
      usingMockImplementation
    }}>
      {children}
    </IPFSContext.Provider>
  );
};

export const useIPFS = (): IPFSContextProps => {
  const context = useContext(IPFSContext);
  if (context === undefined) {
    throw new Error('useIPFS must be used within an IPFSProvider');
  }
  return context;
};
