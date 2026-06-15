function bytesToBinaryString(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return s;
}

function binaryStringToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

export function base64UrlEncode(bytes: Uint8Array): string {
  const b64 = btoa(bytesToBinaryString(bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return binaryStringToBytes(atob(b64));
}

export function utf8Encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export function challengeSigningMessage(nonce: string): Uint8Array {
  return utf8Encode(`alt.dream login challenge\n${nonce}`);
}
