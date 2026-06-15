import React, { useState } from "react";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GhostLogo } from "./GhostLogo";
import "./telegramTheme.css";
import {
  generateEd25519Identity,
  type Ed25519Identity,
} from "@/lib/ed25519Identity";
import { hasLocalIdentity, loadIdentity, saveNewIdentity } from "@/lib/ghostKeystore";
import { useGatewaySession, ensureProfile } from "@/contexts/GatewaySession";
import { Loader2 } from "lucide-react";
import { apiConfig } from "@/lib/gatewayApi";
import { readGatewaySession } from "@/lib/gatewayAuth";

export default function IdentityPage() {
  const { session, login } = useGatewaySession();
  const { toast } = useToast();
  const [tab, setTab] = useState<"create" | "unlock">(hasLocalIdentity() ? "unlock" : "create");
  const [submitting, setSubmitting] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [unlockPass, setUnlockPass] = useState("");
  const [preview, setPreview] = useState<Ed25519Identity | null>(null);

  if (session) {
    return <Redirect to="/messages" />;
  }

  const onGenerate = () => {
    const id = generateEd25519Identity();
    setPreview(id);
    toast({ title: "Keys ready", description: "Your did:key is below. Back it up with your passphrase on create." });
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass.length < 6) {
      toast({ title: "Passphrase too short", variant: "destructive" });
      return;
    }
    if (pass !== pass2) {
      toast({ title: "Passphrases do not match", variant: "destructive" });
      return;
    }
    if (!displayName.trim()) {
      toast({ title: "Display name required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const id = preview ?? generateEd25519Identity();
      await saveNewIdentity(id, pass);
      await login(id.did, id.privateKeyB64);
      const s = readGatewaySession();
      if (s) await ensureProfile(apiConfig(s), displayName.trim());
      setPreview(null);
      toast({ title: "Signed in", description: "Connected to alt.dream gateway." });
    } catch (err) {
      toast({
        title: "Setup failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const k = await loadIdentity(unlockPass);
      if (k.algorithm !== "Ed25519") throw new Error("Unsupported keystore");
      await login(k.did, k.privateKeyB64);
      toast({ title: "Signed in", description: "Connected to alt.dream gateway." });
    } catch (err) {
      toast({
        title: "Unlock failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen ghost-telegram flex items-center justify-center p-4 bg-tg-bg text-tg">
      <Card className="w-full max-w-md border-tg bg-tg-sidebar text-tg shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <GhostLogo className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl">Ghost</CardTitle>
          <CardDescription className="text-tg-muted">
            Sign in to your alt.dream gateway. Passphrase encrypts your key on this device only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "create" | "unlock")}>
            <TabsList className="grid w-full grid-cols-2 bg-tg-bg">
              <TabsTrigger value="create">New identity</TabsTrigger>
              <TabsTrigger value="unlock" disabled={!hasLocalIdentity()}>
                Unlock
              </TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="mt-4 space-y-3">
              <form onSubmit={onCreate} className="space-y-3">
                <div>
                  <Label htmlFor="d">Display name</Label>
                  <Input
                    id="d"
                    className="bg-tg-bg border-tg"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="p">Passphrase (locks keystore on this device)</Label>
                  <Input
                    id="p"
                    type="password"
                    className="bg-tg-bg border-tg"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <Label htmlFor="p2">Confirm passphrase</Label>
                  <Input
                    id="p2"
                    type="password"
                    className="bg-tg-bg border-tg"
                    value={pass2}
                    onChange={(e) => setPass2(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                {preview && (
                  <p className="text-xs break-all text-tg-muted">
                    <span className="text-tg font-medium">did:</span> {preview.did}
                  </p>
                )}
                <Button type="button" variant="outline" className="w-full border-tg" onClick={onGenerate} disabled={submitting}>
                  Generate keys
                </Button>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create & sign in"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="unlock" className="mt-4">
              <form onSubmit={onUnlock} className="space-y-3">
                <div>
                  <Label htmlFor="up">Passphrase</Label>
                  <Input
                    id="up"
                    type="password"
                    className="bg-tg-bg border-tg"
                    value={unlockPass}
                    onChange={(e) => setUnlockPass(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlock & sign in"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
