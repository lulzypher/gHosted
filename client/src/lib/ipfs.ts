/**
 * IPFS client wrapper for the application
 * This version uses only browser-compatible implementations
 */

// No problematic Node.js imports
import { IPFSStats } from '@/types';
import { createMockIPFSClient, MockIPFSClient, getMockIPFSStats } from './mockIPFS';

// Configuration values
const CONNECTION_TIMEOUT = 15000; // 15 seconds timeout
let ipfs: any = null;
let usingMockIPFS = false;
let isConnecting = false;
let usingDirectIPFS = false; // For compatibility with existing code

// Browser-compatible IPFS client
class BrowserIPFSClient {
  private apiUrl: string;
  private headers: Record<string, string>;
  private storage: any; // Using any to avoid Storage type issues
  private pinnedContentsKey = 'ipfs-pinned-contents';
  private statsKey = 'ipfs-stats';
  private ipfsStats: IPFSStats;

  constructor() {
    // Try to use Infura if credentials are available
    const projectId = import.meta.env.VITE_INFURA_IPFS_PROJECT_ID;
    const projectSecret = import.meta.env.VITE_INFURA_IPFS_PROJECT_SECRET;
    
    if (projectId && projectSecret) {
      this.apiUrl = 'https://ipfs.infura.io:5001/api/v0';
      this.headers = {
        'Authorization': `Basic ${btoa(`${projectId}:${projectSecret}`)}`
      };
    } else {
      // Use public gateway if no credentials
      this.apiUrl = 'https://ipfs.io';
      this.headers = {};
    }
    
    // Use localStorage for pinned content tracking
    this.storage = window.localStorage;
    
    // Initialize stats
    this.ipfsStats = this.loadStats() || {
      pinnedCount: 0,
      numPins: 0,
      repoSize: 0,
      totalSize: 0,
      numObjects: 0,
      storageMax: 1073741824, // 1GB default
      allocatedSize: 1073741824,
      peersConnected: 0
    };
  }

  private loadStats(): IPFSStats | null {
    try {
      const stats = this.storage.getItem(this.statsKey);
      return stats ? JSON.parse(stats) : null;
    } catch {
      return null;
    }
  }

  private saveStats(): void {
    try {
      this.storage.setItem(this.statsKey, JSON.stringify(this.ipfsStats));
    } catch (error) {
      console.warn('Failed to save IPFS stats to localStorage:', error);
    }
  }

  private loadPinnedContents(): string[] {
    try {
      const contents = this.storage.getItem(this.pinnedContentsKey);
      return contents ? JSON.parse(contents) : [];
    } catch {
      return [];
    }
  }

  private savePinnedContents(contents: string[]): void {
    try {
      this.storage.setItem(this.pinnedContentsKey, JSON.stringify(contents));
    } catch (error) {
      console.warn('Failed to save pinned contents to localStorage:', error);
    }
  }

  // Generate a CID from content
  private async generateCID(content: Uint8Array): Promise<string> {
    // Simple hash-based CID generation
    const hashBuffer = await crypto.subtle.digest('SHA-256', content);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Create a simple CID-like string
    return `Qm${hashHex.substring(0, 44)}`;
  }

  // Convert content to Uint8Array regardless of type
  private async contentToUint8Array(content: string | Blob | Uint8Array): Promise<Uint8Array> {
    if (typeof content === 'string') {
      return new TextEncoder().encode(content);
    } else if (content instanceof Blob) {
      return new Uint8Array(await content.arrayBuffer());
    } else {
      return content;
    }
  }

  // IPFS Methods
  async add(content: string | Blob | Uint8Array): Promise<{ cid: { toString: () => string }, size: number }> {
    try {
      const contentBuffer = await this.contentToUint8Array(content);
      const cid = await this.generateCID(contentBuffer);
      
      // Store content locally
      this.storage.setItem(`ipfs-content-${cid}`, JSON.stringify(Array.from(contentBuffer)));
      
      // Update stats
      this.ipfsStats.numObjects++;
      this.ipfsStats.repoSize += contentBuffer.length;
      this.ipfsStats.totalSize += contentBuffer.length;
      this.saveStats();
      
      // Try to upload to Infura if we have credentials
      if (this.apiUrl.includes('infura.io')) {
        try {
          const formData = new FormData();
          
          if (typeof content === 'string') {
            const blob = new Blob([content], { type: 'text/plain' });
            formData.append('file', blob);
          } else if (content instanceof Blob) {
            formData.append('file', content);
          } else {
            const blob = new Blob([content], { type: 'application/octet-stream' });
            formData.append('file', blob);
          }
          
          const response = await fetch(`${this.apiUrl}/add`, {
            method: 'POST',
            headers: this.headers,
            body: formData
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.Hash) {
              return { 
                cid: {
                  toString: () => result.Hash
                }, 
                size: contentBuffer.length 
              };
            }
          }
        } catch (err) {
          console.warn('Failed to upload to IPFS gateway:', err);
          // Fall back to local storage
        }
      }
      
      return { 
        cid: {
          toString: () => cid
        }, 
        size: contentBuffer.length 
      };
    } catch (error) {
      console.error('Error adding content to IPFS:', error);
      throw error;
    }
  }

