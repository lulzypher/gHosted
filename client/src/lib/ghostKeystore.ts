import { encryptPrivateKey, decryptPrivateKey, type EncryptedData } from "@/lib/cryptography";
import type { Ed25519Identity } from "@/lib/ed25519Identity";

const STORAGE_KEY = "ghost_messenger_identity_v1";

type KeystorePayloadV1 = {
  v: 1;
  algorithm: "Ed25519";
  privateKeyB64: string;
  did: string;
  publicKeyRawB64: string;
  createdAt: string;
};

export function hasLocalIdentity(): boolean {
  return Boolean(localStorage.getItem(STORAGE_KEY));
}

export async function saveNewIdentity(identity: Ed25519Identity, passphrase: string): Promise<void> {
  const json: KeystorePayloadV1 = {
    v: 1,
    algorithm: "Ed25519",
    privateKeyB64: identity.privateKeyB64,
    did: identity.did,
    publicKeyRawB64: identity.publicKeyRawB64,
    createdAt: new Date().toISOString(),
  };
  const enc: EncryptedData = await encryptPrivateKey(JSON.stringify(json), passphrase);
  const bundle = { iv: enc.iv, ciphertext: enc.ciphertext };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
}

export async function loadIdentity(passphrase: string): Promise<KeystorePayloadV1> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error("No local identity");
  const bundle = JSON.parse(raw) as EncryptedData;
  const dec = await decryptPrivateKey(
    { iv: bundle.iv, ciphertext: typeof bundle.ciphertext === "string" ? bundle.ciphertext : "" },
    passphrase
  );
  return JSON.parse(dec) as KeystorePayloadV1;
}

export function clearLocalIdentity(): void {
  localStorage.removeItem(STORAGE_KEY);
}
