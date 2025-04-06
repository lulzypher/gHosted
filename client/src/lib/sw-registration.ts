// Service worker registration for offline support

// We'll simulate the service worker functionality in development
// since we can't modify Vite to properly serve the service worker

// Create a mock service worker implementation that handles basic caching
class MockServiceWorker {
  private static instance: MockServiceWorker | null = null;
  private cache: Map<string, Response> = new Map();
  private isActive = false;

  private constructor() {}

  static getInstance(): MockServiceWorker {
    if (!MockServiceWorker.instance) {
      MockServiceWorker.instance = new MockServiceWorker();
    }
    return MockServiceWorker.instance;
  }

  activate(): void {
    console.log('[MockSW] Activating mock service worker');
    this.isActive = true;
  }

  async cacheResource(url: string, response: Response): Promise<void> {
    if (!this.isActive) return;
    try {
      const clonedResponse = response.clone();
      this.cache.set(url, clonedResponse);
      console.log(`[MockSW] Cached resource: ${url}`);
    } catch (error) {
      console.error(`[MockSW] Failed to cache: ${url}`, error);
    }
  }

  async getCachedResource(url: string): Promise<Response | undefined> {
    return this.cache.get(url);
  }

  isCached(url: string): boolean {
    return this.cache.has(url);
  }
}

let mockServiceWorker: MockServiceWorker | null = null;

export async function registerServiceWorker(): Promise<void> {
  // In production, we would use the real service worker
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      
      console.log('Service worker registration successful');
      
      // Setup service worker update flow
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New content is available; please refresh.');
            window.dispatchEvent(new CustomEvent('swUpdateAvailable'));
          }
        });
      });
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  } else {
    // In development, we'll use our mock service worker
    console.log('Using mock service worker for development');
    mockServiceWorker = MockServiceWorker.getInstance();
    mockServiceWorker.activate();
    
    // Intercept fetch requests to cache responses
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = new Request(input, init);
      const url = request.url;
      
      try {
        // Try the network first
        const response = await originalFetch(input, init);
        
        // Cache successful GET responses
        if (response.ok && request.method === 'GET' && mockServiceWorker) {
          mockServiceWorker.cacheResource(url, response);
        }
        
        return response;
      } catch (error) {
        // If network request fails and we have a cached response, return it
        if (mockServiceWorker && mockServiceWorker.isCached(url)) {
          console.log(`[MockSW] Serving cached response for: ${url}`);
          const cachedResponse = await mockServiceWorker.getCachedResource(url);
          if (cachedResponse) {
            return cachedResponse;
          }
        }
        
        // Otherwise, rethrow the error
        throw error;
      }
    };
    
    console.log('[MockSW] Mock service worker initialized');
  }
}

// Check for service worker updates
export async function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    } catch (error) {
      console.error('Error checking for service worker updates:', error);
    }
  }
}

// Unregister service worker
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const success = await registration.unregister();
        if (success) {
          console.log('Service worker unregistered successfully');
        } else {
          console.warn('Service worker unregistration failed');
        }
      }
    } catch (error) {
      console.error('Error unregistering service worker:', error);
    }
  }
}
