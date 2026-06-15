export async function encryptBody(schemeId: string, plaintext: string, secret: string): Promise<string> {
  if (schemeId === "none") return plaintext;
  if (schemeId === "xor-demo") return xorDemo(plaintext, secret || "demo");
  return aesGcmEncrypt(plaintext, secret);
}

export async function decryptBodyFixed(schemeId: string, payload: string, secret: string): Promise<string> {
  if (schemeId === "none") return payload;
  if (schemeId === "xor-demo") {
    try {
      return xorDemoDecode(payload, secret || "demo");
    } catch {
      return "[xor demo decode failed]";
    }
  }
  try {
    return await aesGcmDecrypt(payload, secret);
  } catch {
    return "[encrypted — unlock with shared passphrase]";
  }
}

function xorDemo(text: string, key: string): string {
  const enc = new TextEncoder();
  const bytes = enc.encode(text);
  const kb = enc.encode(key);
  const out = bytes.map((b, i) => b ^ kb[i % kb.length]!);
  return btoa(String.fromCharCode(...out));
}

function xorDemoDecode(b64: string, key: string): string {
  const raw = atob(b64);
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  const kb = new TextEncoder().encode(key);
  const out = bytes.map((b, i) => b ^ kb[i % kb.length]!);
  return new TextDecoder().decode(out);
}

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("altdream.chat.v1"), iterations: 100_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function aesGcmEncrypt(plaintext: string, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  const packed = new Uint8Array(iv.length + ct.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...packed));
}

async function aesGcmDecrypt(b64: string, passphrase: string): Promise<string> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);
  const key = await deriveKey(passphrase);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

export function extractUrls(text: string): string[] {
  const m = text.match(/https?:\/\/[^\s]+/g);
  return m ?? [];
}

export const EMOJI_QUICK = ["👍", "❤️", "😂", "🔥", "👻", "🎉"];
