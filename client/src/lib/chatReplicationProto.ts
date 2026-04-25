import { z } from "zod";

/**
 * Prototype: append-only signed conversation log entries pointing at IPFS payload CIDs.
 * Full replication (libp2p sync, conflict merge) is out of scope; this defines the envelope
 * so clients can exchange blobs and verify a chain of hashes.
 */

export const chatLogEntryZ = z.object({
  schemaVersion: z.literal(1),
  conversationId: z.string().min(1),
  seq: z.number().int().nonnegative(),
  senderDid: z.string().min(1),
  /** Ciphertext or structured envelope stored on IPFS. */
  payloadCid: z.string().min(1),
  /** ISO time the sender claims */
  sentAt: z.string(),
  /** sha256-hex of canonical predecessor entry JSON (seq 0 uses all-zero 64 hex). */
  prevEntryHash: z.string().regex(/^[a-f0-9]{64}$/),
  /** Placeholder: base64 signature or "unsigned-dev" in development. */
  signature: z.string().min(1),
});

export type ChatLogEntry = z.infer<typeof chatLogEntryZ>;

const ZERO_HASH = "0".repeat(64);

export async function hashChatLogEntry(entry: ChatLogEntry): Promise<string> {
  const canonical = JSON.stringify({
    schemaVersion: entry.schemaVersion,
    conversationId: entry.conversationId,
    seq: entry.seq,
    senderDid: entry.senderDid,
    payloadCid: entry.payloadCid,
    sentAt: entry.sentAt,
    prevEntryHash: entry.prevEntryHash,
    signature: entry.signature,
  });
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyChatLogEntryChain(entries: ChatLogEntry[]): Promise<{
  ok: boolean;
  error?: string;
}> {
  const sorted = [...entries].sort((a, b) => a.seq - b.seq);
  let prevHash = ZERO_HASH;
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    if (e.seq !== i) {
      return { ok: false, error: `Expected seq ${i}, got ${e.seq}` };
    }
    if (e.prevEntryHash !== prevHash) {
      return { ok: false, error: `prevEntryHash mismatch at seq ${e.seq}` };
    }
    prevHash = await hashChatLogEntry(e);
  }
  return { ok: true };
}

/** Merge two partial logs by seq; on duplicate seq prefer higher sentAt lexicographically (prototype). */
export function mergeChatLogEntries(a: ChatLogEntry[], b: ChatLogEntry[]): ChatLogEntry[] {
  const bySeq = new Map<number, ChatLogEntry>();
  for (const e of [...a, ...b]) {
    const cur = bySeq.get(e.seq);
    if (!cur || e.sentAt > cur.sentAt) bySeq.set(e.seq, e);
  }
  return [...bySeq.entries()].sort(([x], [y]) => x - y).map(([, v]) => v);
}

export { ZERO_HASH as CHAT_LOG_ZERO_HASH };
