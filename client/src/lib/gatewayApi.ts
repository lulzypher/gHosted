import { getGatewayApiBase } from "./gatewayConfig";
import type { GatewaySession } from "./gatewayAuth";

export type LinkPreview = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

export type Conversation = {
  id: string;
  participantDids: string[];
  encryptionSchemeId?: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview?: string;
  lastMessageAt?: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  authorDid: string;
  contentType: string;
  body: string;
  encrypted: boolean;
  encryptionSchemeId?: string;
  mediaCids: string[];
  linkPreview?: LinkPreview;
  showLinkPreview: boolean;
  replyToId?: string;
  createdAt: string;
};

export type UserProfile = {
  did: string;
  displayName?: string;
  bio?: string;
  avatarCid?: string;
};

export type ApiConfig = { base: string; token: string };

export function apiConfig(session: GatewaySession): ApiConfig {
  return { base: getGatewayApiBase(), token: session.token };
}

async function api<T>(cfg: ApiConfig, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${cfg.base.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export const messengerApi = {
  conversations: (cfg: ApiConfig) => api<{ conversations: Conversation[] }>(cfg, `/messenger/conversations`),
  createConversation: (cfg: ApiConfig, participantDid: string, encryptionSchemeId?: string) =>
    api<{ conversation: Conversation }>(cfg, `/messenger/conversations`, {
      method: "POST",
      body: JSON.stringify({ participantDid, encryptionSchemeId }),
    }),
  messages: (cfg: ApiConfig, conversationId: string, limit = 80) =>
    api<{ messages: ChatMessage[]; conversation: Conversation }>(
      cfg,
      `/messenger/conversations/${conversationId}/messages?limit=${limit}`,
    ),
  sendMessage: (cfg: ApiConfig, payload: Record<string, unknown>) =>
    api<{ message: ChatMessage }>(cfg, `/messenger/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  setEncryption: (cfg: ApiConfig, conversationId: string, schemeId: string) =>
    api(cfg, `/messenger/conversations/${conversationId}/encryption`, {
      method: "PUT",
      body: JSON.stringify({ schemeId }),
    }),
};

export const socialApi = {
  profile: (cfg: ApiConfig, did: string) =>
    api<{ profile: UserProfile }>(cfg, `/social/profiles/${encodeURIComponent(did)}`),
  updateProfile: (cfg: ApiConfig, patch: Record<string, unknown>) =>
    api<{ profile: UserProfile }>(cfg, `/social/profiles/me`, { method: "PUT", body: JSON.stringify(patch) }),
  linkPreview: (cfg: ApiConfig, url: string) =>
    api<{ preview: LinkPreview | null }>(cfg, `/social/link-preview?url=${encodeURIComponent(url)}`),
  searchProfiles: (cfg: ApiConfig, q: string) =>
    api<{ profiles: UserProfile[] }>(cfg, `/social/profiles/search?q=${encodeURIComponent(q)}`),
};

export async function uploadMedia(cfg: ApiConfig, file: File): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("surface", "messenger.offload");
  fd.set("ecosystemBucket", "ghosted");
  const res = await fetch(`${cfg.base.replace(/\/$/, "")}/offload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}` },
    body: fd,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  const j = JSON.parse(text) as { cid?: string };
  if (!j.cid) throw new Error("No CID returned");
  return j.cid;
}

export function blobUrl(cfg: ApiConfig, cid: string): string {
  return `${cfg.base.replace(/\/$/, "")}/blobs/${cid}`;
}

export const BUILTIN_ENCRYPTION_SCHEMES = [
  { id: "none", label: "No encryption (plaintext)" },
  { id: "aes-gcm-passphrase", label: "AES-GCM (shared passphrase)" },
  { id: "xor-demo", label: "XOR demo (not secure)" },
] as const;
