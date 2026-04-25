# gHosted – Group Hosted Social

**gHosted** is a fully decentralized, customizable, peer-to-peer social and media platform built on top of **IPFS**, **DIDs**, and **CRDTs**. You own your identity, your content, your network — across devices, with no central server.

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

gHosted currently has **two messaging paths**:

1. **Server mode (Postgres + logged-in account)** — Conversations and messages go through **your Express API** (`/api/conversations`, WebSockets for live updates). Payloads are stored as rows (`private_messages`, etc.); large bodies can use **IPFS CIDs** on the message row. Delivery is **scoped to whoever runs that node** (your machine or your host), not to the whole public IPFS name space. Development mode may store simplified “encrypted” JSON for local testing.

2. **Fully decentralized (browser-only DID, no DB)** — The Messages UI is **not available** (`ServerRequiredFallback`) in this build because there is no shared mailbox relay wired for pure browser peers yet. Posts and profiles still use OrbitDB + IPFS on the client.

Per-chat **storage policy** (retention, video download mode, attachment auto-pin) is **local to the browser** (`localStorage`) from the Messages screen and is meant to line up with a future **participant-held** model ([`client/src/lib/chatReplicationProto.ts`](client/src/lib/chatReplicationProto.ts)).

**How this fits alt.dream:** the hub is where you see **cross-app** and **cross-persona** pin health, space, and bandwidth; gHosted contributes **social** traffic and **reference events** (including the `ghosted` bucket) for that dashboard.

---

## Ecosystem (alt.dream and CID map)

gHosted emits **versioned reference events** ([`shared/ecosystemProtocol.ts`](shared/ecosystemProtocol.ts)) when posts, messages, and profile media use IPFS CIDs (with optional **persona** and **bucket** fields for alt.dream). The **CID map** UI at `/pin-map` aggregates them in the browser, highlights when the **same content address** is reused in multiple places, and exports JSON for the [alt.dream](https://github.com/lulzypher/alt-dream) hub. See [`docs/alt-dream-integration.md`](docs/alt-dream-integration.md) for the integration contract.

Planned hub metrics (repo size, pins you support, share/leech bandwidth) are described in [`client/src/lib/altDreamMetrics.ts`](client/src/lib/altDreamMetrics.ts) as typed stubs for the alt.dream UI.

---

## 🚀 Quick Start

### Requirements

- **Node.js 18+**
- **npm** or **pnpm**

### Install & Run

```bash
# Clone and install
git clone <your-repo-url>
cd gHosted

npm install

# Start the app (dev server + API)
npm run dev
```

Open **http://localhost:5000** in your browser.

### How it runs (local-node model)

gHosted is designed to run **on your own machine**. When you run `npm run dev`:

- The Express server and (optionally) Postgres run **locally on your PC**
- There is no central cloud; each user runs their own node
- Content syncs between nodes via IPFS, OrbitDB, and Helia
- Your data stays with you — Postgres (when used) is for your local node's state only

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

| Command      | Description                    |
| ------------ | ------------------------------ |
| `npm run dev`  | Start dev server (port 5000)   |
| `npm run build`| Build for production           |
| `npm run check`| TypeScript check               |
