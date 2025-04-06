import { useState, useCallback, useEffect } from 'react';
import { addToIPFS, getFromIPFS, pinToIPFS, unpinFromIPFS } from '@/lib/ipfs';
import { useIPFS } from '@/contexts/IPFSContext';

interface UseIPFSContentResult {
  loading: boolean;
  error: string | null;
  addContent: (content: string | Blob) => Promise<string>;
  getContent: (cid: string) => Promise<string | ArrayBuffer | null>;
  pinContent: (cid: string) => Promise<void>;
  unpinContent: (cid: string) => Promise<void>;
}

export const useIPFSContent = (): UseIPFSContentResult => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isIPFSReady } = useIPFS();

  // Reset error when IPFS ready state changes
  useEffect(() => {
    if (isIPFSReady) {
      setError(null);
    }
  }, [isIPFSReady]);

  // Add content to IPFS
  const addContent = useCallback(async (content: string | Blob): Promise<string> => {
    if (!isIPFSReady) {
      throw new Error('IPFS is not ready');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const cid = await addToIPFS(content);
      return cid;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error adding content to IPFS';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isIPFSReady]);

  // Get content from IPFS by CID
  const getContent = useCallback(async (cid: string): Promise<string | ArrayBuffer | null> => {
    if (!isIPFSReady) {
      throw new Error('IPFS is not ready');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getFromIPFS(cid);
      
      // Convert to string or ArrayBuffer based on content type
      // For now, assume text
      const decoder = new TextDecoder();
      return decoder.decode(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error getting content from IPFS';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isIPFSReady]);

  // Manually pin content to IPFS (for debugging/testing)
  const pin = useCallback(async (cid: string): Promise<void> => {
    if (!isIPFSReady) {
      throw new Error('IPFS is not ready');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await pinToIPFS(cid);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error pinning content to IPFS';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isIPFSReady]);

  // Manually unpin content from IPFS (for debugging/testing)
  const unpin = useCallback(async (cid: string): Promise<void> => {
    if (!isIPFSReady) {
      throw new Error('IPFS is not ready');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await unpinFromIPFS(cid);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error unpinning content from IPFS';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isIPFSReady]);

  return {
    loading,
    error,
    addContent,
    getContent,
    pinContent: pin,
    unpinContent: unpin
  };
};
