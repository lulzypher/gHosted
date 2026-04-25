/**
 * Ed25519 identity for did:key (Ghost / alt.dream messenger v1).
 */
import { getPublicKey, sign, utils } from "@noble/ed25519";
import { base58btc } from "multiformats/bases/base58";

function b64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function b64ToU8(s: string): Uint8Array {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

export interface Ed25519Identity {
  /** PKCS8-style: base64(32) secret seed */
  privateKeyB64: string;
  /** Raw 32-byte public key, base64 */
  publicKeyRawB64: string;
  did: string;
}

/** did:key for Ed25519 (multicodec 0xed 0x01 + 32-byte pub, multibase base58btc). */
export function didKeyFromEd25519PublicKey(pub32: Uint8Array): string {
  if (pub32.length !== 32) throw new Error("ed25519 public key must be 32 bytes");
  const payload = new Uint8Array(2 + 32);
  payload[0] = 0xed;
  payload[1] = 0x01;
  payload.set(pub32, 2);
  const multibase = base58btc.encode(payload);
  return `did:key:${multibase}`;
}

export function generateEd25519Identity(): Ed25519Identity {
  const secret = utils.randomPrivateKey();
  const pub = getPublicKey(secret);
  return {
    privateKeyB64: b64(secret),
    publicKeyRawB64: b64(pub),
    did: didKeyFromEd25519PublicKey(pub),
  };
}

export function signUtf8Message(message: string, privateKeyB64: string): string {
  const sk = b64ToU8(privateKeyB64);
  if (sk.length !== 32) throw new Error("invalid ed25519 secret");
  const msg = new TextEncoder().encode(message);
  const s = sign(msg, sk);
  return b64(s);
}
