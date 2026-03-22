import { signMessage } from '@/lib/cryptography';

export interface ChainEventInput {
  userId: number;
  did: string;
  privateKey: string;
  action: string;
  payloadCid: string;
  prevCid?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ChainEvent {
  entryCid: string;
  prevCid: string | null;
  payloadCid: string;
  action: string;
  authorDid: string;
  signature: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const headKey = (userId: number) => `gh-chain-head-${userId}`;
const entriesKey = (userId: number) => `gh-chain-entries-${userId}`;

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((v) => v.toString(16).padStart(2, '0')).join('');
}

export async function appendLocalChainEvent(input: ChainEventInput): Promise<ChainEvent> {
  const prevCid = input.prevCid ?? localStorage.getItem(headKey(input.userId));
  const timestamp = new Date().toISOString();
  const base = JSON.stringify({
    userId: input.userId,
    did: input.did,
    action: input.action,
    payloadCid: input.payloadCid,
    prevCid: prevCid || null,
    timestamp,
    metadata: input.metadata || null
  });

  const entryCid = `bafy${(await sha256Hex(base)).slice(0, 56)}`;
  const signature = await signMessage(base, input.privateKey);
  const entry: ChainEvent = {
    entryCid,
    prevCid: prevCid || null,
    payloadCid: input.payloadCid,
    action: input.action,
    authorDid: input.did,
    signature,
    timestamp,
    metadata: input.metadata
  };

  const existing = JSON.parse(localStorage.getItem(entriesKey(input.userId)) || '[]') as ChainEvent[];
  existing.unshift(entry);
  localStorage.setItem(entriesKey(input.userId), JSON.stringify(existing));
  localStorage.setItem(headKey(input.userId), entryCid);

  return entry;
}

export function getLocalChainEntries(userId: number): ChainEvent[] {
  return JSON.parse(localStorage.getItem(entriesKey(userId)) || '[]') as ChainEvent[];
}
