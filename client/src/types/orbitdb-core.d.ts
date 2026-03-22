declare module "@orbitdb/core" {
  export function createOrbitDB(options: {
    ipfs: unknown;
    directory?: string;
  }): Promise<{
    open: (address: string, options?: { type?: string }) => Promise<unknown>;
    stop: () => Promise<void>;
    id: string;
    ipfs: unknown;
    directory: string;
  }>;
}
