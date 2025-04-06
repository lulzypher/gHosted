/**
 * Polyfills for Node.js environment variables that are not available in the browser
 * Used for compatibility with libraries like IPFS that depend on Node.js
 */

// Make sure this file is imported before any other IPFS-related imports
if (typeof window !== 'undefined') {
  // Fix for process
  if (typeof process === 'undefined') {
    window.process = { 
      env: { 
        NODE_ENV: import.meta.env.MODE || 'development',
        DEBUG: '*'
      }, 
      nextTick: (fn: Function) => setTimeout(fn, 0),
      version: '16.0.0', // Fake version for compatibility
      browser: true
    } as any;
  } else if (typeof process.env === 'undefined') {
    process.env = {} as any;
  }
  
  // Fix for global
  if (typeof global === 'undefined') {
    window.global = window;
  }
  
  // Fix for Buffer
  if (typeof window.Buffer === 'undefined') {
    // Simple Buffer polyfill for basic usage
    window.Buffer = {
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
    } as any;
  }
  
  // Patch URL for Node.js packages that use it
  if (typeof URL !== 'undefined' && !URL.hasOwnProperty('format')) {
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
  
  // Mock node:os module - needed for IPFS libraries
  if (!window.require) {
    window.require = (moduleName: string) => {
      if (moduleName === 'node:os' || moduleName === 'os') {
        return {
          constants: {
            signals: {
              SIGTERM: 15,
              SIGINT: 2,
              SIGKILL: 9
            },
            errno: {
              ENOENT: 2,
              EACCES: 13,
              EINVAL: 22
            }
          },
          platform: () => 'browser',
          cpus: () => [{ model: 'Browser CPU' }],
          freemem: () => 1024 * 1024 * 1024, // 1GB
          totalmem: () => 4096 * 1024 * 1024, // 4GB
          hostname: () => 'browser-host',
          type: () => 'Browser',
          release: () => '1.0.0',
          homedir: () => '/',
          tmpdir: () => '/tmp'
        };
      }
      // Return empty objects for other Node.js modules
      return {};
    };
  }
  
  // Create a more complete node:os polyfill to handle externalization error
  const osConstants = {
    signals: {
      SIGTERM: 15,
      SIGINT: 2,
      SIGKILL: 9,
      SIGTRAP: 5,
      SIGBUS: 10,
      SIGSEGV: 11,
      SIGILL: 4,
      SIGABRT: 6
    },
    errno: {
      ENOENT: 2,
      EACCES: 13,
      EINVAL: 22,
      EPERM: 1,
      EEXIST: 17,
      EBUSY: 16,
      ENOSPC: 28
    },
    priority: {
      PRIORITY_LOW: -1,
      PRIORITY_NORMAL: 0,
      PRIORITY_HIGH: 1
    },
    EOL: '\n'
  };
  
  const osFunctions = {
    platform: () => 'browser',
    cpus: () => [{ model: 'Browser CPU', speed: 2500 }],
    freemem: () => 1024 * 1024 * 1024, // 1GB
    totalmem: () => 4096 * 1024 * 1024, // 4GB
    hostname: () => 'browser-host',
    type: () => 'Browser',
    release: () => '1.0.0',
    homedir: () => '/',
    tmpdir: () => '/tmp',
    networkInterfaces: () => ({}),
    arch: () => 'x64',
    endianness: () => 'LE',
    loadavg: () => [0, 0, 0],
    uptime: () => 3600
  };
  
  // Handle direct window property for import from 'node:os'
  if (!window.hasOwnProperty('node:os')) {
    Object.defineProperty(window, 'node:os', {
      value: { 
        ...osFunctions,
        constants: osConstants
      },
      writable: false,
      configurable: false
    });
  }
  
  // Also update the global.process object with better OS support
  if (typeof process !== 'undefined') {
    process.platform = 'browser';
    process.arch = 'x64';
    process.versions = {
      node: '16.0.0',
      v8: '9.0.0',
      ...process.versions
    };
  }
}

export {}; // Make this a module