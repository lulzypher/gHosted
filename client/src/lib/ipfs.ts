// Fix for process not defined in browser environment
if (typeof window !== 'undefined' && typeof process === 'undefined') {
  window.process = { env: {} } as any;
}

import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { CID } from 'multiformats/cid';
import { IPFSStats } from '@/types';
import { createMockIPFSClient, MockIPFSClient } from './mockIPFS';
import { 
  initDirectIPFS, 
  addToDirectIPFS, 
  getFromDirectIPFS,
  pinToDirectIPFS,
  unpinFromDirectIPFS,
  getPinnedContent as getDirectPinnedContent,
  getDirectIPFSStats,
  isPCEnvironment,
  generatePairingCode,
  connectToPeer
} from './directIpfs';

// Configure IPFS connection
let ipfs: IPFSHTTPClient | undefined;
let isConnecting = false;
let lastConnectionAttempt = 0;
let usingMockIPFS = false;
let usingDirectIPFS = false;
const RETRY_INTERVAL = 15000; // 15 seconds between retry attempts
const CONNECTION_TIMEOUT = 15000; // 15 seconds timeout

// Initialize IPFS with direct js-ipfs or Infura, with mock as fallback
export const initIPFS = async (): Promise<IPFSHTTPClient> => {
  try {
    // Prevent multiple simultaneous connection attempts and rate limit retries
    const now = Date.now();
    if (isConnecting) {
      console.log('IPFS connection attempt already in progress, returning existing attempt');
      throw new Error('IPFS connection attempt already in progress');
    }
    
    if (now - lastConnectionAttempt < RETRY_INTERVAL) {
      console.log(`Too soon to retry IPFS connection. Wait ${Math.ceil((RETRY_INTERVAL - (now - lastConnectionAttempt))/1000)} seconds`);
      throw new Error('Too soon to retry IPFS connection');
    }
    
    isConnecting = true;
    lastConnectionAttempt = now;
    
    // Check if we've previously decided to use mock IPFS
    if (typeof window !== 'undefined' && window.localStorage && 
        window.localStorage.getItem('use-mock-ipfs') === 'true') {
      console.log('Using mock IPFS implementation from localStorage preference');
      ipfs = createMockIPFSClient() as unknown as IPFSHTTPClient;
      usingMockIPFS = true;
      usingDirectIPFS = false;
      isConnecting = false;
      return ipfs;
    }
    
    console.log('Attempting to connect to IPFS...');
    
    // First try direct js-ipfs implementation (best option for decentralization)
    try {
      console.log('Attempting to initialize direct js-ipfs node...');
      
      // If we're not in a PC environment and we're not explicitly set to always use direct IPFS,
      // we'll try Infura first for mobile devices to save resources
      const isPC = isPCEnvironment();
      const alwaysUseDirect = typeof window !== 'undefined' && window.localStorage && 
                              window.localStorage.getItem('always-use-direct-ipfs') === 'true';
      
      if (isPC || alwaysUseDirect) {
        ipfs = await initDirectIPFS() as unknown as IPFSHTTPClient;
        console.log('Direct IPFS node initialized successfully');
        isConnecting = false;
        usingMockIPFS = false;
        usingDirectIPFS = true;
        
        // Save preference to avoid trying Infura first next time
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('use-direct-ipfs', 'true');
        }
        
        return ipfs;
      } else {
        console.log('On mobile device, will try Infura first and fall back to lightweight js-ipfs');
        throw new Error('Skip direct IPFS on mobile');
      }
    } catch (directError) {
      console.warn('Could not initialize direct js-ipfs node:', directError);
      
      // Try Infura as fallback
      try {
        // For browser compatibility and to avoid CORS issues, let's use Infura directly
        const projectId = import.meta.env.VITE_INFURA_IPFS_PROJECT_ID;
        const projectSecret = import.meta.env.VITE_INFURA_IPFS_PROJECT_SECRET;
        
        if (!projectId || !projectSecret) {
          console.error('Missing IPFS project credentials, trying direct IPFS implementation');
          throw new Error('Missing IPFS project credentials');
        }
        
        // Log that we have credentials (without revealing them)
        console.log('IPFS project credentials found');
        
        // Use browser's btoa instead of Buffer.from for base64 encoding
        const auth = 'Basic ' + btoa(`${projectId}:${projectSecret}`);
        
        console.log('Creating IPFS client with Infura gateway');
        ipfs = create({
          host: 'ipfs.infura.io',
          port: 5001,
          protocol: 'https',
          headers: {
            authorization: auth
          },
          timeout: CONNECTION_TIMEOUT
        });
        
        // Test the connection with a timeout
        console.log('Testing IPFS connection...');
        const testPromise = ipfs.version();
        
        // Add a timeout for the connection test
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('IPFS connection test timed out')), CONNECTION_TIMEOUT);
        });
        
        const version = await Promise.race([testPromise, timeoutPromise]);
        console.log('Connected to IPFS gateway. Version:', version);
        isConnecting = false;
        usingMockIPFS = false;
        usingDirectIPFS = false;
        return ipfs;
      } catch (infuraError) {
        console.warn('Failed to connect to Infura IPFS, trying direct IPFS again (lightweight mode):', infuraError);
        
        // If we're on mobile and Infura fails, try a lightweight js-ipfs configuration
        try {
          ipfs = await initDirectIPFS() as unknown as IPFSHTTPClient;
          console.log('Direct IPFS node initialized successfully (lightweight mode)');
          isConnecting = false;
          usingMockIPFS = false;
          usingDirectIPFS = true;
          
          // Save preference to use direct IPFS
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('use-direct-ipfs', 'true');
          }
          
          return ipfs;
        } catch (directRetryError) {
          console.warn('Failed to initialize direct IPFS in lightweight mode:', directRetryError);
          
          // If everything fails, fall back to mock implementation
          console.log('Creating mock IPFS client as final fallback');
          ipfs = createMockIPFSClient() as unknown as IPFSHTTPClient;
          usingMockIPFS = true;
          usingDirectIPFS = false;
          isConnecting = false;
          
          // Only save mock preference when both direct and Infura fail
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('use-mock-ipfs', 'true');
          }
          
          return ipfs;
        }
      }
    }
  } catch (error) {
    isConnecting = false;
    let errorMessage = 'Unable to connect to IPFS';
    
    if (error instanceof Error) {
      errorMessage += ': ' + error.message;
      console.error('Failed to connect to IPFS:', error.message);
    } else {
      errorMessage += ': Unknown error';
      console.error('Failed to connect to IPFS with unknown error:', error);
    }
    
    // Try to use mock IPFS as last resort
    try {
      console.log('Creating mock IPFS client after connection error');
      ipfs = createMockIPFSClient() as unknown as IPFSHTTPClient;
      usingMockIPFS = true;
      usingDirectIPFS = false;
      return ipfs;
    } catch (mockError) {
      console.error('Failed to create mock IPFS client:', mockError);
      throw new Error(errorMessage);
    }
  }
};

