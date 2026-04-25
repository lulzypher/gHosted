import {
  type EcosystemReferenceEvent,
  parseEcosystemReferenceEvent,
  safeParseEcosystemReferenceEvent,
} from "@shared/ecosystemProtocol";

const STORAGE_PREFIX = "ghosted:ecosystemReferenceEvents:v1:";

function storageKey(ownerDid: string): string {
  return `${STORAGE_PREFIX}${ownerDid}`;
}

export function loadReferenceEvents(ownerDid: string): EcosystemReferenceEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(ownerDid));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown[];
    const out: EcosystemReferenceEvent[] = [];
    for (const item of arr) {
      const r = safeParseEcosystemReferenceEvent(item);
      if (r.success) out.push(r.data);
    }
    return out;
  } catch {
    return [];
  }
}

export function appendReferenceEvents(
  ownerDid: string,
  events: EcosystemReferenceEvent[]
): void {
  if (typeof localStorage === "undefined" || events.length === 0) return;
  const prev = loadReferenceEvents(ownerDid);
  const merged = [...prev, ...events];
  localStorage.setItem(storageKey(ownerDid), JSON.stringify(merged));
}

export function replaceReferenceEvents(
  ownerDid: string,
  events: EcosystemReferenceEvent[]
): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(storageKey(ownerDid), JSON.stringify(events));
}

/** Canonical graph key: real CID or digest-prefixed hex. */
export function canonicalContentKey(ev: EcosystemReferenceEvent): string[] {
  const keys: string[] = [];
  if (ev.cid) keys.push(ev.cid);
  if (ev.relatedCids) keys.push(...ev.relatedCids);
  if (ev.contentDigest) keys.push(`digest:${ev.contentDigest}`);
  return keys;
}

export type UsagePlace = {
  appId: string;
  surface: EcosystemReferenceEvent["surface"];
  stableRef: string;
  timestamp: string;
};

export type CidUsageMap = {
  /** cid or digest:... -> places */
  byAddress: Record<string, UsagePlace[]>;
  /** Addresses referenced from more than one stableRef. */
  multiUseAddresses: string[];
};

export function buildCidUsageMap(events: EcosystemReferenceEvent[]): CidUsageMap {
  const byAddress: Record<string, UsagePlace[]> = {};
  const refSets: Record<string, Set<string>> = {};

  for (const ev of events) {
    const place: UsagePlace = {
      appId: ev.appId,
      surface: ev.surface,
      stableRef: ev.stableRef,
      timestamp: ev.timestamp,
    };
    const keys = canonicalContentKey(ev);
    for (const k of keys) {
      if (!byAddress[k]) byAddress[k] = [];
      byAddress[k].push(place);
      if (!refSets[k]) refSets[k] = new Set();
      refSets[k].add(ev.stableRef);
    }
  }

  const multiUseAddresses = Object.entries(refSets)
    .filter(([, set]) => set.size > 1)
    .map(([k]) => k);

  return { byAddress, multiUseAddresses };
}

export function ingestReferenceEventsJson(
  ownerDid: string,
  json: unknown
): number {
  if (!Array.isArray(json)) return 0;
  const parsed: EcosystemReferenceEvent[] = [];
  for (const item of json) {
    try {
      parsed.push(parseEcosystemReferenceEvent(item));
    } catch {
      /* skip */
    }
  }
  if (parsed.length === 0) return 0;
  appendReferenceEvents(ownerDid, parsed);
  return parsed.length;
}
