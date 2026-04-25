import { z } from "zod";

/** Protocol version string for manifests and docs. */
export const ECOSYSTEM_PROTOCOL_VERSION = "1.0.0" as const;

/** Where in an app a CID (or digest) is referenced. */
export const referenceSurfaceZ = z.enum([
  "post",
  "message",
  "profile_avatar",
  "profile_banner",
  "attachment",
  "pin_registry",
  "other",
]);

export type ReferenceSurface = z.infer<typeof referenceSurfaceZ>;

/**
 * Cross-app reference: links a content address (IPFS CID and/or digest) to a stable place id.
 * alt.dream and other hub shells merge these into a CID usage graph, optionally grouped by persona and bucket.
 */
export const ecosystemReferenceEventZ = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal("reference"),
    appId: z.string().min(1),
    surface: referenceSurfaceZ,
    /** Opaque id stable for that object in that app (e.g. post:42, msg:7). */
    stableRef: z.string().min(1),
    ownerDid: z.string().min(1),
    /** Persona DID when different from the emitting account context (defaults to ownerDid in UIs). */
    personaDid: z.string().min(1).optional(),
    /** Per-persona app bucket: e.g. ghosted, shadowbox, archivebox. */
    ecosystemBucket: z.string().min(1).optional(),
    /** ISO-8601 */
    timestamp: z.string(),
    /** Primary IPFS CID when applicable. */
    cid: z.string().min(1).optional(),
    /** Additional CIDs (e.g. separate media block). */
    relatedCids: z.array(z.string().min(1)).optional(),
    /** sha256 hex of canonical bytes when no IPFS CID yet (e.g. plaintext body fingerprint). */
    contentDigest: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((val, ctx) => {
    const hasAddr =
      Boolean(val.cid) ||
      Boolean(val.relatedCids?.length) ||
      Boolean(val.contentDigest);
    if (!hasAddr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide cid, relatedCids, or contentDigest",
      });
    }
  });

export type EcosystemReferenceEvent = z.infer<typeof ecosystemReferenceEventZ>;

export function parseEcosystemReferenceEvent(
  input: unknown
): EcosystemReferenceEvent {
  return ecosystemReferenceEventZ.parse(input);
}

export function safeParseEcosystemReferenceEvent(
  input: unknown
): z.SafeParseReturnType<unknown, EcosystemReferenceEvent> {
  return ecosystemReferenceEventZ.safeParse(input);
}

/** User intent to retain a CID locally / in mesh (for pin dashboards). */
export const pinIntentZ = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("pin_intent"),
  ownerDid: z.string().min(1),
  personaDid: z.string().min(1).optional(),
  ecosystemBucket: z.string().min(1).optional(),
  cid: z.string().min(1),
  createdAt: z.string(),
  reason: z.string().max(500).optional(),
  /** Places this pin is intended to cover (from reference events). */
  stableRefs: z.array(z.string()).optional(),
});

export type PinIntent = z.infer<typeof pinIntentZ>;

const videoModeZ = z.enum(["never", "wifi", "always"]);
const retentionModeZ = z.enum(["full", "window", "ephemeral"]);

/** Published or local-only hints for how this device handles a conversation. */
export const participantMediaPolicyZ = z.object({
  schemaVersion: z.literal(1).optional(),
  videoMode: videoModeZ.optional(),
  /** Max total bytes of attachment payloads to keep pinned locally for this chat. */
  maxAttachmentBytes: z.number().int().positive().optional(),
  /** Drop message bodies older than N days (local enforcement). */
  retentionDays: z.number().int().nonnegative().optional(),
  /** When `window`, keep at most this many recent messages. */
  maxMessages: z.number().int().positive().optional(),
  retentionMode: retentionModeZ.optional(),
  /** If true, auto-pin attachment CIDs you receive (subject to caps). */
  pinAttachments: z.boolean().optional(),
});

export type ParticipantMediaPolicy = z.infer<typeof participantMediaPolicyZ>;

export const conversationPolicyZ = z.object({
  schemaVersion: z.literal(1),
  conversationId: z.string().min(1),
  /** Per-device policy; key is opaque device label or "default". */
  devices: z.record(z.string(), participantMediaPolicyZ).optional(),
  /** Suggested cap for attachments in this room (not enforceable on others). */
  suggestedMaxAttachmentMb: z.number().positive().optional(),
});

export type ConversationPolicy = z.infer<typeof conversationPolicyZ>;

/** Example events for tests and alt.dream integration (non-normative). */
export const ECOSYSTEM_REFERENCE_EXAMPLES: EcosystemReferenceEvent[] = [
  {
    schemaVersion: 1,
    kind: "reference",
    appId: "ghosted",
    surface: "post",
    stableRef: "ghosted:post:101",
    ownerDid: "did:example:alice",
    personaDid: "did:example:alice",
    ecosystemBucket: "ghosted",
    timestamp: "2026-01-15T12:00:00.000Z",
    cid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    relatedCids: ["bafybeifakeimagecidfakeimagecidfakeim"],
  },
  {
    schemaVersion: 1,
    kind: "reference",
    appId: "ghosted",
    surface: "message",
    stableRef: "ghosted:message:convA:55",
    ownerDid: "did:example:alice",
    personaDid: "did:example:alice",
    ecosystemBucket: "ghosted",
    timestamp: "2026-01-15T12:05:00.000Z",
    cid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  },
];
