/**
 * Direct IPFS implementation using js-ipfs
 * This implementation runs a light IPFS node directly in the browser
 * and doesn't rely on external services like Infura
 */
// Import Node.js polyfills for browser compatibility
import './polyfills';

import { create as createIpfs } from 'ipfs-core';
import type { IPFSHTTPClient } from 'ipfs-http-client';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';
import { IPFSStats } from '@/types';

// Config for the browser IPFS node
const IPFS_CONFIG = {
  Addresses: {
    Swarm: [
      // Enable WebRTC for direct browser-to-browser connections
      '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
      '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
      // WebSockets transport for browser compatibility
      '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
      // Add more reliable public WebSocket servers
      '/dns4/ws-relay.ipfs.io/tcp/443/wss/p2p-websocket-star'
    ]
  },
  Bootstrap: [
    // Default bootstrap nodes plus any custom ones we want to add
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
  ],
  // More aggressive connection manager to improve connection in browsers
  ConnectionManager: {
    HighWater: 50,       // Allow more connections
    LowWater: 20,        // Keep more connections alive
    GracePeriod: '30s'   // Give more time to connect
  },
  // Improved discovery settings
  Discovery: {
    MDNS: {
      Enabled: true,
      Interval: 10
    },
    webRTCStar: {
      Enabled: true
    }
  },
  // Set up a more browser-friendly pubsub configuration
  Pubsub: {
    Enabled: true,
    Router: 'gossipsub',
    DisableSigning: false
  },
  // Improve reliability with higher timeout values
  Swarm: {
    ConnMgr: {
      GracePeriod: '30s',
      HighWater: 50,
      LowWater: 20
    },
    DisableNatPortMap: true // Since we're in browser environment
  }
};

// Generate a stable node ID based on user's device/browser fingerprint
const getNodeId = (): string => {
  const storageKey = 'gHosted.nodeId';
  let nodeId = null;
  
  if (typeof window !== 'undefined' && window.localStorage) {
    nodeId = window.localStorage.getItem(storageKey);
  }
  
  if (!nodeId) {
    nodeId = `did:ipfs:${uuidv4()}`;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(storageKey, nodeId);
    }
  }
  
  return nodeId;
};

// Track node's connection status
let peerCount = 0;
let connectedToPeers = false;
let lastSync: Date | null = null;

/**
 * Initialize a direct IPFS node in the browser
 */
