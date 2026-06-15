# alt.dream integration (gHosted)

**Two webapps, one inbox** — like Facebook and Messenger:

| Deploy | URL (example) | UI |
|--------|---------------|-----|
| alt.dream hub | `https://alt.dream` | Social — feed, friends, profile |
| gHosted Ghost | **`https://gHosted.u`** | Messenger only |

Both use the same **`did:key`** and the alt.dream **gateway** **`/v1/messenger/*`** mailbox (target). The alt.dream **Messages** tab opens **gHosted.u**; it does not embed chat.

## One inbox (target architecture)

| Layer | Owner |
|-------|--------|
| **Mailbox API** | alt.dream gateway `/v1/messenger/*` |
| **Social graph** | Gateway `/v1/social/*` |
| **Social UI** | alt.dream hub |
| **Messenger UI** | gHosted → **gHosted.u** |
| **Legacy (retire)** | gHosted Express `/api/conversations` + Postgres |

## Personas and buckets

- **Persona** — DID-backed identity; optional **`personaDid`** on reference events.
- **Bucket** — e.g. `ghosted` for messenger traffic in alt.dream pin-map views.

See [`shared/ecosystemProtocol.ts`](../shared/ecosystemProtocol.ts).

## Shared protocol

Align [`shared/ecosystemProtocol.ts`](../shared/ecosystemProtocol.ts) with alt.dream [`packages/protocol`](https://github.com/lulzypher/alt.dream/tree/main/packages/protocol).

## Reference events

Export JSON from [`/pin-map`](../client/src/pages/pin-map.tsx) for alt.dream `ingestReferenceEventsJson`.

## Env linking

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_MESSENGER_URL` | alt.dream hub | **`https://gHosted.u`** (prod) or `http://localhost:5000` (dev) |

## Copying into alt.dream

Keep `schemaVersion` stable when syncing protocol types into `packages/protocol`.
