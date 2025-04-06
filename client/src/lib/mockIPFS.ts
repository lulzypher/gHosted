/**
 * Mock IPFS implementation for browser compatibility
 * This is a simplified version that uses browser storage (IndexedDB) when actual IPFS isn't available
 */

import { v4 as uuidv4 } from 'uuid';
import { IPFSStats } from '@/types';
import { CID } from 'multiformats/cid';

// Mock version of the IPFS HTTP Client
export class MockIPFSClient {
  private dbName = 'mockIPFS';
  private pinStoreKey = 'pins';
  private contentStoreKey = 'contents';
  private statsStoreKey = 'stats';
  private storedContentMap: Map<string, Uint8Array> = new Map();
  private pinnedContent: Set<string> = new Set();
  private stats: IPFSStats = {
    pinnedCount: 0,
    numPins: 0,
    repoSize: 0,
    totalSize: 0,
    numObjects: 0,
    storageMax: 1073741824, // 1GB default limit
    allocatedSize: 1073741824,
    peersConnected: 0
  };

  constructor() {
    console.log('Creating MockIPFSClient');
    this.loadInitialState();
  }

  private async loadInitialState(): Promise<void> {
    try {
      // Load pins
      const pins = await this.getFromStorage(this.pinStoreKey) || [];
      this.pinnedContent = new Set(pins);
      
      // Load stats
      const savedStats = await this.getFromStorage(this.statsStoreKey);
      if (savedStats) {
        this.stats = { ...this.stats, ...savedStats };
      }
      
      this.stats.pinnedCount = this.pinnedContent.size;
      this.stats.numPins = this.pinnedContent.size;
      
      console.log(`MockIPFSClient loaded with ${this.pinnedContent.size} pins`);
    } catch (error) {
      console.error('Error loading initial MockIPFS state:', error);
    }
  }

  private saveStats(): Promise<void> {
    return this.saveToStorage(this.statsStoreKey, this.stats);
  }

