/**
 * Polyfills for Node.js environment variables that are not available in the browser
 * Used for compatibility with libraries like IPFS that depend on Node.js
 */
import nodeOsPolyfill from './node-os-polyfill';

// Make sure this file is imported before any other IPFS-related imports
if (typeof window !== 'undefined') {
  // Fix for process
  if (typeof process === 'undefined') {
    (window as any).process = { 
      env: { 
        NODE_ENV: import.meta.env.MODE || 'development',
        DEBUG: '*'
      }, 
      nextTick: (fn: Function) => setTimeout(fn, 0),
      version: '16.0.0', // Fake version for compatibility
      browser: true,
      platform: 'browser',
      arch: 'x64',
      versions: {
        node: '16.0.0',
        v8: '9.0.0'
      }
    };
  } else if (typeof process.env === 'undefined') {
    process.env = {} as any;
  }
  
  // Fix for global
  if (typeof (window as any).global === 'undefined') {
    (window as any).global = window;
  }
  
  // Fix for Buffer
  if (typeof (window as any).Buffer === 'undefined') {
    // Simple Buffer polyfill for basic usage
    (window as any).Buffer = {
      from: (data: string | Uint8Array, encoding?: string): Uint8Array => {
        if (typeof data === 'string') {
          return new TextEncoder().encode(data);
        }
        return data;
      },
      isBuffer: (obj: any) => false,
      alloc: (size: number): Uint8Array => {
        return new Uint8Array(size);
      },
      // For packages that check if Buffer.isBuffer exists
      prototype: {
        slice: () => new Uint8Array(),
        toString: () => ''
      }
    };
  }
  
  // Patch URL for Node.js packages that use it
  if (typeof URL !== 'undefined' && !(URL as any).format) {
    (URL as any).format = (urlObj: any) => {
      if (typeof urlObj === 'string') return urlObj;
      const { protocol, hostname, port, pathname, search, hash } = urlObj;
      let url = protocol ? `${protocol}//` : '';
      url += hostname || '';
      url += port ? `:${port}` : '';
      url += pathname || '';
      url += search || '';
      url += hash || '';
      return url;
    };
  }
  
  // Set up node:os polyfill for different import scenarios
  // 1. Direct window property
  (window as any)['node:os'] = nodeOsPolyfill;
  
  // 2. For require('node:os') or require('os')
  if (!(window as any).require) {
    (window as any).require = (id: string) => {
      if (id === 'node:os' || id === 'os') {
        return nodeOsPolyfill;
      }
      return {};
    };
  } else {
    const origRequire = (window as any).require;
    (window as any).require = (id: string) => {
      if (id === 'node:os' || id === 'os') {
        return nodeOsPolyfill;
      }
      return origRequire(id);
    };
  }
}

export {}; // Make this a module