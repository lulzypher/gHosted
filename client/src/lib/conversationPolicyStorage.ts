import {
  type ConversationPolicy,
  type ParticipantMediaPolicy,
  conversationPolicyZ,
  participantMediaPolicyZ,
} from "@shared/ecosystemProtocol";

const PREFIX = "ghosted:v1:convPolicy:";

export function defaultParticipantPolicy(): ParticipantMediaPolicy {
  return {
    schemaVersion: 1,
    videoMode: "wifi",
    retentionMode: "full",
    pinAttachments: false,
  };
}

function normalizeParticipant(raw: unknown): ParticipantMediaPolicy {
  const base = defaultParticipantPolicy();
  const r = participantMediaPolicyZ.safeParse(raw);
  if (!r.success) return base;
  return { ...base, ...r.data };
}

export function getConversationPolicy(conversationId: string): ConversationPolicy {
  if (typeof localStorage === "undefined") {
    return {
      schemaVersion: 1,
      conversationId,
      devices: { default: defaultParticipantPolicy() },
    };
  }
  try {
    const raw = localStorage.getItem(PREFIX + conversationId);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as unknown;
    const c = conversationPolicyZ.safeParse(parsed);
    if (c.success) {
      const devices = { ...c.data.devices };
      if (!devices.default) devices.default = defaultParticipantPolicy();
      else devices.default = normalizeParticipant(devices.default);
      return { ...c.data, devices };
    }
  } catch {
    /* fall through */
  }
  return {
    schemaVersion: 1,
    conversationId,
    devices: { default: defaultParticipantPolicy() },
  };
}

export function setConversationPolicy(policy: ConversationPolicy): void {
  if (typeof localStorage === "undefined") return;
  const parsed = conversationPolicyZ.parse(policy);
  localStorage.setItem(PREFIX + parsed.conversationId, JSON.stringify(parsed));
}

export function updateDefaultDevicePolicy(
  conversationId: string,
  patch: Partial<ParticipantMediaPolicy>
): ConversationPolicy {
  const cur = getConversationPolicy(conversationId);
  const nextDefault = normalizeParticipant({
    ...cur.devices?.default,
    ...patch,
    schemaVersion: 1,
  });
  const next: ConversationPolicy = {
    schemaVersion: 1,
    conversationId,
    devices: { ...cur.devices, default: nextDefault },
    suggestedMaxAttachmentMb: cur.suggestedMaxAttachmentMb,
  };
  setConversationPolicy(next);
  return next;
}

/** Hook for GC / fetch gates (prototype): returns whether video download is allowed for this chat. */
export function shouldDownloadVideoForConversation(
  conversationId: string,
  isWifi: boolean
): boolean {
  const p = getConversationPolicy(conversationId).devices?.default;
  const mode = p?.videoMode ?? "wifi";
  if (mode === "never") return false;
  if (mode === "always") return true;
  return isWifi;
}
