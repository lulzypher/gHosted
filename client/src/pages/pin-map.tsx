import React, { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Header } from "@/components/Header";
import { LeftSidebar } from "@/components/LeftSidebar";
import MobileNavigation from "@/components/MobileNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/contexts/UserContext";
import {
  buildCidUsageMap,
  loadReferenceEvents,
  ingestReferenceEventsJson,
} from "@/lib/ecosystemReferenceStore";
import { ECOSYSTEM_REFERENCE_EXAMPLES } from "@shared/ecosystemProtocol";
import { mergeChatLogEntries, type ChatLogEntry } from "@/lib/chatReplicationProto";
import { ArrowLeft, Download, Map, AlertTriangle } from "lucide-react";

const PinMapPage: React.FC = () => {
  const { user } = useUser();
  const [location] = useLocation();
  const ownerDid = user?.did ?? (user?.id ? `did:ghosted:user:${user.id}` : "");
  const [importText, setImportText] = useState("");

  const events = useMemo(() => {
    if (!ownerDid) return [];
    return loadReferenceEvents(ownerDid);
  }, [ownerDid, location]);

  const usage = useMemo(() => buildCidUsageMap(events), [events]);

  const demoMerge = useMemo(() => {
    const a: ChatLogEntry[] = [
      {
        schemaVersion: 1,
        conversationId: "demo",
        seq: 0,
        senderDid: "did:example:a",
        payloadCid: "bafyexample0",
        sentAt: "2026-01-01T00:00:00.000Z",
        prevEntryHash: "0".repeat(64),
        signature: "unsigned-dev",
      },
    ];
    const b: ChatLogEntry[] = [
      {
        schemaVersion: 1,
        conversationId: "demo",
        seq: 0,
        senderDid: "did:example:a",
        payloadCid: "bafyexample0",
        sentAt: "2026-01-01T00:00:01.000Z",
        prevEntryHash: "0".repeat(64),
        signature: "unsigned-dev",
      },
      {
        schemaVersion: 1,
        conversationId: "demo",
        seq: 1,
        senderDid: "did:example:b",
        payloadCid: "bafyexample1",
        sentAt: "2026-01-01T00:00:02.000Z",
        prevEntryHash: "a".repeat(64),
        signature: "unsigned-dev",
      },
    ];
    return mergeChatLogEntries(a, b);
  }, []);

  const loadExamples = () => {
    if (!ownerDid) return;
    const ex = ECOSYSTEM_REFERENCE_EXAMPLES.map((e) => ({
      ...e,
      ownerDid,
      personaDid: ownerDid,
    }));
    ingestReferenceEventsJson(ownerDid, ex);
    window.location.reload();
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ghosted-ecosystem-refs-${ownerDid.replace(/[^a-z0-9]+/gi, "-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doImport = () => {
    if (!ownerDid || !importText.trim()) return;
    try {
      const parsed = JSON.parse(importText) as unknown;
      const n = ingestReferenceEventsJson(ownerDid, parsed);
      setImportText("");
      alert(`Imported ${n} reference event(s). Reloading.`);
      window.location.reload();
    } catch {
      alert("Invalid JSON");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Sign in to view your CID usage map.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-4 flex flex-col md:flex-row gap-4">
        <LeftSidebar />
        <div className="flex-1 space-y-4 max-w-4xl">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Map className="h-6 w-6" /> CID usage map
            </h1>
          </div>

          <p className="text-sm text-muted-foreground">
            Each row is a content address (IPFS CID or digest). Places that reference the same address are merged
            here so you can decide what to pin once. Export JSON for the{" "}
            <a
              className="text-primary underline"
              href="https://github.com/lulzypher/alt-dream"
              target="_blank"
              rel="noreferrer"
            >
              alt.dream
            </a>{" "}
            hub to visualize across apps and personas.
          </p>

          <Card>
            <CardHeader>
              <CardTitle>Multi-use content</CardTitle>
              <CardDescription>
                Same CID (or digest) appears in more than one place — pinning helps all of them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {usage.multiUseAddresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No duplicate references yet. Send messages or create posts with shared attachments.</p>
              ) : (
                <ul className="space-y-2">
                  {usage.multiUseAddresses.map((addr) => (
                    <li key={addr} className="rounded-md border p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <code className="text-xs break-all">{addr}</code>
                          <ul className="mt-2 text-sm list-disc pl-4 space-y-1">
                            {(usage.byAddress[addr] || []).map((p, i) => (
                              <li key={`${p.stableRef}-${i}`}>
                                <span className="font-medium">{p.appId}</span> / {p.surface} —{" "}
                                <code className="text-xs">{p.stableRef}</code>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Full map</CardTitle>
              <CardDescription>Directed view: address → referencing places.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[420px] overflow-y-auto space-y-3">
                {Object.keys(usage.byAddress).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reference events recorded yet.</p>
                ) : (
                  Object.entries(usage.byAddress).map(([addr, places]) => (
                    <div key={addr} className="border rounded-md p-2 text-sm">
                      <div className="font-mono text-xs break-all text-primary mb-1">{addr}</div>
                      <ul className="list-disc pl-4 text-muted-foreground">
                        {places.map((p, i) => (
                          <li key={`${p.stableRef}-${i}`}>
                            {p.surface} — {p.stableRef}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Replication prototype (signed log)</CardTitle>
              <CardDescription>
                Merge helper demo for participant-held message logs (see <code className="text-xs">chatReplicationProto.ts</code>).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">Merged seq count: {demoMerge.length}</p>
              <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto max-h-40">
                {JSON.stringify(demoMerge, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Import / export</CardTitle>
              <CardDescription>For alt.dream and other ecosystem apps.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={exportJson} disabled={events.length === 0}>
                  <Download className="h-4 w-4 mr-1" /> Export events JSON
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={loadExamples}>
                  Load example events
                </Button>
              </div>
              <textarea
                className="w-full min-h-[100px] text-xs font-mono border rounded-md p-2 bg-background"
                placeholder="Paste JSON array of EcosystemReferenceEvent objects…"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <Button type="button" size="sm" onClick={doImport} disabled={!importText.trim()}>
                Import into this browser
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNavigation />
    </div>
  );
};

export default PinMapPage;
