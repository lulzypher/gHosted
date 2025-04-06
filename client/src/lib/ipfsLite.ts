/**
 * Lightweight IPFS client implementation for browsers
 * This version avoids dependencies on Node.js modules like node:os
 */
import './polyfills';
import { IPFSStats } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Simple mock for IPFS client in browser environments
// This is used when the full IPFS client fails to initialize
export class IPFSLiteClient {
  private repoName: string;
  private localData: Map<string, Uint8Array> = new Map();
  private pinnedContent: Set<string> = new Set();
  private peerId: string;
  private isConnected: boolean = false;
  private lastSync: Date | null = null;

  constructor(repoName?: string) {
    this.peerId = `lite-${uuidv4()}`;
    this.repoName = repoName || `ghosted-lite-${this.peerId}`;
    console.log('Initialized lightweight IPFS client with ID:', this.peerId);
    
    // Attempt to retrieve stored data from localStorage
    this.loadStoredData();
    
    // Simulate connection status changing
    setInterval(() => {
      this.isConnected = Math.random() > 0.2; // 80% chance of being connected
    }, 30000);
  }

  private loadStoredData() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Load pins
        const pinsKey = `${this.repoName}.pins`;
        const storedPins = window.localStorage.getItem(pinsKey);
        if (storedPins) {
          const pins = JSON.parse(storedPins);
          pins.forEach((pin: string) => this.pinnedContent.add(pin));
        }
        
        // Load content index (just the CIDs, not the actual data)
        const indexKey = `${this.repoName}.index`;
        const storedIndex = window.localStorage.getItem(indexKey);
        if (storedIndex) {
          const index = JSON.parse(storedIndex);
          index.forEach((cid: string) => {
            const contentKey = `${this.repoName}.content.${cid}`;
            const content = window.localStorage.getItem(contentKey);
            if (content) {
              // Convert base64 string back to Uint8Array
              const binaryString = atob(content);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              this.localData.set(cid, bytes);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading stored IPFS data:', error);
    }
  }

  private saveStoredData() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Save pins
        const pinsKey = `${this.repoName}.pins`;
        window.localStorage.setItem(pinsKey, JSON.stringify(Array.from(this.pinnedContent)));
        
        // Save content index
        const indexKey = `${this.repoName}.index`;
        window.localStorage.setItem(indexKey, JSON.stringify(Array.from(this.localData.keys())));
        
        // Save individual content items
        this.localData.forEach((data, cid) => {
          // Convert Uint8Array to base64 string for storage
          let binary = '';
          const bytes = new Uint8Array(data);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          
          const contentKey = `${this.repoName}.content.${cid}`;
          window.localStorage.setItem(contentKey, base64);
        });
      }
    } catch (error) {
      console.error('Error saving IPFS data:', error);
    }
  }

  // IPFS API compatible methods
  
  async id() {
    return {
      id: this.peerId,
      publicKey: `pubkey-${this.peerId}`,
      addresses: [],
      protocols: [],
      agentVersion: 'ipfs-lite/1.0.0',
      protocolVersion: '1.0.0'
    };
  }

  async add(content: string | Uint8Array | Blob): Promise<{ cid: { toString: () => string }, size: number }> {
    let contentBuffer: Uint8Array;
    
    if (typeof content === 'string') {
      contentBuffer = new TextEncoder().encode(content);
    } else if (content instanceof Blob) {
      contentBuffer = new Uint8Array(await content.arrayBuffer());
    } else {
      contentBuffer = content;
    }
    
    // Generate a simple CID-like identifier
    const cid = `lite-${uuidv4()}`;
    
    // Store the content
    this.localData.set(cid, contentBuffer);
    
    // Update last sync time
    this.lastSync = new Date();
    
    // Save to localStorage
    this.saveStoredData();
    
    return {
      cid: {
        toString: () => cid
      },
      size: contentBuffer.length
    };
  }

  async *cat(cid: string): AsyncGenerator<Uint8Array> {
    const content = this.localData.get(cid);
    if (!content) {
      throw new Error(`Content not found: ${cid}`);
    }
    
    yield content;
  }

  pin = {
    add: async (cid: any): Promise<void> => {
      const cidStr = typeof cid === 'string' ? cid : cid.toString();
      this.pinnedContent.add(cidStr);
      this.saveStoredData();
    },
    
    rm: async (cid: any): Promise<void> => {
      const cidStr = typeof cid === 'string' ? cid : cid.toString();
      this.pinnedContent.delete(cidStr);
      this.saveStoredData();
    },
    
    ls: async function* () {
      for (const cid of this.pinnedContent) {
        yield {
          cid: {
            toString: () => cid
          },
          type: 'recursive'
        };
      }
    }.bind(this)
  };

  repo = {
    stat: async (): Promise<any> => {
      // Calculate total size of stored data
      let totalSize = 0;
      for (const data of this.localData.values()) {
        totalSize += data.length;
      }
      
      return {
        numObjects: this.localData.size,
        repoSize: totalSize,
        repoPath: this.repoName,
        version: '1',
        storageMax: 100 * 1024 * 1024 // 100MB
      };
    }
  };

  swarm = {
    peers: async () => {
      // Simulate peers
      return this.isConnected ? [{ peer: `peer-${uuidv4().slice(0, 8)}` }] : [];
    },
    
    connect: async (addr: string) => {
      console.log(`Simulating connection to peer: ${addr}`);
      this.isConnected = true;
      return true;
    }
  };

  name = {
    publish: async (cid: string) => {
      return {
        name: this.peerId,
        value: cid
      };
    }
  };

  pubsub = {
    subscribe: async (topic: string, callback: (msg: any) => void) => {
      console.log(`Subscribed to topic: ${topic}`);
      // No real pubsub functionality in this lite version
    }
  };
}

