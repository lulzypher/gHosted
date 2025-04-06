import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { CID } from 'multiformats/cid';
import { IPFSStats } from '@/types';

// Configure IPFS connection
let ipfs: IPFSHTTPClient | undefined;
let isConnecting = false;
let lastConnectionAttempt = 0;
const RETRY_INTERVAL = 15000; // 15 seconds between retry attempts
const CONNECTION_TIMEOUT = 15000; // 15 seconds timeout

// Initialize IPFS with the local node or Infura gateway
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
    
    console.log('Attempting to connect to IPFS...');
    
    // For browser compatibility and to avoid CORS issues, let's use Infura directly
    const projectId = import.meta.env.VITE_INFURA_IPFS_PROJECT_ID;
    const projectSecret = import.meta.env.VITE_INFURA_IPFS_PROJECT_SECRET;
    
    if (!projectId || !projectSecret) {
      console.error('Missing IPFS project credentials');
      isConnecting = false;
      throw new Error('Missing IPFS project credentials. Please set the environment variables.');
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
    return ipfs;
  } catch (error) {
    isConnecting = false;
    let errorMessage = 'Unable to connect to IPFS';
    
    if (error instanceof Error) {
      errorMessage += ': ' + error.message;
      console.error('Failed to connect to IPFS gateway:', error.message);
    } else {
      errorMessage += ': Unknown error';
      console.error('Failed to connect to IPFS gateway with unknown error:', error);
    }
    
    throw new Error(errorMessage);
  }
};

// Get the IPFS instance, initializing if needed
export const getIPFS = async (): Promise<IPFSHTTPClient> => {
  if (!ipfs) {
    return initIPFS();
  }
  return ipfs;
};

// Add content to IPFS
export const addToIPFS = async (content: string | Blob): Promise<string> => {
  try {
    const ipfsInstance = await getIPFS();
    
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
    const repoStats = await ipfsInstance.repo.stat();
    
    // Get pins count
    let pinnedCount = 0;
    for await (const _ of ipfsInstance.pin.ls()) {
      pinnedCount++;
    }
    
    return {
      pinnedCount,
      numPins: pinnedCount, // Add numPins alias for pinnedCount for diagnostic tool
      repoSize: parseInt(repoStats.repoSize.toString()),
      totalSize: parseInt(repoStats.repoSize.toString()),
      numObjects: parseInt(repoStats.numObjects.toString()),
      storageMax: parseInt((repoStats.storageMax || '1073741824').toString()),
      allocatedSize: parseInt((repoStats.storageMax || '1073741824').toString()),
      peersConnected: 0 // This would need to be populated from the IPFS swarm
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
      peersConnected: 0
    };
  }
};
