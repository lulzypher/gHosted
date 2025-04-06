import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { CID } from 'multiformats/cid';
import { IPFSStats } from '@/types';

// Configure IPFS connection
let ipfs: IPFSHTTPClient | undefined;

// Initialize IPFS with the local node or Infura gateway
export const initIPFS = async (): Promise<IPFSHTTPClient> => {
  try {
    console.log('Attempting to connect to IPFS...');
    
    // For browser compatibility and to avoid CORS issues, let's use Infura directly
    const projectId = import.meta.env.VITE_INFURA_IPFS_PROJECT_ID || 'anonymous';  // Default to anonymous access
    const projectSecret = import.meta.env.VITE_INFURA_IPFS_PROJECT_SECRET || 'anonymous';
    
    // Use browser's btoa instead of Buffer.from for base64 encoding
    const auth = 'Basic ' + btoa(`${projectId}:${projectSecret}`);
    
    console.log('Creating IPFS client with Infura gateway');
    ipfs = create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
      headers: {
        authorization: auth
      }
    });
    
    // Test the connection
    console.log('Testing IPFS connection...');
    const version = await ipfs.version();
    console.log('Connected to IPFS gateway. Version:', version);
    return ipfs;
  } catch (error) {
    console.error('Failed to connect to IPFS gateway:', error);
    throw new Error('Unable to connect to IPFS: ' + (error instanceof Error ? error.message : String(error)));
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
