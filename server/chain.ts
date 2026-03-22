import { createHash } from "crypto";

export function deterministicCid(input: string): string {
  return `bafy${createHash("sha256").update(input).digest("hex").slice(0, 56)}`;
}

export function buildChainLinkSeed(userId: number, action: string, payloadCid: string, prevCid: string | null) {
  return JSON.stringify({
    userId,
    action,
    payloadCid,
    prevCid: prevCid || null
  });
}

export function buildGroupChainLinkSeed(groupId: number, action: string, payloadCid: string, prevCid: string | null) {
  return JSON.stringify({
    groupId,
    action,
    payloadCid,
    prevCid: prevCid || null
  });
}
