/**
 * Local DNS Resolution Module
 * 
 * This module handles local DNS resolution for gHosted.u domains,
 * allowing users to access content through human-readable names
 * without requiring a centralized DNS server.
 */

import { localStore } from './localStore';

// Type definitions for local DNS resolution
interface DNSEntry {
  domain: string;
  ipfsHash: string;
  nodeId?: string;
  lastUpdated: number;
  expiresAt: number;
  ttl: number;
  isLocal: boolean;
}

// Main local DNS class
class LocalDNSResolver {
  private dnsCache: Map<string, DNSEntry> = new Map();
  private rootDomain = 'ghosted.u';
  private ipfsGatewayPort = 8080;
  private ipfsApiPort = 5001;
  
  constructor() {
    this.loadCacheFromStorage();
  }
  
  /**
   * Load cached DNS entries from storage
   */
  private async loadCacheFromStorage() {
    try {
      const cachedEntries = localStorage.getItem('dns_cache');
      
      if (cachedEntries) {
        const entries = JSON.parse(cachedEntries) as DNSEntry[];
        
        // Filter out expired entries
        const now = Date.now();
        const validEntries = entries.filter(entry => entry.expiresAt > now);
        
        // Add valid entries to cache
        validEntries.forEach(entry => {
          this.dnsCache.set(entry.domain, entry);
        });
        
        console.log(`Loaded ${validEntries.length} DNS entries from cache`);
      }
    } catch (error) {
      console.error('Failed to load DNS cache from storage:', error);
    }
  }
  
  /**
   * Save DNS cache to storage
   */
  private saveCacheToStorage() {
    try {
      const entries = Array.from(this.dnsCache.values());
      localStorage.setItem('dns_cache', JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save DNS cache to storage:', error);
    }
  }
  
  /**
   * Resolve a domain to an IPFS hash
   */
  async resolve(domain: string): Promise<string | null> {
    // Check if this is a gHosted.u domain
    if (!domain.endsWith(this.rootDomain) && domain !== this.rootDomain) {
      return null;
    }
    
    // Check cache first
    const cachedEntry = this.dnsCache.get(domain);
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      return cachedEntry.ipfsHash;
    }
    
    // If this is the root domain, return the root IPFS hash
    if (domain === this.rootDomain) {
      return this.resolveRootDomain();
    }
    
    // Otherwise, resolve the subdomain
    return this.resolveSubdomain(domain);
  }
  
  /**
   * Resolve the root gHosted.u domain
   */
  private async resolveRootDomain(): Promise<string | null> {
    // In a real implementation, this would:
    // 1. Fetch from local IPFS node if available
    // 2. Try to resolve from connected peers
    // 3. Fall back to a list of well-known hashes for the root domain
    
    // For now, we'll return a fixed IPFS hash for the root domain
    const rootHash = 'QmRootDomainHash123456789';
    
    // Cache the result
    this.addToCache(this.rootDomain, rootHash, 3600, true);
    
    return rootHash;
  }
  
  /**
   * Resolve a subdomain (e.g., user.ghosted.u)
   */
  private async resolveSubdomain(domain: string): Promise<string | null> {
    // Extract the subdomain part
    const subdomain = domain.split('.')[0];
    
    // In a real implementation, this would:
    // 1. Look up the subdomain in the DHT
    // 2. Try to resolve from connected peers
    // 3. Fall back to a list of previously seen nodes
    
    // For now, we'll simulate a lookup based on the subdomain
    const generatedHash = `QmSubdomain${subdomain}Hash${Math.floor(Math.random() * 1000)}`;
    
    // Cache the result with a shorter TTL for subdomains
    this.addToCache(domain, generatedHash, 1800, false);
    
    return generatedHash;
  }
  
  /**
   * Add a DNS entry to the cache
   */
  addToCache(domain: string, ipfsHash: string, ttl: number, isLocal: boolean): void {
    const now = Date.now();
    
    const entry: DNSEntry = {
      domain,
      ipfsHash,
      lastUpdated: now,
      expiresAt: now + (ttl * 1000),
      ttl,
      isLocal,
    };
    
    this.dnsCache.set(domain, entry);
    this.saveCacheToStorage();
  }
  
  /**
   * Register a local subdomain mapping
   */
  async registerSubdomain(subdomain: string, ipfsHash: string, nodeId?: string): Promise<boolean> {
    const domain = `${subdomain}.${this.rootDomain}`;
    
    // Check if the subdomain is already registered by someone else
    const existing = this.dnsCache.get(domain);
    if (existing && !existing.isLocal && existing.expiresAt > Date.now()) {
      console.warn(`Subdomain ${subdomain} is already registered`);
      return false;
    }
    
    // Register the subdomain
    this.addToCache(domain, ipfsHash, 3600, true);
    
    // In a real implementation, this would also:
    // 1. Register the subdomain in the DHT
    // 2. Announce to connected peers
    
    return true;
  }
  
  /**
   * Convert a domain to a local URL that can be browsed
   */
  domainToUrl(domain: string): string {
    // In a real implementation, this would create a URL that points to a local HTTP gateway
    // which intercepts gHosted.u domains and resolves them to IPFS content
    
    // For simplicity, we'll create a URL pointing to a local IPFS gateway
    if (domain === this.rootDomain) {
      return `http://localhost:${this.ipfsGatewayPort}/ipns/${this.rootDomain}`;
    } else {
      return `http://localhost:${this.ipfsGatewayPort}/ipns/${domain}`;
    }
  }
  
  /**
   * Convert an IPFS hash to a URL that can be browsed
   */
  hashToUrl(ipfsHash: string): string {
    return `http://localhost:${this.ipfsGatewayPort}/ipfs/${ipfsHash}`;
  }
  
  /**
   * Get all known domain mappings
   */
  getAllDomains(): DNSEntry[] {
    return Array.from(this.dnsCache.values());
  }
  
  /**
   * Clear expired entries from the cache
   */
  clearExpiredEntries(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [domain, entry] of this.dnsCache.entries()) {
      if (entry.expiresAt < now) {
        this.dnsCache.delete(domain);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`Cleared ${expiredCount} expired DNS entries`);
      this.saveCacheToStorage();
    }
  }
  
  /**
   * Generate a unique subdomain based on a user identifier
   */
  generateUserSubdomain(userId: string, username?: string): string {
    // Generate a deterministic subdomain based on user ID
    // In a real app, this would use the key fingerprint or a hash of public key
    const base = username ? username.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const idHash = userId.substring(0, 6);
    
    if (base) {
      // Use username + hash to create a more user-friendly subdomain
      return `${base}${idHash}`;
    } else {
      // Fallback to just the ID hash
      return `u${idHash}`;
    }
  }
}

// Export a singleton instance
export const localDNS = new LocalDNSResolver();