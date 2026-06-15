# alt.dream integration (gHosted)

**DreamSystemz** is the ecosystem; [**alt.dream**](https://github.com/lulzypher/alt.dream) is its **browser** (identity, feed, pin map, gateway sync). **gHosted** is the **messaging add-on** documented in this repository.

This document describes how the alt.dream browser consumes gHosted data for **CID usage maps**, **personas**, **per-app buckets**, and future mesh pinning metrics.

## Personas and buckets

- **Persona** — a distinct **DID-backed identity** (different public face, keys, and data boundaries). One human may run several personas.
- **Bucket** — data scoped to one ecosystem add-on for that persona (e.g. `ghosted`, `shadowbox`). Reference events may carry `personaDid` and `ecosystemBucket` so alt.dream can show **per-persona, per-app** pin and usage views.

See [`shared/ecosystemProtocol.ts`](../shared/ecosystemProtocol.ts) for optional fields on `EcosystemReferenceEvent`.

## Shared protocol

Types and Zod schemas live in [`shared/ecosystemProtocol.ts`](../shared/ecosystemProtocol.ts) (keep aligned with alt.dream [`packages/protocol`](https://github.com/lulzypher/alt.dream/tree/main/packages/protocol)):

- `EcosystemReferenceEvent` — links a CID (or `contentDigest`) to a stable place id (`stableRef`), `surface`, optional `personaDid`, optional `ecosystemBucket`.
- `PinIntent` — optional declaration that a user intends to pin a CID (for dashboards).
- `ConversationPolicy` / `ParticipantMediaPolicy` — per-device chat retention and media download preferences (local-first).

Example events are exported as `ECOSYSTEM_REFERENCE_EXAMPLES` for tests and UI demos.

## Reference event stream

gHosted records reference events in **browser `localStorage`** under keys `ghosted:ecosystemReferenceEvents:v1:<ownerDid>` when users send messages (with CID or digest) or update profile media.

Users can **export JSON** from the **CID map** page ([`/pin-map`](../client/src/pages/pin-map.tsx)). alt.dream should:

1. Ingest the same JSON shape via `ingestReferenceEventsJson` (see [`ecosystemReferenceStore.ts`](../client/src/lib/ecosystemReferenceStore.ts)) or reimplement merge in the hub repo.
2. Build a graph: nodes are canonical addresses (`cid` or `digest:<hex>`); edges are `Place -> address` from each event; **partition by `personaDid` + `ecosystemBucket`** for bucket UIs.
3. Highlight `multiUseAddresses` (same bytes referenced from multiple `stableRef`s).

## Pin support, space, and bandwidth (browser-side)

gHosted exposes **reference events** and optional **pin intents**; detailed **repo size, pin counts, and libp2p bandwidth** (share/leech) are aggregated in **alt.dream** from the local IPFS implementation. A typed stub for browser implementors lives in [`client/src/lib/altDreamMetrics.ts`](../client/src/lib/altDreamMetrics.ts).

## Chat replication prototype

[`client/src/lib/chatReplicationProto.ts`](../client/src/lib/chatReplicationProto.ts) defines an append-only **signed log entry** shape and `mergeChatLogEntries` for two-peer reconciliation. Full libp2p sync is not implemented here; the types are the contract for a future transport.

## Copying into alt.dream

Until a shared npm package exists, copy `shared/ecosystemProtocol.ts` into alt.dream `packages/protocol` or depend on `@altdream/protocol`. Keep `schemaVersion` fields stable and bump only when breaking JSON shape.