// Helper functions compatible with the directIpfs.ts API
export const initLiteIPFS = async (): Promise<any> => {
  console.log('Initializing lite IPFS client...');
  const nodeId = Math.random().toString(36).substring(2, 15);
  const repoName = `ghosted-lite-${nodeId}`;
  
  try {
    return new IPFSLiteClient(repoName);
  } catch (error) {
    console.error('Failed to initialize lite IPFS client:', error);
    throw error;
  }
};

export const addToLiteIPFS = async (ipfs: any, content: string | Blob): Promise<string> => {
  try {
    const result = await ipfs.add(content);
    await ipfs.pin.add(result.cid);
    return result.cid.toString();
  } catch (error) {
    console.error('Error adding content to lite IPFS:', error);
    throw error;
  }
};

export const getFromLiteIPFS = async (ipfs: any, cid: string): Promise<Uint8Array> => {
  try {
    const chunks = [];
    for await (const chunk of ipfs.cat(cid)) {
      chunks.push(chunk);
    }

    // Combine chunks into a single Uint8Array
    let totalLength = 0;
    for (const chunk of chunks) {
      totalLength += chunk.length;
    }

    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  } catch (error) {
    console.error('Error getting content from lite IPFS:', error);
    throw error;
  }
};

export const pinToLiteIPFS = async (ipfs: any, cid: string): Promise<void> => {
  try {
    await ipfs.pin.add(cid);
  } catch (error) {
    console.error('Error pinning content to lite IPFS:', error);
    throw error;
  }
};

export const unpinFromLiteIPFS = async (ipfs: any, cid: string): Promise<void> => {
  try {
    await ipfs.pin.rm(cid);
  } catch (error) {
    console.error('Error unpinning content from lite IPFS:', error);
    throw error;
  }
};

export const getPinnedLiteContent = async (ipfs: any): Promise<string[]> => {
  try {
    const pins = [];
    for await (const pin of ipfs.pin.ls()) {
      pins.push(pin.cid.toString());
    }
    return pins;
  } catch (error) {
    console.error('Error getting pinned content from lite IPFS:', error);
    return [];
  }
};

export const getLiteIPFSStats = async (ipfs: any): Promise<IPFSStats> => {
  try {
    // Get all pinned content
    const pins = await getPinnedLiteContent(ipfs);
    
    // Get repo stats
    const repoStats = await ipfs.repo.stat();
    
    // Get peers
    const peers = await ipfs.swarm.peers();
    
    return {
      numPins: pins.length,
      pinnedCount: pins.length,
      repoSize: Number(repoStats.repoSize),
      numObjects: Number(repoStats.numObjects),
      storageMax: Number(repoStats.storageMax),
      totalSize: Number(repoStats.storageMax),
      allocatedSize: Number(repoStats.storageMax),
      usedSize: Number(repoStats.repoSize),
      peersConnected: peers.length,
      isConnected: peers.length > 0,
      lastSync: null
    };
  } catch (error) {
    console.error('Error getting stats from lite IPFS:', error);
    return {
      numPins: 0,
      pinnedCount: 0,
      repoSize: 0,
      numObjects: 0,
      storageMax: 100 * 1024 * 1024, // 100MB
      totalSize: 0,
      allocatedSize: 100 * 1024 * 1024,
      usedSize: 0,
      peersConnected: 0,
      isConnected: false,
      lastSync: null
    };
  }
};