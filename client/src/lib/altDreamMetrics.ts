/**
 * Typed shapes for **alt.dream** — IPFS account + pinning organizer.
 * gHosted can supply raw IPFS/repo stats later; the hub aggregates per persona and bucket.
 */

export type PersonaPinSummary = {
  personaDid: string;
  /** Logical bucket (ghosted, shadowbox, …). */
  ecosystemBucket: string;
  pinnedRootCids: string[];
  approxRepoBytes: number;
  /** Bytes served to peers (if available from libp2p/IPFS API). */
  bytesServed?: number;
  /** Bytes received from peers. */
  bytesReceived?: number;
};

export type AltDreamPinDashboard = {
  generatedAt: string;
  personas: PersonaPinSummary[];
};

/** Placeholder until wired to Helia/Kubo stats APIs. */
export function emptyPinDashboard(): AltDreamPinDashboard {
  return { generatedAt: new Date().toISOString(), personas: [] };
}
