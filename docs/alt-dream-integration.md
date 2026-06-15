# alt.dream integration (gHosted)

**DreamSystemz** ships as **alt.dream** (browser + gateway) plus **gHosted** (Ghost messaging UI). Like Facebook and Messenger: **one identity, one inbox** on the alt.dream gateway — gHosted is the focused chat app, not a second messaging service.

This document describes how gHosted connects to the browser for **CID maps**, **personas**, **buckets**, and the shared **`/v1/messenger/*`** mailbox.

## One inbox (target architecture)

| Layer | Owner |
|-------|--------|
| **Mailbox API** | alt.dream gateway `/v1/messenger/*` |
| **Social graph** (friends-only DM rules) | Same gateway `/v1/social/*` |
| **Chat UI** | gHosted Ghost (primary) + interim hub Messages tab |
| **Legacy (retire)** | gHosted Express `/api/conversations` + Postgres |

Ghost should authenticate with **`POST /v1/auth/*`**, then read/write conversations through the gateway. The standalone gHosted server remains for dev migration only.

## Personas and buckets

- **Persona** — a distinct **DID-backed identity** (different public face, keys, and data boundaries). One human may run several personas.
- **Bucket** — data scoped to one app surface for that persona (e.g. `ghosted`, `shadowbox`). Reference events may carry `personaDid` and `ecosystemBucket` so alt.dream can show **per-persona, per-app** pin and usage views.

See [`shared/ecosystemProtocol.ts`](../shared/ecosystemProtocol.ts) for optional fields on `EcosystemReferenceEvent`.

## Shared protocol

Types and Zod schemas live in [`shared/ecosystemProtocol.ts`](../shared/ecosystemProtocol.ts) (keep aligned with alt.dream [`packages/protocol`](https://github.com/lulzypher/alt.dream/tree/main/packages/protocol)):

- `EcosystemReferenceEvent` — links a CID (or `contentDigest`) to a stable place id (`stableRef`), `surface`, optional `personaDid`, optional `ecosystemBucket`.
- `PinIntent` — optional declaration that a user intends to pin a CID (for dashboards).
- `ConversationPolicy` / `ParticipantMediaPolicy` — per-device chat retention and media download preferences (local-first).

Example events are exported as `ECOSYSTEM_REFERENCE_EXAMPLES` for tests and UI demos.

## Reference event stream

gHosted records reference events in **browser `localStorage`** under keys `ghosted:ecosystemReferenceEvents:v1:<ownerDid>` when users send messages (with CID or digest) or update profile media.

Users can **export JSON** from the **CID map** page ([`/pin-map`](../client/src/pages/pin-map.tsx)). alt.dream ingests the same JSON shape via `ingestReferenceEventsJson` (see [`ecosystemReferenceStore.ts`](../client/src/lib/ecosystemReferenceStore.ts)).

## Pin support, space, and bandwidth (browser-side)

gHosted exposes **reference events** and optional **pin intents**; detailed **repo size, pin counts, and libp2p bandwidth** are aggregated in **alt.dream** from the local IPFS implementation. See [`client/src/lib/altDreamMetrics.ts`](../client/src/lib/altDreamMetrics.ts).

## Chat replication prototype

[`client/src/lib/chatReplicationProto.ts`](../client/src/lib/chatReplicationProto.ts) defines append-only **signed log entries** for future P2P sync. Types align with `@altdream/protocol` messaging shapes on the gateway.

## Copying into alt.dream

Until a shared npm package exists, copy `shared/ecosystemProtocol.ts` into alt.dream `packages/protocol` or depend on `@altdream/protocol`. Keep `schemaVersion` fields stable and bump only when breaking JSON shape.
