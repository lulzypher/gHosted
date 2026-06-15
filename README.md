# gHosted — messaging for alt.dream

**gHosted** is the **Ghost messaging app that ships with [**alt.dream**](https://github.com/lulzypher/alt.dream)** — the DreamSystemz browser. Think **Facebook + Messenger**: alt.dream is feed, friends, and profile; **gHosted** is the inbox. **One account (`did:key`), one gateway mailbox** — Ghost can run inside the browser, in its own tab, or in a Tauri desktop shell, but it is not a second messaging service.

## Ghost (default client)

The **default** build is **Ghost**: Telegram-style 1:1 chat with **`did:key` + Ed25519**, passphrase-encrypted keys, and per-contact encryption options.

- **Target backend:** alt.dream gateway **`/v1/messenger/*`** (same inbox as the browser Messages tab).
- **Today:** dev still runs an Express + Postgres **`/api/conversations`** path — **legacy**; migrate Ghost to the gateway API (see alt.dream [planning — Messaging](https://github.com/lulzypher/alt.dream/blob/main/docs/planning.md)).
- **Desktop shell:** Tauri 2 in `src-tauri/` — `npm run tauri:dev` / `npm run tauri:build`.
- **Legacy experimental bundle:** `npm run dev:altdream` — old all-in-one social client; feed/profile live in alt.dream now.

## alt.dream — the browser

[**alt.dream**](https://github.com/lulzypher/alt.dream) is the **DreamSystemz browser**: personas, feed, friends, pin toolkit, gateway sync. **gHosted ships with it** as the messaging app.

- Same **`keystore.json`** and **`POST /v1/auth/*`** (see [SHARED_IDENTITY](https://github.com/lulzypher/alt.dream/blob/main/docs/SHARED_IDENTITY.md)).
- Chat attachments emit **reference events** for the browser pin map.
- Install alt.dream + gHosted together; point Ghost at the same gateway URL.

**What Ghost provides**

- 🔐 `did:key` messaging on the shared gateway inbox  
- 💬 Telegram-style UI and encryption scheme picker  
- 📎 Attachments → IPFS CIDs + reference events  
- 🖥️ Tauri / mobile shells for a focused inbox  

---

## 🧠 What is gHosted?

gHosted is the **Ghost messaging app bundled with alt.dream**: reclaim **private conversation** on the **same gateway inbox** as the browser — not a separate product with its own mailbox.

- A **Ghost** messenger (server-assisted mailbox + client-side encryption options)  
- **Local-first** key material — passphrase unlock in the browser  
- **IPFS-backed** attachments with exportable **reference events** for alt.dream  
- Optional **Tauri** shell for a dedicated desktop inbox  

Everything sensitive stays **client-decryptable**; the operator gateway stores ciphertext and metadata you choose to sync.

---

## ⚙️ Core Architecture

### Personas

- Each user creates one or more **personas** (DID-based).
- A persona has keys, profile hints, and optional public metadata.
- **Per-app buckets** — under each persona, messaging traffic tags **`ecosystemBucket`** (e.g. `ghosted`) so **alt.dream** can show per-bucket pin and storage views alongside other add-ons.

### Post Databases *(roadmap / legacy `dev:altdream`)*

Modular post databases (Twitter-style, blog-style, etc.) exist in the codebase for experimentation. The **default Ghost add-on** does not surface them; the **alt.dream browser** owns feed and profile UX.

### Social Mesh *(roadmap)*

Friends, groups, and mutual pinning narratives are shared ecosystem goals; Ghost v1 focuses on **1:1 messaging** and reference events the browser can aggregate.

---

## 📘 The Advert Book

This repo includes the **gHosted Advertisement Book** — a technical pitchbook + intro manual designed for onboarding both users and developers.

### Book Title: **gHosted – Local Control, Global Sync**

#### Chapters:

1. **Introduction: Local Control, Global Sync**  
   What this app is, what it replaces, the key systems (IPFS, DIDs, sync, identity), and the core idea of a decentralized social/media framework.

2. **What This App Is**  
   A breakdown of its components: identity, homepage, post databases, themes, sync, and social mesh.

3. **How It Works**  
   Architecture, data flow, storage logic, CRDTs, public/private separation, DID signing.

4. **Setting Up Your Profile**  
   Walkthrough of identity creation, page customization, and content posting.

5. **Post Types & Database Emulation**  
   Define and enforce rules for different types of posts — mimic Twitter, Facebook, GitHub behavior using modular schemas.

6. **Themes, Layouts, and Skins**  
   How to create and apply frontend packages: themes, widgets, loaders, galleries.

7. **Groups, Friends, and Pinning**  
   The social side of the mesh: building micro-networks, shared content folders, private groups.

8. **Addons, Plugins, and API Calls**  
   Guide to extending gHosted: create tools, apps, custom post types, new views, or media renderers.

9. **Running Your Own Node/Server**  
   Optional: setting up a persistent relay/cache server, family or group hubs.

10. **The Future of gHosted**  
    Federation, bridging to ActivityPub, plugin marketplaces, mobile-first features.

---

## How messaging works (today)

1. **Ghost (default) — `did:key` + Ed25519 + server session** — Register or sign in at **`/identity`**. The server stores **verifying** keys as `ed25519:` + base64 (32-byte raw). Messages use the **server mailbox** API (`/api/conversations`, WebSockets). Legacy **RSA** key accounts may still exist in the DB; the default UI only onboards **Ed25519**.

2. **alt.dream browser** — Feed, friends, profile, and a lightweight gateway inbox live in the [alt.dream hub](https://github.com/lulzypher/alt.dream). Open **gHosted** for the full Ghost experience (desktop/mobile).

3. **Pure browser, no server mailbox** — Not the focus of the default Ghost path; experimental Orbit/social code remains under `dev:altdream`.

Per-chat **storage policy** (retention, video download mode, attachment auto-pin) is **local to the browser** (`localStorage`) on the messages screen; see [`client/src/lib/conversationPolicyStorage.ts`](client/src/lib/conversationPolicyStorage.ts) and [`client/src/lib/chatReplicationProto.ts`](client/src/lib/chatReplicationProto.ts) for alignment with alt.dream protocol types.

**How this fits DreamSystemz:** **alt.dream** is the browser; **gHosted** is its messaging app. **One inbox** on the gateway (target). Ghost contributes **`ghosted`** reference events for pin-map views.

---

## Ecosystem (alt.dream and CID map)

gHosted emits **versioned reference events** ([`shared/ecosystemProtocol.ts`](shared/ecosystemProtocol.ts)) when messages and profile media use IPFS CIDs (with optional **persona** and **bucket** fields for alt.dream). A **CID map** page exists in the client ([`client/src/pages/pin-map.tsx`](client/src/pages/pin-map.tsx)); it is not routed in the **default** Ghost app — use the **alt.dream browser** or link manually. Exports target the [alt.dream](https://github.com/lulzypher/alt.dream) hub. See [`docs/alt-dream-integration.md`](docs/alt-dream-integration.md).

Planned hub metrics (repo size, pins you support, share/leech bandwidth) are described in [`client/src/lib/altDreamMetrics.ts`](client/src/lib/altDreamMetrics.ts) as typed stubs for the alt.dream UI.

---

## 🚀 Quick Start

### Requirements

- **Node.js 18+**
- **npm** or **pnpm**

### Install & Run

**One-time setup** (Node **18+**, [PostgreSQL](https://www.postgresql.org/) for sign-in and DMs — create a DB and set `DATABASE_URL` in `.env`):

```bash
git clone https://github.com/lulzypher/gHosted.git
cd gHosted

# Installs dependencies; creates .env from .env.example if missing
npm run setup
# Edit .env: point DATABASE_URL at your database, then:
npm run dev
```

**Faster start** (after the first `npm run setup`):

- **Windows:** `start.ps1` (or double‑click in Explorer if execution policy allows), or `npm run dev`
- **macOS / Linux:** `chmod +x start.sh && ./start.sh`, or `npm run dev`

Open **http://localhost:5000** — you will be redirected to **`/identity`** until you create or unlock a key, then to **`/messages`**.

**Legacy experimental social client (not the add-on default):**
```bash
npm run dev:altdream
```

### How it runs (local-node model)

gHosted is designed to run **on your own machine**. When you run `npm run dev` (default **messenger** / Ghost add-on mode):

- The Express server and (for conversations) **Postgres** run **locally** on your machine
- The **Ghost** UI talks to that API; point it at the same gateway as **alt.dream** when using shared offload/auth
- Production messaging builds use `APP_MODE=messenger` and static files under `dist/public-messenger/`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | For server features | Postgres connection string (e.g. `postgresql://user:pass@localhost:5432/ghosted`) |
| `SESSION_SECRET` | **Production only** | Secret for session signing (use a strong random string) |
| `VITE_IPFS_GATEWAY` | No | Override IPFS gateway for images (default: `https://ipfs.io`) |
| `VITE_IPFS_API_URL` | No | Override IPFS API URL |
| `VITE_INFURA_IPFS_*` | No | Infura project ID/secret for IPFS |

**Example .env for full features:**
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/ghosted
SESSION_SECRET=your-secret-here
```

Without a database, the app runs in **decentralized mode**: DID-based auth, OrbitDB for posts, and IPFS for storage. All data stays in your browser (IndexedDB + Helia).

### Docker

```bash
# Build
docker build -t ghosted .

# Run (requires DATABASE_URL and SESSION_SECRET for server features)
docker run -p 5000:5000 -e DATABASE_URL=... -e SESSION_SECRET=... ghosted
```

**Local dev with Postgres:**
```bash
docker-compose up -d          # Starts Postgres on localhost:5432
# Set DATABASE_URL=postgresql://ghosted:ghosted@localhost:5432/ghosted
npm run dev
```

### Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Dev server on port **5000**; **`VITE_APP_MODE=messenger`**, `APP_MODE=messenger` (Ghost add-on) |
| `npm run dev:altdream` | Legacy experimental all-in-one social client (not default) |
| `npm run dev:messenger` | Same as `dev` (explicit) |
| `npm run build` | Builds legacy altdream + messenger clients + server bundle |
| `npm run build:server` | Server bundle to `dist/` only |
| `npm run start:messenger` | Production: `APP_MODE=messenger` + `node dist/index.js` |
| `npm run tauri:dev` / `tauri:build` | Tauri 2 desktop (needs Rust) |
| `npm run check` | TypeScript check |
| `npm test` | Server tests (e.g. `server/chain.test.ts`) |
