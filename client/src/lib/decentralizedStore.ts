/**
 * Decentralized store: Helia + OrbitDB for P2P sync.
 * When two peers open the same db address, they replicate.
 */

import { createHelia } from "helia";
import { createOrbitDB } from "@orbitdb/core";

let heliaInstance: Awaited<ReturnType<typeof createHelia>> | null = null;
let orbitdbInstance: Awaited<ReturnType<typeof createOrbitDB>> | null = null;

export async function initDecentralizedStore(): Promise<{
  helia: Awaited<ReturnType<typeof createHelia>>;
  orbitdb: Awaited<ReturnType<typeof createOrbitDB>>;
}> {
  if (heliaInstance && orbitdbInstance) {
    return { helia: heliaInstance, orbitdb: orbitdbInstance };
  }

  heliaInstance = await createHelia();
  orbitdbInstance = await createOrbitDB({
    ipfs: heliaInstance,
    directory: "ghosted-orbitdb",
  });

  return { helia: heliaInstance, orbitdb: orbitdbInstance };
}

export async function openEventsDB(name: string) {
  const { orbitdb } = await initDecentralizedStore();
  return orbitdb.open(name);
}

export async function openDocumentsDB(name: string) {
  const { orbitdb } = await initDecentralizedStore();
  return orbitdb.open(name, { type: "documents" });
}

export async function openKeyValueDB(name: string) {
  const { orbitdb } = await initDecentralizedStore();
  return orbitdb.open(name, { type: "keyvalue" });
}
