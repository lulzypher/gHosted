/**
 * Centralized IPFS gateway for resolving CIDs.
 * Set VITE_IPFS_GATEWAY to override (e.g. https://cloudflare-ipfs.com)
 */
const GATEWAY_BASE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_IPFS_GATEWAY
  ? String(import.meta.env.VITE_IPFS_GATEWAY).replace(/\/$/, '')
  : 'https://ipfs.io';

/** Build full URL for an IPFS CID (e.g. https://ipfs.io/ipfs/Qm...) */
export function ipfsUrl(cid: string): string {
  if (!cid) return '';
  const base = GATEWAY_BASE.endsWith('/ipfs') ? GATEWAY_BASE : `${GATEWAY_BASE}/ipfs`;
  return `${base}/${cid}`;
}
