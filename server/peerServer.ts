import { Server } from "http";
import { ExpressPeerServer } from "peer";
import { Express } from "express";
import { log } from "./vite";

// Map to track connected peers
export const connectedPeers = new Map<string, {
  id: string,
  ip: string,
  lastSeen: Date,
  clientId?: string,
  userId?: number
}>();

export function setupPeerServer(app: Express, server: Server): void {
  // Create PeerJS server
  const peerServer = ExpressPeerServer(server, {
    path: '/peerjs',
    debug: true,
    allow_discovery: true
  });

  // Mount the PeerJS server
  app.use('/peerjs', peerServer);

  // PeerJS server events
  peerServer.on('connection', (client) => {
    const peerId = client.getId();
    const clientIp = client.getToken();
    
    log(`New peer connected: ${peerId} from ${clientIp}`);
    
    // Add to connected peers
    connectedPeers.set(peerId, {
      id: peerId,
      ip: clientIp,
      lastSeen: new Date()
    });
  });

  peerServer.on('disconnect', (client) => {
    const peerId = client.getId();
    log(`Peer disconnected: ${peerId}`);
    
    // Remove from connected peers
    connectedPeers.delete(peerId);
  });

  // Periodically clean up stale connections
  setInterval(() => {
    const now = new Date();
    
    // Remove peers that haven't been seen in 10 minutes
    for (const [peerId, peerInfo] of connectedPeers.entries()) {
      const timeDiff = now.getTime() - peerInfo.lastSeen.getTime();
      
      if (timeDiff > 10 * 60 * 1000) {
        log(`Removing stale peer: ${peerId}`);
        connectedPeers.delete(peerId);
      }
    }
  }, 5 * 60 * 1000); // Run every 5 minutes

  log('PeerJS server initialized and mounted at /peerjs');
}

// Associate a peer with a user ID
export function associatePeerWithUser(peerId: string, userId: number): void {
  const peer = connectedPeers.get(peerId);
  
  if (peer) {
    peer.userId = userId;
    peer.lastSeen = new Date();
    connectedPeers.set(peerId, peer);
    log(`Associated peer ${peerId} with user ID ${userId}`);
  }
}

// Update the last seen time for a peer
export function updatePeerLastSeen(peerId: string): void {
  const peer = connectedPeers.get(peerId);
  
  if (peer) {
    peer.lastSeen = new Date();
    connectedPeers.set(peerId, peer);
  }
}

// Get all peers for a specific user
export function getPeersForUser(userId: number): any[] {
  const userPeers = [];
  
  for (const [_, peerInfo] of connectedPeers.entries()) {
    if (peerInfo.userId === userId) {
      userPeers.push(peerInfo);
    }
  }
  
  return userPeers;
}

// Get all peers on the same local network
export function getPeersOnSameNetwork(clientIp: string): any[] {
  const localPeers = [];
  
  // Get the network portion of the IP (very simple implementation)
  const networkPrefix = clientIp.split('.').slice(0, 3).join('.');
  
  for (const [_, peerInfo] of connectedPeers.entries()) {
    const peerNetworkPrefix = peerInfo.ip.split('.').slice(0, 3).join('.');
    
    if (peerNetworkPrefix === networkPrefix) {
      localPeers.push(peerInfo);
    }
  }
  
  return localPeers;
}