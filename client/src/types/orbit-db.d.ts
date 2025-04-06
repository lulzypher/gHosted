declare module 'orbit-db' {
  export default class OrbitDB {
    constructor(ipfs: any, options?: any);
    
    static createInstance(ipfs: any, options?: any): Promise<OrbitDB>;
    
    keyvalue(name: string, options?: any): Promise<any>;
    
    eventlog(name: string, options?: any): Promise<any>;
    
    docs(name: string, options?: any): Promise<any>;
    
    counter(name: string, options?: any): Promise<any>;
    
    feed(name: string, options?: any): Promise<any>;
    
    disconnect(): Promise<void>;
    
    stop(): Promise<void>;
  }
}