# gHosted — messenger at gHosted.u

**gHosted.u** is the **messenger webapp** for [**DreamSystemz**](https://github.com/lulzypher/alt.dream). Like **Messenger** with **Facebook**:

| URL | What you get |
|-----|----------------|
| **alt.dream** | Social platform — feed, friends, profile, pins |
| **gHosted.u** | Messenger only — Ghost inbox, encryption, attachments |

Same **`did:key`**, same gateway mailbox — different webapps. Production messenger: **https://gHosted.u**. Local dev: **http://localhost:5000**.

## Ghost (messenger webapp)

The default build is **Ghost**: Telegram-style 1:1 chat with **`did:key` + Ed25519**, passphrase-encrypted keys, and per-contact encryption.

- **This repo deploys to gHosted.u** — inbox-only UI (`VITE_APP_MODE=messenger`).
- **Target backend:** alt.dream gateway **`/v1/messenger/*`** (same inbox the social site links to).
- **Today:** dev still uses Express + Postgres **`/api/conversations`** — migrate to the gateway (see alt.dream [planning](https://github.com/lulzypher/alt.dream/blob/main/docs/planning.md)).
- **Tauri / mobile:** alternate shells for the same gHosted.u experience.
- **Legacy:** `npm run dev:altdream` — old all-in-one social client; use **alt.dream** for feed/profile instead.

## alt.dream — the social site

[**alt.dream**](https://github.com/lulzypher/alt.dream) is the **social webapp**. The **Messages** tab opens **gHosted.u** in a new tab — it does not embed chat inline.

- Shared **`keystore.json`** and **`POST /v1/auth/*`**
- Chat attachments → **reference events** for the alt.dream pin map
- Set **`VITE_MESSENGER_URL=https://gHosted.u`** on the alt.dream hub (or `http://localhost:5000` in dev)

---

## What is gHosted?

The **messenger** half of DreamSystemz — private conversation without a corporate inbox, hosted at **gHosted.u**.

- Ghost UI (threads, encryption schemes, link previews)  
- IPFS-backed attachments + reference events for alt.dream  
- Optional Tauri desktop wrapper  

---

## ⚙️ Core Architecture

### Personas

- DID-backed identities; messaging tags **`ecosystemBucket`** (e.g. `ghosted`) for alt.dream pin-map views.

### Post / social mesh *(legacy `dev:altdream` only)*

Feed, themes, and post databases are **not** part of the gHosted.u messenger deploy — they live on **alt.dream**.

---

## How messaging works (today)

1. **Ghost at gHosted.u** — Sign in at **`/identity`**, chat at **`/messages`**. Server mailbox API (migrating to alt.dream gateway).
2. **From alt.dream** — Click **Messages** → opens **gHosted.u** (same account when keystore/session is shared).
3. **Deep link** — `https://gHosted.u/messages?peer=<did:key>` from Friends on alt.dream.

Per-chat **storage policy** is local in the browser — see [`client/src/lib/conversationPolicyStorage.ts`](client/src/lib/conversationPolicyStorage.ts).

---

## Ecosystem (alt.dream and CID map)

Reference events from chat attachments feed the alt.dream pin map. See [`docs/alt-dream-integration.md`](docs/alt-dream-integration.md).

---

## 🚀 Quick Start

```bash
git clone https://github.com/lulzypher/gHosted.git
cd gHosted
npm run setup
# Edit .env DATABASE_URL, then:
npm run dev
```

Open **http://localhost:5000** → **`/identity`** → **`/messages`**.

Pair with alt.dream social dev:

```bash
# Terminal 1 — alt.dream (repo root)
pnpm dev          # social at http://localhost:5173

# Terminal 2 — gHosted
npm run dev       # messenger at http://localhost:5000

# alt.dream .env
VITE_MESSENGER_URL=http://localhost:5000
```

### Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Messenger webapp on **:5000** (`APP_MODE=messenger`) |
| `npm run dev:altdream` | Legacy social bundle (use alt.dream instead) |
| `npm run tauri:dev` / `tauri:build` | Desktop shell for gHosted.u |