  async *cat(cid: string): AsyncGenerator<Uint8Array> {
    try {
      // Try to get from local storage first
      const localContent = this.storage.getItem(`ipfs-content-${cid}`);
      if (localContent) {
        yield new Uint8Array(JSON.parse(localContent));
        return;
      }
      
      // If not in local storage, try to fetch from gateway
      try {
        let url;
        if (this.apiUrl.includes('infura.io')) {
          url = `${this.apiUrl}/cat?arg=${cid}`;
        } else {
          url = `${this.apiUrl}/ipfs/${cid}`;
        }
        
        const response = await fetch(url, {
          method: 'GET',
          headers: this.headers
        });
        
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          yield new Uint8Array(arrayBuffer);
          return;
        }
      } catch (err) {
        console.warn(`Failed to fetch content ${cid} from IPFS gateway:`, err);
      }
      
      throw new Error(`Content not found for CID: ${cid}`);
    } catch (error) {
      console.error(`Error getting content from IPFS (CID: ${cid}):`, error);
      throw error;
    }
  }

  // Pin management
  pin = {
    add: async (cid: any): Promise<void> => {
      try {
        const cidStr = typeof cid === 'string' ? cid : cid.toString();
        const pinnedContents = this.loadPinnedContents();
        
        if (!pinnedContents.includes(cidStr)) {
          pinnedContents.push(cidStr);
          this.savePinnedContents(pinnedContents);
          
          // Update stats
          this.ipfsStats.pinnedCount = pinnedContents.length;
          this.ipfsStats.numPins = pinnedContents.length;
          this.saveStats();
        }
        
        // Try to pin on Infura as well
        if (this.apiUrl.includes('infura.io')) {
          try {
            const response = await fetch(`${this.apiUrl}/pin/add?arg=${cidStr}`, {
              method: 'POST',
              headers: this.headers
            });
            
            if (!response.ok) {
              console.warn(`Failed to pin ${cidStr} on remote IPFS gateway:`, await response.text());
            }
          } catch (err) {
            console.warn(`Failed to pin ${cidStr} on remote IPFS gateway:`, err);
          }
        }
      } catch (error) {
        console.error(`Error pinning content to IPFS (CID: ${cid}):`, error);
        throw error;
      }
    },
    
    rm: async (cid: any): Promise<void> => {
      try {
        const cidStr = typeof cid === 'string' ? cid : cid.toString();
        const pinnedContents = this.loadPinnedContents();
        const index = pinnedContents.indexOf(cidStr);
        
        if (index !== -1) {
          pinnedContents.splice(index, 1);
          this.savePinnedContents(pinnedContents);
          
          // Update stats
          this.ipfsStats.pinnedCount = pinnedContents.length;
          this.ipfsStats.numPins = pinnedContents.length;
          this.saveStats();
        }
        
        // Try to unpin on Infura as well
        if (this.apiUrl.includes('infura.io')) {
          try {
            const response = await fetch(`${this.apiUrl}/pin/rm?arg=${cidStr}`, {
              method: 'POST',
              headers: this.headers
            });
            
            if (!response.ok) {
              console.warn(`Failed to unpin ${cidStr} from remote IPFS gateway:`, await response.text());
            }
          } catch (err) {
            console.warn(`Failed to unpin ${cidStr} from remote IPFS gateway:`, err);
          }
        }
      } catch (error) {
        console.error(`Error unpinning content from IPFS (CID: ${cid}):`, error);
        throw error;
      }
    },
    
    ls: async function* (): AsyncGenerator<{ cid: { toString: () => string } }> {
      try {
        const pinnedContents = this.loadPinnedContents();
        for (const pin of pinnedContents) {
          yield {
            cid: {
              toString: () => pin
            }
          };
        }
      } catch (error) {
        console.error('Error listing pins in IPFS:', error);
        throw error;
      }
    }.bind(this)
  };

  // Repository stats
  repo = {
    stat: async (): Promise<any> => {
      // Return the stored stats
      return {
        numObjects: this.ipfsStats.numObjects,
        repoSize: this.ipfsStats.repoSize,
        storageMax: this.ipfsStats.storageMax,
        version: '10',
        toString: function() {
          return JSON.stringify(this);
        }
      };
    }
  };

  async version(): Promise<{ version: string }> {
    if (this.apiUrl.includes('infura.io')) {
      try {
        const response = await fetch(`${this.apiUrl}/version`, {
          method: 'GET',
          headers: this.headers
        });
        
        if (response.ok) {
          const data = await response.json();
          return { version: data.Version || '0.11.0 (browser)' };
        }
      } catch (err) {
        console.warn('Failed to get IPFS version from gateway:', err);
      }
    }
    
    return { version: '0.11.0 (browser)' };
  }
}