// Check if we're using the mock IPFS implementation
export const isUsingMockIPFS = (): boolean => {
  return usingMockIPFS;
};

// Get the IPFS instance, initializing if needed
export const getIPFS = async (): Promise<IPFSHTTPClient> => {
  if (!ipfs) {
    return initIPFS();
  }
  return ipfs;
};

// Check if we're using the direct IPFS implementation
export const isUsingDirectIPFS = (): boolean => {
  return usingDirectIPFS;
};

// Add content to IPFS
export const addToIPFS = async (content: string | Blob): Promise<string> => {
  try {
    const ipfsInstance = await getIPFS();
    
    // If using direct IPFS implementation, use it directly
    if (usingDirectIPFS) {
      return addToDirectIPFS(ipfsInstance, content);
    }
    
    // Otherwise use the standard IPFS API
    let result;
    if (typeof content === 'string') {
      // Add string content - use TextEncoder for browser compatibility
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      result = await ipfsInstance.add(data);
    } else {
      // Add blob/file content
      result = await ipfsInstance.add(content);
    }
    
    return result.cid.toString();
  } catch (error) {
    console.error('Error adding content to IPFS:', error);
    throw error;
  }
};

// Get content from IPFS by CID
export const getFromIPFS = async (cid: string): Promise<Uint8Array> => {
  try {
    const ipfsInstance = await getIPFS();
    
    // Validate CID
    try {
      CID.parse(cid);
    } catch (e) {
      throw new Error('Invalid CID format');
    }
    
    // If using direct IPFS implementation, use it directly
    if (usingDirectIPFS) {
      return getFromDirectIPFS(ipfsInstance, cid);
    }
    
    // Otherwise use the standard IPFS API
    const chunks = [];
    for await (const chunk of ipfsInstance.cat(cid)) {
      chunks.push(chunk);
    }
    
    // Combine chunks into a single Uint8Array
    const allChunks = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    
    let offset = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, offset);
      offset += chunk.length;
    }
    
    return allChunks;
  } catch (error) {
    console.error(`Error getting content from IPFS (CID: ${cid}):`, error);
    throw error;
  }
};

