/**
 * Browser-compatible IPFS client implementation
 * This version avoids Node.js module dependencies that cause issues with Vite
 */

import { IPFSStats, PinType } from '@/types';

// Define the core interfaces
interface IPFSHTTPClientInterface {
  add(content: string | Blob | Uint8Array): Promise<{ cid: string, size: number }>;
  cat(cid: string): Promise<Uint8Array>;
  pin: {
    add(cid: string): Promise<void>;
    rm(cid: string): Promise<void>;
    ls(): Promise<string[]>;
  };
  repo: {
    stat(): Promise<IPFSStats>;
  };
  version(): Promise<{ version: string }>;
}

// Client for interacting with IPFS via HTTP (using Infura or other gateways)
export class BrowserIPFSClient implements IPFSHTTPClientInterface {
  private apiUrl: string;
  private headers: Record<string, string>;
  private storage: Storage;
  private pinnedContentsKey = 'ipfs-pinned-contents';
  private statsKey = 'ipfs-stats';
  private ipfsStats: IPFSStats;

  constructor(limitedMode?: boolean | { 
    projectId?: string; 
    projectSecret?: string;
    gateway?: string;
  }) {
    // Check if the first parameter is a boolean (limited mode flag) or a config object
    const config = typeof limitedMode === 'object' ? limitedMode : undefined;
    const isLimitedMode = typeof limitedMode === 'boolean' ? limitedMode : false;
    
    // Default to Infura if credentials are available
    const projectId = config?.projectId || import.meta.env.VITE_INFURA_IPFS_PROJECT_ID;
    const projectSecret = config?.projectSecret || import.meta.env.VITE_INFURA_IPFS_PROJECT_SECRET;
    
    // If we're in limited mode, log a warning
    if (isLimitedMode) {
      console.warn('BrowserIPFSClient running in limited functionality mode');
    }
    
    if (projectId && projectSecret) {
      this.apiUrl = 'https://ipfs.infura.io:5001/api/v0';
      this.headers = {
        'Authorization': `Basic ${btoa(`${projectId}:${projectSecret}`)}`
      };
    } else {
      // Use public gateway if no credentials
      this.apiUrl = config?.gateway || 'https://ipfs.io';
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
  async add(content: string | Blob | Uint8Array): Promise<{ cid: string, size: number }> {
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
            return { 
              cid: result.Hash || cid, 
              size: contentBuffer.length 
            };
          }
        } catch (err) {
          console.warn('Failed to upload to IPFS gateway:', err);
          // Fall back to local storage
        }
      }
      
      return { cid, size: contentBuffer.length };
    } catch (error) {
      console.error('Error adding content to IPFS:', error);
      throw error;
    }
  }

  async cat(cid: string): Promise<Uint8Array> {
    try {
      // Try to get from local storage first
      const localContent = this.storage.getItem(`ipfs-content-${cid}`);
      if (localContent) {
        return new Uint8Array(JSON.parse(localContent));
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
          return new Uint8Array(arrayBuffer);
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

  pin = {
    add: async (cid: string): Promise<void> => {
      try {
        const pinnedContents = this.loadPinnedContents();
        if (!pinnedContents.includes(cid)) {
          pinnedContents.push(cid);
          this.savePinnedContents(pinnedContents);
          
          // Update stats
          this.ipfsStats.pinnedCount = pinnedContents.length;
          this.ipfsStats.numPins = pinnedContents.length;
          this.saveStats();
        }
        
        // Try to pin on Infura as well
        if (this.apiUrl.includes('infura.io')) {
          try {
            const response = await fetch(`${this.apiUrl}/pin/add?arg=${cid}`, {
              method: 'POST',
              headers: this.headers
            });
            
            if (!response.ok) {
              console.warn(`Failed to pin ${cid} on remote IPFS gateway:`, await response.text());
            }
          } catch (err) {
            console.warn(`Failed to pin ${cid} on remote IPFS gateway:`, err);
          }
        }
      } catch (error) {
        console.error(`Error pinning content to IPFS (CID: ${cid}):`, error);
        throw error;
      }
    },
    
    rm: async (cid: string): Promise<void> => {
      try {
        const pinnedContents = this.loadPinnedContents();
        const index = pinnedContents.indexOf(cid);
        
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
            const response = await fetch(`${this.apiUrl}/pin/rm?arg=${cid}`, {
              method: 'POST',
              headers: this.headers
            });
            
            if (!response.ok) {
              console.warn(`Failed to unpin ${cid} from remote IPFS gateway:`, await response.text());
            }
          } catch (err) {
            console.warn(`Failed to unpin ${cid} from remote IPFS gateway:`, err);
          }
        }
      } catch (error) {
        console.error(`Error unpinning content from IPFS (CID: ${cid}):`, error);
        throw error;
      }
    },
    
    ls: async (): Promise<string[]> => {
      return this.loadPinnedContents();
    }
  };

  repo = {
    stat: async (): Promise<IPFSStats> => {
      // Return the stored stats
      return this.ipfsStats;
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

// Create and export the browser-compatible IPFS client
let browserIpfsClient: BrowserIPFSClient | null = null;

export const initBrowserIPFS = async (limitedMode?: boolean): Promise<BrowserIPFSClient> => {
  if (!browserIpfsClient) {
    browserIpfsClient = new BrowserIPFSClient(limitedMode);
    await browserIpfsClient.version(); // Test connection
  }
  return browserIpfsClient;
};

export const getBrowserIPFSClient = (): BrowserIPFSClient | null => {
  return browserIpfsClient;
};

// Helper functions for the BrowserIPFSClient
export const addToBrowserIPFS = async (
  ipfs: BrowserIPFSClient, 
  content: string | Blob
): Promise<string> => {
  const result = await ipfs.add(content);
  return result.cid;
};

export const getFromBrowserIPFS = async (
  ipfs: BrowserIPFSClient, 
  cid: string
): Promise<Uint8Array> => {
  return ipfs.cat(cid);
};

export const pinToBrowserIPFS = async (
  ipfs: BrowserIPFSClient, 
  cid: string
): Promise<void> => {
  await ipfs.pin.add(cid);
};

export const unpinFromBrowserIPFS = async (
  ipfs: BrowserIPFSClient, 
  cid: string
): Promise<void> => {
  await ipfs.pin.rm(cid);
};

export const getPinnedBrowserContent = async (
  ipfs: BrowserIPFSClient
): Promise<string[]> => {
  return ipfs.pin.ls();
};

export const getBrowserIPFSStats = async (
  ipfs: BrowserIPFSClient
): Promise<IPFSStats> => {
  return ipfs.repo.stat();
};