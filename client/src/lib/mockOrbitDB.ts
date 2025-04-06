/**
 * Mock implementation of OrbitDB for browser compatibility
 * This is a simplified version that uses browser storage (IndexedDB) instead of requiring Node.js
 */

import { v4 as uuidv4 } from 'uuid';
import { IPFSHTTPClient } from 'ipfs-http-client';

// IndexedDB wrapper for storing data
class StorageAdapter {
  private dbName: string;
  private storeName: string;
  
  constructor(dbName: string, storeName: string) {
    this.dbName = dbName;
    this.storeName = storeName;
  }
  
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async put(key: string, value: any): Promise<string> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      
      const item = {
        id: key,
        value: value,
        timestamp: Date.now()
      };
      
      const request = store.put(item);
      request.onsuccess = () => resolve(key);
      request.onerror = () => reject(request.error);
      
      tx.oncomplete = () => db.close();
    });
  }
  
  async get(key: string): Promise<any> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
      
      tx.oncomplete = () => db.close();
    });
  }
  
  async getAll(): Promise<any[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result;
        resolve(results.map(r => r.value));
      };
      request.onerror = () => reject(request.error);
      
      tx.oncomplete = () => db.close();
    });
  }
  
  async del(key: string): Promise<boolean> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      
      const request = store.delete(key);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
      
      tx.oncomplete = () => db.close();
    });
  }
}

// Mock document database
class MockDocumentStore {
  private storage: StorageAdapter;
  
  constructor(address: string) {
    this.storage = new StorageAdapter('orbitdb-mock', address);
  }
  
  async load(): Promise<void> {
    console.log('Loading MockDocumentStore...');
  }
  
  async put(doc: any): Promise<string> {
    const _id = doc._id || uuidv4();
    const docWithId = { ...doc, _id };
    await this.storage.put(_id, docWithId);
    return _id;
  }
  
  async get(key: string): Promise<any[]> {
    if (!key || key === '') {
      return this.storage.getAll();
    }
    
    const doc = await this.storage.get(key);
    return doc ? [doc] : [];
  }
  
  async del(key: string): Promise<string> {
    await this.storage.del(key);
    return key;
  }
}

// Mock event log database
class MockEventLogStore {
  private storage: StorageAdapter;
  private events: any[] = [];
  
  constructor(address: string) {
    this.storage = new StorageAdapter('orbitdb-mock', address);
  }
  
  async load(): Promise<void> {
    console.log('Loading MockEventLogStore...');
    const allEvents = await this.storage.getAll();
    this.events = allEvents || [];
  }
  
  async add(event: any): Promise<string> {
    const eventId = uuidv4();
    const eventWithId = { ...event, id: eventId, timestamp: Date.now() };
    await this.storage.put(eventId, eventWithId);
    this.events.push(eventWithId);
    return eventId;
  }
  
  iterator({ limit = -1 } = {}): { collect: () => any[] } {
    const sortedEvents = [...this.events].sort((a, b) => b.timestamp - a.timestamp);
    const limitedEvents = limit > 0 ? sortedEvents.slice(0, limit) : sortedEvents;
    
    return {
      collect: () => limitedEvents.map(event => ({
        payload: { value: event }
      }))
    };
  }
}

// Mock key-value database
class MockKeyValueStore {
  private storage: StorageAdapter;
  
  constructor(address: string) {
    this.storage = new StorageAdapter('orbitdb-mock', address);
  }
  
  async load(): Promise<void> {
    console.log('Loading MockKeyValueStore...');
  }
  
  async put(key: string, value: any): Promise<string> {
    await this.storage.put(key, value);
    return key;
  }
  
  async get(key: string): Promise<any> {
    return this.storage.get(key);
  }
}

// Mock OrbitDB class
class MockOrbitDB {
  private ipfs: IPFSHTTPClient;
  private directory: string;
  
  constructor(ipfs: IPFSHTTPClient, options: { directory: string }) {
    this.ipfs = ipfs;
    this.directory = options.directory;
    console.log('Created MockOrbitDB instance with directory:', this.directory);
  }
  
  async docs(address: string, options: any = {}): Promise<MockDocumentStore> {
    console.log(`Creating document store: ${address} with options:`, options);
    return new MockDocumentStore(address);
  }
  
  async eventlog(address: string, options: any = {}): Promise<MockEventLogStore> {
    console.log(`Creating event log: ${address} with options:`, options);
    return new MockEventLogStore(address);
  }
  
  async keyvalue(address: string, options: any = {}): Promise<MockKeyValueStore> {
    console.log(`Creating key-value store: ${address} with options:`, options);
    return new MockKeyValueStore(address);
  }
}

// Factory function to create a MockOrbitDB instance
export const createInstance = async (ipfs: IPFSHTTPClient, options: { directory: string }): Promise<MockOrbitDB> => {
  console.log('Creating MockOrbitDB instance...');
  return new MockOrbitDB(ipfs, options);
};

// Export the mock OrbitDB class as the default export
export default {
  createInstance
};