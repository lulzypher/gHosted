/**
 * Decentralized identity - no server, keys only.
 * Identity = keypair + DID. Profile stored locally (later: IPFS + chain).
 */

import { generateKeyPair, encryptPrivateKey, decryptPrivateKey, signMessage, generateDID } from "./cryptography";

const IDENTITY_STORAGE = "ghosted_identity";
const PROFILE_STORAGE = "ghosted_profile";

export interface LocalProfile {
  username: string;
  displayName: string;
  bio?: string;
  avatarCid?: string;
  preferredHandle?: string;
}

export interface StoredIdentity {
  did: string;
  publicKey: string;
  encryptedPrivateKey: string;
  createdAt: string;
}

export interface LocalIdentity {
  did: string;
  publicKey: string;
  privateKey: string;
  profile: LocalProfile;
}

function getStorage(): Storage {
  if (typeof window === "undefined" || !window.localStorage) throw new Error("localStorage required");
  return window.localStorage;
}

/** Check if an identity exists locally */
export function hasStoredIdentity(): boolean {
  try {
    return !!getStorage().getItem(IDENTITY_STORAGE);
  } catch {
    return false;
  }
}

/** Create new identity (generate keys, encrypt, store). No server. */
export async function createIdentity(
  profile: LocalProfile,
  passphrase: string
): Promise<LocalIdentity> {
  const { publicKey, privateKey } = await generateKeyPair();
  const did = generateDID(publicKey);
  const encrypted = await encryptPrivateKey(privateKey, passphrase);

  const stored: StoredIdentity = {
    did,
    publicKey,
    encryptedPrivateKey: JSON.stringify(encrypted),
    createdAt: new Date().toISOString(),
  };
  getStorage().setItem(IDENTITY_STORAGE, JSON.stringify(stored));
  getStorage().setItem(PROFILE_STORAGE, JSON.stringify(profile));

  return { did, publicKey, privateKey, profile };
}

/** Unlock identity with passphrase. Returns identity or throws. */
export async function unlockIdentity(passphrase: string): Promise<LocalIdentity> {
  const raw = getStorage().getItem(IDENTITY_STORAGE);
  const profileRaw = getStorage().getItem(PROFILE_STORAGE);
  if (!raw) throw new Error("No identity found. Create one first.");

  const stored: StoredIdentity = JSON.parse(raw);
  const profile: LocalProfile = profileRaw
    ? JSON.parse(profileRaw)
    : { username: "anonymous", displayName: "Anonymous" };

  const encrypted = JSON.parse(stored.encryptedPrivateKey);
  const privateKey = await decryptPrivateKey(encrypted, passphrase);

  return {
    did: stored.did,
    publicKey: stored.publicKey,
    privateKey,
    profile,
  };
}

/** Update profile (identity must be unlocked). */
export function updateStoredProfile(profile: LocalProfile): void {
  getStorage().setItem(PROFILE_STORAGE, JSON.stringify(profile));
}

/** Get public identity without unlocking (for display when locked). */
export function getPublicIdentity(): { did: string; publicKey: string; profile: LocalProfile } | null {
  try {
    const raw = getStorage().getItem(IDENTITY_STORAGE);
    const profileRaw = getStorage().getItem(PROFILE_STORAGE);
    if (!raw) return null;
    const stored: StoredIdentity = JSON.parse(raw);
    const profile: LocalProfile = profileRaw
      ? JSON.parse(profileRaw)
      : { username: "anonymous", displayName: "Anonymous" };
    return { did: stored.did, publicKey: stored.publicKey, profile };
  } catch {
    return null;
  }
}

/** Sign data with identity. Call after unlock. */
export async function signWithIdentity(data: string, privateKey: string): Promise<string> {
  return signMessage(data, privateKey);
}

/** Lock: clear identity from memory. Keys stay encrypted on disk. */
export function lockIdentity(): void {
  // No-op for now - the context will clear its state
  // Keys are never stored in plaintext in memory across lock
}