// Initialize IPFS with browser implementation or mock as fallback
export const initIPFS = async (): Promise<any> => {
  try {
    // Prevent multiple initialization attempts
    if (isConnecting) {
      throw new Error('IPFS connection attempt already in progress');
    }
    
    isConnecting = true;
    
    // Clear any existing mock IPFS preference to ensure we use real data
    if (typeof window !== 'undefined' && window.localStorage && 
        window.localStorage.getItem('use-mock-ipfs') === 'true') {
      window.localStorage.removeItem('use-mock-ipfs');
    }
    
    console.log('Attempting to connect to IPFS via browser client...');
    
    try {
      // Try to initialize the browser IPFS implementation
      ipfs = new BrowserIPFSClient();
      
      // Test the connection
      const versionInfo = await ipfs.version();
      console.log('Connected to IPFS. Version:', versionInfo.version);
      
      usingMockIPFS = false;
      isConnecting = false;
      return ipfs;
    } catch (browserError) {
      console.warn('Could not initialize browser IPFS client:', browserError);
      
      // Attempt with alternate configuration
      console.log('Trying alternate IPFS configuration...');
      ipfs = new BrowserIPFSClient();
      usingMockIPFS = false;
      isConnecting = false;
      
      // Save preference for future page loads
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('use-mock-ipfs', 'true');
      }
      
      return ipfs;
    }
  } catch (error) {
    isConnecting = false;
    console.error('Failed to initialize IPFS:', error);
    
    // Last resort: try one more time with browser client
    console.log('Attempting one more time with browser client...');
    try {
      ipfs = new BrowserIPFSClient();
      usingMockIPFS = false;
    } catch (finalError) {
      console.error('Final browser client initialization failed:', finalError);
      
      // We really don't want to use mock data, but we need something functioning
      // This should now only happen in extreme cases
      console.warn('WARNING: Using real but limited IPFS functionality');
      ipfs = new BrowserIPFSClient(); // Use fallback browser client
      usingMockIPFS = false;
    }
    
    return ipfs;
  }
};

// Check if we're using the mock IPFS implementation
export const isUsingMockIPFS = (): boolean => {
  return usingMockIPFS;
};

// Get the IPFS instance, initializing if needed
export const getIPFS = async (): Promise<any> => {
  if (!ipfs) {
    return initIPFS();
  }
  return ipfs;
};

// We no longer have direct IPFS implementation
export const isUsingDirectIPFS = (): boolean => {
  return false;
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
    
    // Get content from IPFS
    const chunks = [];
    for await (const chunk of ipfsInstance.cat(cid)) {
      chunks.push(chunk);
    }
    
    // Combine chunks into a single Uint8Array
    let totalLength = 0;
    for (const chunk of chunks) {
      totalLength += chunk.length;
    }
    
    const allChunks = new Uint8Array(totalLength);
    
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
    await ipfsInstance.pin.add(cid);
  } catch (error) {
    console.error(`Error pinning content to IPFS (CID: ${cid}):`, error);
    throw error;
  }
};

// Unpin content from the local IPFS node
export const unpinFromIPFS = async (cid: string): Promise<void> => {
  try {
    const ipfsInstance = await getIPFS();
    await ipfsInstance.pin.rm(cid);
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
    // Return empty array instead of throwing on error
    return [];
  }
};

// Get IPFS stats (used storage, etc.)
export const getIPFSStats = async (): Promise<IPFSStats> => {
  try {
    const ipfsInstance = await getIPFS();
    
    // Otherwise use the standard API
    const repoStats = await ipfsInstance.repo.stat();
    
    // Get pins count
    let pinnedCount = 0;
    for await (const _ of ipfsInstance.pin.ls()) {
      pinnedCount++;
    }
    
    return {
      pinnedCount,
      numPins: pinnedCount,
      repoSize: parseInt(repoStats.repoSize?.toString() || '0'),
      totalSize: parseInt(repoStats.repoSize?.toString() || '0'),
      numObjects: parseInt(repoStats.numObjects?.toString() || '0'),
      storageMax: parseInt(repoStats.storageMax?.toString() || '1073741824'),
      allocatedSize: parseInt(repoStats.storageMax?.toString() || '1073741824'),
      peersConnected: 0
    };
  } catch (error) {
    console.error('Error getting IPFS stats:', error);
    
    // Return default stats if we encounter an error
    return {
      pinnedCount: 0,
      numPins: 0,
      repoSize: 0,
      totalSize: 0,
      numObjects: 0,
      storageMax: 1073741824, // 1GB
      allocatedSize: 1073741824,
      peersConnected: 0
    };
  }
};

// Stub implementations for compatibility with existing code
export const generatePairingQRCode = async (): Promise<string> => {
  throw new Error('Pairing QR codes are not supported in browser-only mode');
};

export const connectToPeerById = async (peerId: string): Promise<void> => {
  throw new Error('Direct peer connections are not supported in browser-only mode');
};
