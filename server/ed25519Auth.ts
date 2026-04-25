import { verify } from "@noble/ed25519";
import { Buffer } from "node:buffer";

/** Stored in `users.public_key` for Ed25519 users (distinguishes from RSA SPKI). */
export const ED25519_STORE_PREFIX = "ed25519:";

export function storedEd25519PublicKeyFromRawB64(rawPublicKeyBase64: string): string {
  return `${ED25519_STORE_PREFIX}${rawPublicKeyBase64}`;
}

export function verifyEd25519Signature(
  challengeUtf8: string,
  signatureBase64: string,
  rawPublicKeyBase64: string
): boolean {
  try {
    const pub = Buffer.from(rawPublicKeyBase64, "base64");
    if (pub.length !== 32) return false;
    const sig = Buffer.from(signatureBase64, "base64");
    if (sig.length !== 64) return false;
    const msg = Buffer.from(challengeUtf8, "utf8");
    return verify(new Uint8Array(sig), new Uint8Array(msg), new Uint8Array(pub));
  } catch {
    return false;
  }
}
