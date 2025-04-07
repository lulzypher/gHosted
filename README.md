# gHosted: Truly Decentralized Social Media

A cutting-edge decentralized social media platform that enables secure, privacy-focused peer-to-peer networking with advanced cryptographic identity management and innovative user interaction design.

## Key Features

- Truly Decentralized Architecture
- Cross-Platform Compatibility
- Offline-First Design
- Selective Content Preservation
- Direct Device Synchronization
- Local DNS Resolution
- Facebook-Style Interface
- End-to-End Encryption

## Technology Stack

- Frontend: React, TypeScript, Tailwind CSS, Shadcn UI
- Backend: Node.js, Express
- Storage: IPFS (InterPlanetary File System)
- Database: PostgreSQL with Drizzle ORM
- Authentication: Password auth + DIDs
- Encryption: Web Crypto API
- P2P Communication: WebRTC, PeerJS, WebSockets
- Local Storage: IndexedDB for offline data

## Architecture

gHosted uses a hybrid architecture combining traditional web technologies with decentralized components:

1. **PC Component**: Runs a full js-ipfs node, stores all content, and acts as a relay for mobile devices
2. **Mobile Component**: Runs a lightweight js-ipfs node, stores relevant content locally, syncs with PC when on the same network
3. **Web Portal**: Uses local DNS resolution on each users machine rather than traditional domain resolution
4. **Identity System**: Combines traditional authentication with decentralized identity principles using Public Key Cryptography
5. **Content Routing**: Users only host their own content and content they explicitly pin (heart/love)

## Current Status

The project is in active development with the following components implemented:

- Facebook-style dark-themed UI
- Network infrastructure for peer discovery and connection
- QR code-based device pairing system
- Enhanced offline capabilities with conflict resolution
- IndexedDB for local data storage
- Distributed hosting system with IPFS integration
- P2P connectivity framework

## License

This project is licensed under the MIT License.
