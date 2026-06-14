# gHosted – Group Hosted Social

**gHosted** is a fully decentralized, customizable, peer-to-peer social and media platform built on top of **IPFS**, **DIDs**, and **CRDTs**. You own your identity, your content, your network — across devices, with no central server.

## Ghost (default client)

The **default** dev and production build is **Ghost**: a **Telegram-style** messenger with **`did:key` + Ed25519** (challenge/response to the API), passphrase-encrypted key storage in the browser, and **1:1 chat** over the existing Express/WebSocket/Postgres path. You land on **`/identity`** to create or unlock a key, then **`/messages`**.

- **Full social / feed / Orbit** UI: use `npm run dev:altdream` (or build `VITE_APP_MODE=altdream`). That is the **legacy** all-in-one client, not the default.
- **Desktop shell:** Tauri 2 in `src-tauri/` — `npm run tauri:dev` / `npm run tauri:build` (requires [Rust](https://rustup.rs)).
- **Group + IPFS-pinned rooms** and MLS are on the roadmap; the UI includes a create-group **dialog** with settings (wire-up TBD).

## alt.dream — an alternative dream

**alt.dream** (browser hub; GitHub: [`lulzypher/alt-dream`](https://github.com/lulzypher/alt-dream)) is the name of the ecosystem shell around gHosted, Shadowbox, and whatever you build next. It is an **alternative dream** to corporate centralization: a **dream of freedom** where your IPFS account, personas, and pinning choices stay legible to you — which pins you support, how much space they use, and the bandwidth you share or pull from the mesh. gHosted emits structured **reference events** and exports data so alt.dream can organize that story across apps.

- 🔐 Identity-based (DID) logins  
- 📡 Peer-to-peer sync across devices  
- 🧱 Modular, themeable social pages  
- 📚 Public and private media libraries  
- 🌍 Groups, subscriptions, and pinning  
- ⚙️ App framework with addon/plugin support

---

## 🧠 What is gHosted?

gHosted is a tool to reclaim control of your digital identity, content, and connections. It's:
- A decentralized media manager  
- A user-owned social network  
- A multi-device sync platform  
- A skinable framework for digital publishing

Everything is local-first, IPFS-backed, signed with your DID, and optionally shareable with others via direct sync or peer pinning.

You can build a homepage, customize how it looks, choose how your posts behave (like Twitter, Facebook, or GitHub), and share that profile with others — who can help keep it alive by pinning.

---

## ⚙️ Core Architecture

### Personas
- Each user creates one or more **personas** (DID-based).
- A persona has:
  - A public profile (homepage)
  - Linked post databases (Twitter-style, blog-style, etc.)
  - Privacy rules (public, private, friends-only, group)
- **Per-app buckets** — under each persona, data is grouped by ecosystem app (e.g. **gHosted** for social, **Shadowbox** for jobs/chain play). Reference events carry `personaDid` and `ecosystemBucket` so **alt.dream** can show clean, per-bucket views of pins and storage.

### Post Databases
- Modular post databases define post types and limits:
  - `twitter.db` → short text posts (X-style)
  - `facebook.db` → media-rich status updates
  - `github.db` → changelogs, commits, releases
- Each post is:
  - Cryptographically signed
  - Saved to IPFS
  - Subscribable & cacheable by others

### Frontend/Theme Layer
- Homepage is fully themeable (HTML/CSS/JS or predefined skins)
- Users can apply:
  - MySpace-style pages
  - Classic forums
  - Modern card views
- UI loads content from the post databases, modular and dynamic

### Social Mesh
- Friends and groups can pin your content to help it persist
- Users can subscribe to a full profile or a specific database
- Devices obey sync rules (e.g., "sync photos to phone", "cache books to server")

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

2. **All-in-one (alt.dream) build —** `dev:altdream` can pair **DID/Orbit** social features with the same server; the heavy feed stack is not what runs when you use plain `npm run dev`.

3. **Pure browser, no server mailbox** — Not the focus of the default Ghost path; Orbit/social still exist in the alternative client for experimentation.

Per-chat **storage policy** (retention, video download mode, attachment auto-pin) is **local to the browser** (`localStorage`) on the messages screen; see [`client/src/lib/conversationPolicyStorage.ts`](client/src/lib/conversationPolicyStorage.ts) and [`client/src/lib/chatReplicationProto.ts`](client/src/lib/chatReplicationProto.ts) for the intended alt.dream alignment.

**How this fits alt.dream:** the hub is where you see **cross-app** and **cross-persona** pin health, space, and bandwidth; gHosted contributes **social** traffic and **reference events** (including the `ghosted` bucket) for that dashboard.

---

## Ecosystem (alt.dream and CID map)

gHosted emits **versioned reference events** ([`shared/ecosystemProtocol.ts`](shared/ecosystemProtocol.ts)) when posts, messages, and profile media use IPFS CIDs (with optional **persona** and **bucket** fields for alt.dream). A **CID map** page exists in the client ([`client/src/pages/pin-map.tsx`](client/src/pages/pin-map.tsx)); it is not routed in the **default** Ghost app — use the **altdream** dev build or link it manually for that UI. Exports are still for the [alt.dream](https://github.com/lulzypher/alt-dream) hub. See [`docs/alt-dream-integration.md`](docs/alt-dream-integration.md) for the integration contract.

Planned hub metrics (repo size, pins you support, share/leech bandwidth) are described in [`client/src/lib/altDreamMetrics.ts`](client/src/lib/altDreamMetrics.ts) as typed stubs for the alt.dream UI.

---

## 🚀 Quick Start

### Requirements

- **Node.js 18+**
- **npm** or **pnpm**

### Install & Run

**One-time setup** (Node **18+**, [PostgreSQL](https://www.postgresql.org/) for sign-in and DMs — create a DB and set `DATABASE_URL` in `.env`):

```bash
git clone <your-repo-url>
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

**Social / full alt.dream client (feed, pin-map in router, etc.):**
```bash
npm run dev:altdream
```

### How it runs (local-node model)

gHosted is designed to run **on your own machine**. When you run `npm run dev` (default **messenger** mode):

- The Express server and (for conversations) **Postgres** run **locally** on your machine
- The **Ghost** UI talks to that API; IPFS/Orbit are more prominent in the **`dev:altdream`** client
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
| `npm run dev` | Dev server on port **5000**; **`VITE_APP_MODE=messenger`**, `APP_MODE=messenger` (Ghost) |
| `npm run dev:altdream` | Full social / alt.dream-oriented client (not the default) |
| `npm run dev:messenger` | Same as `dev` (explicit) |
| `npm run build` | Builds altdream + messenger clients + server bundle |
| `npm run build:server` | Server bundle to `dist/` only |
| `npm run start:messenger` | Production: `APP_MODE=messenger` + `node dist/index.js` |
| `npm run tauri:dev` / `tauri:build` | Tauri 2 desktop (needs Rust) |
| `npm run check` | TypeScript check |
| `npm test` | Server tests (e.g. `server/chain.test.ts`) |
