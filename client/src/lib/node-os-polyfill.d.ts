// Type definitions for node-os-polyfill
declare module './node-os-polyfill' {
  interface OSConstants {
    signals: {
      SIGTERM: number;
      SIGINT: number;
      SIGKILL: number;
      SIGTRAP: number;
      SIGBUS: number;
      SIGSEGV: number;
      SIGILL: number;
      SIGABRT: number;
    };
    errno: {
      ENOENT: number;
      EACCES: number;
      EINVAL: number;
      EPERM: number;
      EEXIST: number;
      EBUSY: number;
      ENOSPC: number;
    };
    priority: {
      PRIORITY_LOW: number;
      PRIORITY_NORMAL: number;
      PRIORITY_HIGH: number;
    };
    EOL: string;
  }

  interface OSFunctions {
    platform(): string;
    cpus(): Array<{ model: string; speed?: number }>;
    freemem(): number;
    totalmem(): number;
    hostname(): string;
    type(): string;
    release(): string;
    homedir(): string;
    tmpdir(): string;
    networkInterfaces(): Record<string, any>;
    arch(): string;
    endianness(): string;
    loadavg(): number[];
    uptime(): number;
  }

  interface NodeOSPolyfill extends OSFunctions {
    constants: OSConstants;
  }

  const nodeOsPolyfill: NodeOSPolyfill;
  export default nodeOsPolyfill;
}