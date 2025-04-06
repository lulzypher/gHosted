// Type definitions for browser environment (DOM APIs)
// These override the default TypeScript definitions to prevent errors in browser code

// Declare global variables for browser environment
declare global {
  interface Window {
    location: Location;
    navigator: Navigator;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  }

  interface Location {
    protocol: string;
    host: string;
    hostname: string;
    href: string;
    pathname: string;
    search: string;
    hash: string;
    origin: string;
  }

  interface Navigator {
    onLine: boolean;
    serviceWorker: ServiceWorkerContainer;
  }

  interface ServiceWorkerContainer {
    register(scriptURL: string, options?: RegistrationOptions): Promise<ServiceWorkerRegistration>;
    getRegistration(clientURL?: string): Promise<ServiceWorkerRegistration | undefined>;
  }

  interface ServiceWorkerRegistration {
    unregister(): Promise<boolean>;
    update(): Promise<void>;
    active: ServiceWorker | null;
    installing: ServiceWorker | null;
    waiting: ServiceWorker | null;
  }

  interface ServiceWorker extends EventTarget {
    postMessage(message: any, transfer?: Transferable[]): void;
  }

  // Service Worker Global Scope and related interfaces
  interface ServiceWorkerGlobalScope extends WorkerGlobalScope {
    skipWaiting(): Promise<void>;
    clients: Clients;
    addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void;
    addEventListener(type: 'message', listener: (event: ExtendableMessageEvent) => void): void;
    addEventListener(type: 'install', listener: (event: ExtendableEvent) => void): void;
    addEventListener(type: 'activate', listener: (event: ExtendableEvent) => void): void;
    addEventListener(type: 'push', listener: (event: PushEvent) => void): void;
    addEventListener(type: 'notificationclick', listener: (event: NotificationEvent) => void): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  }

  interface Clients {
    claim(): Promise<void>;
    get(id: string): Promise<Client | undefined>;
    matchAll(options?: ClientQueryOptions): Promise<Client[]>;
    openWindow(url: string): Promise<WindowClient | null>;
  }

  interface Client {
    id: string;
    type: ClientType;
    url: string;
  }

  type ClientType = 'window' | 'worker' | 'sharedworker';

  interface ClientQueryOptions {
    includeUncontrolled?: boolean;
    type?: ClientType;
  }

  interface WindowClient extends Client {
    focused: boolean;
    visibilityState: DocumentVisibilityState;
    focus(): Promise<WindowClient>;
    navigate(url: string): Promise<WindowClient | null>;
  }

  // Service Worker Events
  interface ExtendableEvent extends Event {
    waitUntil(promise: Promise<any>): void;
  }

  interface FetchEvent extends ExtendableEvent {
    request: Request;
    respondWith(response: Response | Promise<Response>): void;
    clientId: string;
    resultingClientId: string;
  }

  interface ExtendableMessageEvent extends ExtendableEvent {
    data: any;
    origin: string;
    lastEventId: string;
    source: Client | ServiceWorker | MessagePort | null;
    ports: ReadonlyArray<MessagePort>;
  }

  interface PushEvent extends ExtendableEvent {
    data: PushMessageData | null;
  }

  interface PushMessageData {
    arrayBuffer(): ArrayBuffer;
    blob(): Blob;
    json(): any;
    text(): string;
  }

  interface NotificationEvent extends ExtendableEvent {
    action: string;
    notification: Notification;
  }

  // Make sure window and self are declared as variables
  declare var window: Window;
  declare var self: ServiceWorkerGlobalScope;
  declare var navigator: Navigator;
}

// This export is needed to ensure this file is treated as a module
export {};