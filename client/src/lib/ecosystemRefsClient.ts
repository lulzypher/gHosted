import type { EcosystemReferenceEvent, ReferenceSurface } from "@shared/ecosystemProtocol";
import { appendReferenceEvents } from "./ecosystemReferenceStore";

const APP_ID = "ghosted";
const ECOSYSTEM_BUCKET = "ghosted" as const;

function personaFields(ownerDid: string, personaDid?: string) {
  return {
    personaDid: personaDid ?? ownerDid,
    ecosystemBucket: ECOSYSTEM_BUCKET,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function sha256HexUtf8(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function pushEvent(ownerDid: string, ev: EcosystemReferenceEvent): void {
  appendReferenceEvents(ownerDid, [ev]);
}

export function recordPostReferences(params: {
  ownerDid: string;
  personaDid?: string;
  contentCid: string;
  postStableRef: string;
  mediaCid?: string | null;
}): void {
  const { ownerDid, personaDid, contentCid, postStableRef, mediaCid } = params;
  const base: Omit<EcosystemReferenceEvent, "relatedCids" | "cid" | "contentDigest"> = {
    schemaVersion: 1,
    kind: "reference",
    appId: APP_ID,
    surface: "post",
    stableRef: postStableRef,
    ownerDid,
    ...personaFields(ownerDid, personaDid),
    timestamp: nowIso(),
  };
  pushEvent(ownerDid, {
    ...base,
    cid: contentCid,
    relatedCids: mediaCid ? [mediaCid] : undefined,
  });
}

export function recordProfileAvatarRef(params: {
  ownerDid: string;
  personaDid?: string;
  avatarCid: string;
}): void {
  const { ownerDid, personaDid, avatarCid } = params;
  pushEvent(ownerDid, {
    schemaVersion: 1,
    kind: "reference",
    appId: APP_ID,
    surface: "profile_avatar",
    stableRef: `${APP_ID}:profile:avatar`,
    ownerDid,
    ...personaFields(ownerDid, personaDid),
    timestamp: nowIso(),
    cid: avatarCid,
  });
}

export function recordMessageReferences(params: {
  ownerDid: string;
  personaDid?: string;
  conversationId: string;
  messageId: number;
  contentCid?: string | null;
  mediaCid?: string | null;
  plaintextForDigest?: string | null;
}): void {
  const { ownerDid, personaDid, conversationId, messageId, contentCid, mediaCid, plaintextForDigest } =
    params;
  const stableRef = `${APP_ID}:message:${conversationId}:${messageId}`;
  const p = personaFields(ownerDid, personaDid);

  if (contentCid || (mediaCid && mediaCid.length > 0)) {
    pushEvent(ownerDid, {
      schemaVersion: 1,
      kind: "reference",
      appId: APP_ID,
      surface: "message",
      stableRef,
      ownerDid,
      ...p,
      timestamp: nowIso(),
      cid: contentCid || undefined,
      relatedCids: mediaCid ? [mediaCid] : undefined,
    });
    return;
  }

  if (plaintextForDigest != null && plaintextForDigest.length > 0) {
    void sha256HexUtf8(plaintextForDigest).then((contentDigest) => {
      pushEvent(ownerDid, {
        schemaVersion: 1,
        kind: "reference",
        appId: APP_ID,
        surface: "message",
        stableRef,
        ownerDid,
        ...p,
        timestamp: nowIso(),
        contentDigest,
      });
    });
  }
}

export function recordGenericCidRef(params: {
  ownerDid: string;
  personaDid?: string;
  cid: string;
  surface: ReferenceSurface;
  stableRef: string;
  relatedCids?: string[];
}): void {
  pushEvent(params.ownerDid, {
    schemaVersion: 1,
    kind: "reference",
    appId: APP_ID,
    surface: params.surface,
    stableRef: params.stableRef,
    ownerDid: params.ownerDid,
    ...personaFields(params.ownerDid, params.personaDid),
    timestamp: nowIso(),
    cid: params.cid,
    relatedCids: params.relatedCids,
  });
}