// Pin content to the local IPFS node
export const pinToIPFS = async (cid: string): Promise<void> => {
  try {
    const ipfsInstance = await getIPFS();
    
    // If using direct IPFS implementation, use it directly
    if (usingDirectIPFS) {
      await pinToDirectIPFS(ipfsInstance, cid);
      return;
    }
    
    // Otherwise use the standard IPFS API
    await ipfsInstance.pin.add(CID.parse(cid));
  } catch (error) {
    console.error(`Error pinning content to IPFS (CID: ${cid}):`, error);
    throw error;
  }
};

// Unpin content from the local IPFS node
export const unpinFromIPFS = async (cid: string): Promise<void> => {
  try {
    const ipfsInstance = await getIPFS();
    
    // If using direct IPFS implementation, use it directly
    if (usingDirectIPFS) {
      await unpinFromDirectIPFS(ipfsInstance, cid);
      return;
    }
    
    // Otherwise use the standard IPFS API
    await ipfsInstance.pin.rm(CID.parse(cid));
  } catch (error) {
    console.error(`Error unpinning content from IPFS (CID: ${cid}):`, error);
    throw error;
  }
};

// Get list of pinned content
export const getPinnedContent = async (): Promise<string[]> => {
  try {
    const ipfsInstance = await getIPFS();
    
    // If using direct IPFS implementation, use it directly
    if (usingDirectIPFS) {
      return getDirectPinnedContent(ipfsInstance);
    }
    
    // Otherwise use the standard IPFS API
    const pins = [];
    
    for await (const pin of ipfsInstance.pin.ls()) {
      pins.push(pin.cid.toString());
    }
    
    return pins;
  } catch (error) {
    console.error('Error getting pinned content from IPFS:', error);
    throw error;
  }
};

// Get IPFS stats (used storage, etc.)
export const getIPFSStats = async (): Promise<IPFSStats> => {
  try {
    const ipfsInstance = await getIPFS();
    
    // If using direct IPFS implementation, use it directly
    if (usingDirectIPFS) {
      return getDirectIPFSStats(ipfsInstance);
    }
    
    // Otherwise use the standard IPFS API
    const repoStats = await ipfsInstance.repo.stat();
    
    // Get pins count
    let pinnedCount = 0;
    for await (const _ of ipfsInstance.pin.ls()) {
      pinnedCount++;
    }
    
    // Check connected peers count if possible
    let peersConnected = 0;
    try {
      const peers = await ipfsInstance.swarm.peers();
      peersConnected = peers.length;
    } catch (e) {
      // Swarm API might not be available in all implementations
      console.warn('Could not get peer count:', e);
    }
    
    return {
      pinnedCount,
      numPins: pinnedCount, // Add numPins alias for pinnedCount for diagnostic tool
      repoSize: parseInt(repoStats.repoSize.toString()),
      totalSize: parseInt(repoStats.repoSize.toString()),
      numObjects: parseInt(repoStats.numObjects.toString()),
      storageMax: parseInt((repoStats.storageMax || '1073741824').toString()),
      allocatedSize: parseInt((repoStats.storageMax || '1073741824').toString()),
      peersConnected, // Now populated from the IPFS swarm
      isConnected: peersConnected > 0,
      lastSync: null // We don't track this in the standard implementation
    };
  } catch (error) {
    console.error('Error getting IPFS stats:', error);
    // Return default stats on error
    return {
      pinnedCount: 0,
      numPins: 0,
      repoSize: 0,
      totalSize: 0,
      numObjects: 0,
      storageMax: 1073741824, // 1GB default
      allocatedSize: 1073741824, // 1GB default
      peersConnected: 0,
      isConnected: false,
      lastSync: null
    };
  }
};

// Generate a pairing QR code for connecting devices
export const generatePairingQRCode = async (): Promise<string> => {
  try {
    const ipfsInstance = await getIPFS();
    
    // Only direct IPFS supports pairing
    if (usingDirectIPFS) {
      return generatePairingCode(ipfsInstance);
    }
    
    throw new Error('Pairing is only supported with direct IPFS implementation');
  } catch (error) {
    console.error('Error generating pairing QR code:', error);
    throw error;
  }
};

// Connect to another peer by ID (for device pairing)
export const connectToPeerById = async (peerId: string): Promise<void> => {
  try {
    const ipfsInstance = await getIPFS();
    
    // Only direct IPFS supports direct peer connections
    if (usingDirectIPFS) {
      return connectToPeer(ipfsInstance, peerId);
    }
    
    throw new Error('Direct peer connections are only supported with direct IPFS implementation');
  } catch (error) {
    console.error(`Error connecting to peer (${peerId}):`, error);
    throw error;
  }
};

// Removed duplicate import that was already added to the import section at the top of the file
