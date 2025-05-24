# gHosted – Group Hosted Social

**gHosted** is a fully decentralized, customizable, peer-to-peer social and media platform built on top of **IPFS**, **DIDs**, and **CRDTs**. You own your identity, your content, your network — across devices, with no central server.

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

## 🚧 Installation & Development (Early Stage)

> ⚠️ Development is in early prototyping.

### Requirements:
- Node.js 18+
- IPFS daemon (local or embedded)
- Browser or Electron-based environment

### Setup:
UNFINISH PROJECT