  private async saveToStorage(key: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        localStorage.setItem(`mockipfs-${key}`, JSON.stringify(data));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async getFromStorage(key: string): Promise<any> {
    return new Promise((resolve) => {
      try {
        const data = localStorage.getItem(`mockipfs-${key}`);
        resolve(data ? JSON.parse(data) : null);
      } catch (error) {
        console.error(`Error getting ${key} from storage:`, error);
        resolve(null);
      }
    });
  }

  // IPFS Methods
  async version(): Promise<{ version: string }> {
    await new Promise(resolve => setTimeout(resolve, 200)); // Add artificial delay
    return { version: '0.11.0 (mock)' };
  }

  // Add content to IPFS (mock)
  async add(content: string | Uint8Array | Blob): Promise<{ cid: { toString: () => string }, size: number }> {
    try {
      let contentBuffer: Uint8Array;
      
      if (content instanceof Blob) {
        contentBuffer = new Uint8Array(await content.arrayBuffer());
      } else if (typeof content === 'string') {
        const encoder = new TextEncoder();
        contentBuffer = encoder.encode(content);
      } else {
        contentBuffer = content;
      }
      
      // Generate a deterministic CID based on content
      const contentString = Array.from(contentBuffer).join(',');
      const hash = await this.sha256(contentString);
      const cid = `Qm${hash.substring(0, 44)}`;
      
      // Save the content
      this.storedContentMap.set(cid, contentBuffer);
      await this.saveToStorage(`${this.contentStoreKey}-${cid}`, Array.from(contentBuffer));
      
      // Update stats
      this.stats.numObjects += 1;
      this.stats.repoSize += contentBuffer.length;
      this.stats.totalSize += contentBuffer.length;
      await this.saveStats();
      
      console.log(`MockIPFS: Added content with CID ${cid}, size: ${contentBuffer.length} bytes`);
      
      return {
        cid: {
          toString: () => cid
        },
        size: contentBuffer.length
      };
    } catch (error) {
      console.error('Error adding content to MockIPFS:', error);
      throw error;
    }
  }

  // Cat (retrieve) content from IPFS (mock)
  async *cat(cid: string): AsyncGenerator<Uint8Array> {
    try {
      // Artificial delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let content: Uint8Array | null = null;
      
      // Try to get from in-memory map first
      if (this.storedContentMap.has(cid)) {
        content = this.storedContentMap.get(cid)!;
      } else {
        // Try to load from storage
        const storedContent = await this.getFromStorage(`${this.contentStoreKey}-${cid}`);
        if (storedContent) {
          content = new Uint8Array(storedContent);
          // Add to in-memory map for faster future access
          this.storedContentMap.set(cid, content);
        }
      }
      
      if (!content) {
        throw new Error(`Content with CID ${cid} not found`);
      }
      
      // Return the content
      yield content;
    } catch (error) {
      console.error(`Error retrieving content with CID ${cid} from MockIPFS:`, error);
      throw error;
    }
  }

  // Pin management
  pin = {
    add: async (cid: any): Promise<void> => {
      try {
        const cidStr = typeof cid === 'string' ? cid : cid.toString();
        
        if (!this.pinnedContent.has(cidStr)) {
          this.pinnedContent.add(cidStr);
          
          // Update stats
          this.stats.pinnedCount = this.pinnedContent.size;
          this.stats.numPins = this.pinnedContent.size;
          await this.saveStats();
          
          // Save pins to storage
          await this.saveToStorage(this.pinStoreKey, Array.from(this.pinnedContent));
        }
        
        console.log(`MockIPFS: Pinned content with CID ${cidStr}`);
      } catch (error) {
        console.error('Error pinning content in MockIPFS:', error);
        throw error;
      }
    },
    
    rm: async (cid: any): Promise<void> => {
      try {
        const cidStr = typeof cid === 'string' ? cid : cid.toString();
        
        if (this.pinnedContent.has(cidStr)) {
          this.pinnedContent.delete(cidStr);
          
          // Update stats
          this.stats.pinnedCount = this.pinnedContent.size;
          this.stats.numPins = this.pinnedContent.size;
          await this.saveStats();
          
          // Save pins to storage
          await this.saveToStorage(this.pinStoreKey, Array.from(this.pinnedContent));
        }
        
        console.log(`MockIPFS: Unpinned content with CID ${cidStr}`);
      } catch (error) {
        console.error('Error unpinning content in MockIPFS:', error);
        throw error;
      }
    },
    
    ls: async function* (): AsyncGenerator<{ cid: { toString: () => string } }> {
      try {
        for (const pin of this.pinnedContent) {
          yield {
            cid: {
              toString: () => pin
            }
          };
        }
      } catch (error) {
        console.error('Error listing pins in MockIPFS:', error);
        throw error;
      }
    }.bind(this)
  };

  // Repository stats
  repo = {
    stat: async (): Promise<any> => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add artificial delay
      
      return {
        numObjects: this.stats.numObjects,
        repoSize: this.stats.repoSize,
        storageMax: this.stats.storageMax,
        version: '10',
        toString: function() {
          return JSON.stringify(this);
        }
      };
    }
  };

  // Helper for generating SHA256
  private async sha256(message: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }
}

// Create a mock IPFS client
export const createMockIPFSClient = (): MockIPFSClient => {
  console.log('Creating mock IPFS client...');
  return new MockIPFSClient();
};

// Mock stats getter
export const getMockIPFSStats = async (client: MockIPFSClient): Promise<IPFSStats> => {
  const repoStats = await client.repo.stat();
  
  // Get pins count
  let pinnedCount = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const _ of client.pin.ls()) {
    pinnedCount++;
  }
  
  return {
    pinnedCount,
    numPins: pinnedCount,
    repoSize: parseInt(repoStats.repoSize.toString()),
    totalSize: parseInt(repoStats.repoSize.toString()),
    numObjects: parseInt(repoStats.numObjects.toString()),
    storageMax: parseInt((repoStats.storageMax || '1073741824').toString()),
    allocatedSize: parseInt((repoStats.storageMax || '1073741824').toString()),
    peersConnected: 0
  };
};