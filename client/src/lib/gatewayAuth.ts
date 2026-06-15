import { sign } from "@noble/ed25519";
import { base64UrlEncode, challengeSigningMessage } from "./base64url";
import { getGatewayApiBase } from "./gatewayConfig";

const SESSION_KEY = "ghost_gateway_session_v1";

export type GatewaySession = {
  did: string;
  token: string;
  expiresAt: string;
  privateKeyB64: string;
};

function b64ToU8(s: string): Uint8Array {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

export function readGatewaySession(): GatewaySession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GatewaySession;
    if (!s.token || !s.did?.startsWith("did:key:")) return null;
    if (new Date(s.expiresAt).getTime() < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function saveGatewaySession(session: GatewaySession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearGatewaySession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function loginToGateway(did: string, privateKeyB64: string): Promise<GatewaySession> {
  const base = getGatewayApiBase();
  const chRes = await fetch(`${base}/auth/challenge`, { method: "POST" });
  if (!chRes.ok) throw new Error(`Gateway challenge failed: ${chRes.status}`);
  const { nonce } = (await chRes.json()) as { nonce: string };

  const sk = b64ToU8(privateKeyB64);
  const sig = await sign(challengeSigningMessage(nonce), sk);
  const loginRes = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ did, nonce, signature: base64UrlEncode(sig) }),
  });
  if (!loginRes.ok) {
    const err = await loginRes.text();
    throw new Error(`Gateway login failed: ${loginRes.status} ${err}`);
  }
  const body = (await loginRes.json()) as { token: string; did: string; expiresAt: string };
  const session: GatewaySession = {
    did: body.did,
    token: body.token,
    expiresAt: body.expiresAt,
    privateKeyB64,
  };
  saveGatewaySession(session);
  return session;
}
