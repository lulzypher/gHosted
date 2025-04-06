/// <reference lib="webworker" />
/// <reference lib="es2020" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="esnext.array" />
/// <reference lib="esnext.asynciterable" />
/// <reference lib="esnext.intl" />
/// <reference lib="esnext.symbol" />
/// <reference lib="webworker" />
/// <reference lib="webworker.importscripts" />
/// <reference lib="webworker.iterable" />

// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules
// for the list of available Workbox modules, or add your own!

// Ensure proper typing for service worker
declare const self: ServiceWorkerGlobalScope;

// Make sure we're in a service worker context
if (typeof self.addEventListener !== 'function') {
  throw new Error('Service worker context not found');
}

const CACHE_NAME = 'ghosted-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/index.css',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Define SyncEvent interface
interface SyncEvent extends ExtendableEvent {
  tag: string;
}

// Install event - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Delete old caches
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - respond with cached resources or fetch from network
self.addEventListener('fetch', (event: FetchEvent) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.startsWith('https://fonts.googleapis.com') &&
      !event.request.url.startsWith('https://cdn.jsdelivr.net')) {
    return;
  }
  
  // API calls - try network first, then fall back to cached response
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          // Store in cache
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        })
        .catch(() => {
          // If network request fails, try to serve from cache
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For non-API requests, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return the response from cache
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        // Try to fetch from network
        return fetch(fetchRequest).then(
          (response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Store in cache
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          }
        );
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for offline posts
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  } else if (event.tag === 'sync-pins') {
    event.waitUntil(syncPins());
  }
});

// Sync posts from IndexedDB to server when online
async function syncPosts() {
  try {
    // This would typically interact with IndexedDB to get pending posts
    // and send them to the server
    console.log('Syncing pending posts...');
    
    // Notify clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach((client: Client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        tag: 'sync-posts'
      });
    });
  } catch (error) {
    console.error('Error syncing posts:', error);
  }
}

// Sync pins from IndexedDB to server when online
async function syncPins() {
  try {
    // This would interact with IndexedDB to get pending pins
    console.log('Syncing pending pins...');
    
    // Notify clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach((client: Client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        tag: 'sync-pins'
      });
    });
  } catch (error) {
    console.error('Error syncing pins:', error);
  }
}
