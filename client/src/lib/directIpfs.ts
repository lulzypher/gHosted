/**
 * Direct IPFS implementation using js-ipfs
 * This implementation runs a light IPFS node directly in the browser
 * and doesn't rely on external services like Infura
 */
// Fix for process not defined in browser environment
if (typeof window !== 'undefined' && typeof process === 'undefined') {
  window.process = { env: {} } as any;
}

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
      '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'
    ]
  },
  Bootstrap: [
    // Default bootstrap nodes plus any custom ones we want to add
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
  ],
  // More aggressive connection manager to improve connection in browsers
  ConnectionManager: {
    HighWater: 30,
    LowWater: 10
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
    
    // Initialize the IPFS node
    const ipfs = await createIpfs({
      repo: repoName,
      config: IPFS_CONFIG,
      EXPERIMENTAL: {
        ipnsPubsub: true
      }
    });
    
    // Log node info on startup
    const nodeInfo = await ipfs.id();
    console.log('IPFS node initialized with ID:', nodeInfo.id);
    
    // Set up periodic peer counting
    setInterval(async () => {
      try {
        const peers = await ipfs.swarm.peers();
        peerCount = peers.length;
        connectedToPeers = peerCount > 0;
      } catch (err) {
        console.error('Error checking peers:', err);
      }
    }, 10000);
    
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