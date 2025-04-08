/**
 * Node OS module polyfill for browser environments
 * This is used to handle import('node:os') in browser environments
 */

// OS constants
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

// OS functions
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

// Export the polyfill module
const nodeOsPolyfill = {
  ...osFunctions,
  constants: osConstants
};

export default nodeOsPolyfill;