export const initDirectIPFS = async (): Promise<IPFSHTTPClient> => {
  console.log('Initializing direct browser IPFS node...');
  
  try {
    // Create a repo name that's unique but stable for this user
    const nodeId = getNodeId();
    const repoName = `ghosted-${nodeId.split(':').pop()}`;
    
    // Use a more defensive approach with multiple retries
    let ipfs = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!ipfs && retryCount < maxRetries) {
      try {
        console.log(`IPFS initialization attempt ${retryCount + 1}/${maxRetries}`);
        
        // Initialize the IPFS node with appropriate timeout
        const initPromise = createIpfs({
          repo: repoName,
          config: IPFS_CONFIG,
          EXPERIMENTAL: {
            ipnsPubsub: true
          }
        });
        
        // Add timeout to avoid hanging indefinitely
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('IPFS initialization timeout')), 30000);
        });
        
        // Race the initialization against the timeout
        ipfs = await Promise.race([initPromise, timeoutPromise]) as IPFSHTTPClient;
        
      } catch (initError) {
        console.warn(`IPFS initialization attempt ${retryCount + 1} failed:`, initError);
        retryCount++;
        
        // Wait before trying again (exponential backoff)
        if (retryCount < maxRetries) {
          const backoffTime = Math.min(10000, 1000 * Math.pow(2, retryCount));
          console.log(`Waiting ${backoffTime}ms before retrying...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    if (!ipfs) {
      throw new Error(`Failed to initialize IPFS after ${maxRetries} attempts`);
    }
    
    try {
      // Log node info on startup
      const nodeInfo = await ipfs.id();
      console.log('IPFS node initialized with ID:', nodeInfo.id);
      
      // Try to connect to some bootstrap nodes immediately
      console.log('Connecting to bootstrap nodes...');
      for (const addr of IPFS_CONFIG.Bootstrap) {
        try {
          await ipfs.swarm.connect(addr);
        } catch (connErr) {
          // Just log, don't throw - we can still function without bootstrap
          console.warn(`Failed to connect to bootstrap node ${addr}:`, connErr);
        }
      }
    } catch (infoErr) {
      console.warn('Failed to get IPFS node info:', infoErr);
      // Continue anyway, this is non-critical
    }
    
    // Set up periodic peer counting and connection monitoring
    const peerCheckInterval = setInterval(async () => {
      try {
        const peers = await ipfs.swarm.peers();
        peerCount = peers.length;
        connectedToPeers = peerCount > 0;
        
        // If we have no peers, try connecting to bootstrap nodes again
        if (peerCount === 0) {
          try {
            // Pick a random bootstrap node
            const randomBootstrap = IPFS_CONFIG.Bootstrap[
              Math.floor(Math.random() * IPFS_CONFIG.Bootstrap.length)
            ];
            await ipfs.swarm.connect(randomBootstrap);
            console.log('Reconnected to bootstrap node:', randomBootstrap);
          } catch (reconnectErr) {
            // Just log, don't throw
            console.warn('Failed to reconnect to bootstrap node:', reconnectErr);
          }
        }
      } catch (err) {
        console.error('Error checking peers:', err);
      }
    }, 10000);
    
    // Clean up interval if IPFS node is garbage collected
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        clearInterval(peerCheckInterval);
      });
    }
    
    return ipfs;
  } catch (error) {
    console.error('Failed to initialize direct IPFS node:', error);
    throw error;
  }
};

/**
 * Add content to IPFS network
 */
export const addToDirectIPFS = async (ipfs: IPFSHTTPClient, content: string | Blob): Promise<string> => {
  try {
    let contentBuffer: Uint8Array;

    if (typeof content === 'string') {
      const encoder = new TextEncoder();
      contentBuffer = encoder.encode(content);
    } else if (content instanceof Blob) {
      contentBuffer = new Uint8Array(await content.arrayBuffer());
    } else {
      throw new Error('Unsupported content type');
    }

    const result = await ipfs.add(contentBuffer);
    
    // Pin the content by default to ensure it stays
    await ipfs.pin.add(result.cid);
    
    // Store the last time we added content
    lastSync = new Date();
    
    return result.cid.toString();
  } catch (error) {
    console.error('Error adding content to direct IPFS:', error);
    throw error;
  }
};

/**
 * Get content from IPFS network
 */
export const getFromDirectIPFS = async (ipfs: IPFSHTTPClient, cid: string): Promise<Uint8Array> => {
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
    console.error('Error getting content from direct IPFS:', error);
    throw error;
  }
};

/**
 * Pin content to ensure it stays in the local node
 */
export const pinToDirectIPFS = async (ipfs: IPFSHTTPClient, cid: string): Promise<void> => {
  try {
    await ipfs.pin.add(cid);
  } catch (error) {
    console.error('Error pinning content to direct IPFS:', error);
    throw error;
  }
};

/**
 * Unpin content from the local node
 */
export const unpinFromDirectIPFS = async (ipfs: IPFSHTTPClient, cid: string): Promise<void> => {
  try {
    await ipfs.pin.rm(cid);
  } catch (error) {
    console.error('Error unpinning content from direct IPFS:', error);
    throw error;
  }
};

/**
 * Get list of pinned content
 */
export const getPinnedContent = async (ipfs: IPFSHTTPClient): Promise<string[]> => {
  try {
    const pins = [];
    for await (const pin of ipfs.pin.ls()) {
      pins.push(pin.cid.toString());
    }
    return pins;
  } catch (error) {
    console.error('Error getting pinned content from direct IPFS:', error);
    throw error;
  }
};

/**
 * Get IPFS node stats
 */
export const getDirectIPFSStats = async (ipfs: IPFSHTTPClient): Promise<IPFSStats> => {
  try {
    // Get all pinned content
    const pins = await getPinnedContent(ipfs);
    
    // Get repo stats
    const repoStats = await ipfs.repo.stat();
    
    return {
      numPins: pins.length,
      pinnedCount: pins.length,
      repoSize: Number(repoStats.repoSize),
      numObjects: Number(repoStats.numObjects),
      storageMax: Number(repoStats.storageMax),
      totalSize: Number(repoStats.storageMax),
      allocatedSize: Number(repoStats.storageMax),
      usedSize: Number(repoStats.repoSize),
      peersConnected: peerCount,
      isConnected: connectedToPeers,
      lastSync
    };
  } catch (error) {
    console.error('Error getting stats from direct IPFS:', error);
    return {
      numPins: 0,
      pinnedCount: 0,
      repoSize: 0,
      numObjects: 0,
      storageMax: 1073741824, // 1GB default
      totalSize: 0,
      allocatedSize: 1073741824,
      usedSize: 0,
      peersConnected: 0,
      isConnected: false,
      lastSync: null
    };
  }
};

/**
 * Generate a pairing QR code for connecting PC and mobile
 */
export const generatePairingCode = async (ipfs: IPFSHTTPClient): Promise<string> => {
  try {
    const nodeInfo = await ipfs.id();
    const pairingInfo = {
      id: nodeInfo.id.toString(),
      pubKey: nodeInfo.publicKey,
      type: 'gHosted-pairing'
    };
    
    // Generate QR code as data URL
    const qrCode = await QRCode.toDataURL(JSON.stringify(pairingInfo));
    return qrCode;
  } catch (error) {
    console.error('Error generating pairing code:', error);
    throw error;
  }
};

/**
 * Connect to a peer using its ID (used for device pairing)
 */
export const connectToPeer = async (ipfs: IPFSHTTPClient, peerId: string): Promise<void> => {
  try {
    // Check if peerId is already a multiaddr format
    if (peerId.startsWith('/')) {
      await ipfs.swarm.connect(peerId);
    } else {
      // Convert to multiaddr format if it's just a peer ID
      await ipfs.swarm.connect(`/p2p/${peerId}`);
    }
    console.log('Connected to peer:', peerId);
  } catch (error) {
    console.error('Error connecting to peer:', error);
    throw error;
  }
};

/**
 * Publish content updates to the IPNS name (for cross-device updates)
 */
export const publishUpdate = async (ipfs: IPFSHTTPClient, cid: string): Promise<string> => {
  try {
    const result = await ipfs.name.publish(cid);
    return result.name;
  } catch (error) {
    console.error('Error publishing update:', error);
    throw error;
  }
};

/**
 * Subscribe to updates for a specific name (for cross-device sync)
 */
export const subscribeToUpdates = async (ipfs: IPFSHTTPClient, name: string, callback: (cid: string) => void): Promise<void> => {
  try {
    await ipfs.pubsub.subscribe(name, (msg) => {
      const data = new TextDecoder().decode(msg.data);
      callback(data);
    });
  } catch (error) {
    console.error('Error subscribing to updates:', error);
    throw error;
  }
};

/**
 * Detect if we're in a PC environment vs mobile
 */
export const isPCEnvironment = (): boolean => {
  // A simple detection for demonstration - you might want more robust detection
  const userAgent = navigator.userAgent.toLowerCase();
  return !(
    userAgent.match(/android/i) ||
    userAgent.match(/iphone/i) ||
    userAgent.match(/ipad/i) ||
    userAgent.match(/ipod/i) ||
    userAgent.match(/mobile/i)
  );
};