/**
 * Decentralized auth - no server. Create or unlock identity locally.
 */

import { useState } from "react";
import { useLocalIdentity } from "@/contexts/LocalIdentityContext";
import { Redirect } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, KeyRound } from "lucide-react";
import logoImage from "@assets/logoTransparent1.png";
import { useToast } from "@/hooks/use-toast";

const registerSchema = z
  .object({
    username: z.string().min(3).max(30),
    displayName: z.string().min(2).max(50),
    bio: z.string().max(200).optional(),
    passphrase: z.string().min(6, "Passphrase protects your key (min 6 chars)"),
    passphraseConfirm: z.string().min(6),
  })
  .refine((d) => d.passphrase === d.passphraseConfirm, {
    message: "Passphrases do not match",
    path: ["passphraseConfirm"],
  });

const unlockSchema = z.object({
  passphrase: z.string().min(1, "Passphrase required"),
});

type RegisterValues = z.infer<typeof registerSchema>;
type UnlockValues = z.infer<typeof unlockSchema>;

export default function DecentralizedAuthPage() {
  const { user, hasIdentity, createIdentity, unlock, isLoading } = useLocalIdentity();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", displayName: "", bio: "", passphrase: "", passphraseConfirm: "" },
  });

  const unlockForm = useForm<UnlockValues>({
    resolver: zodResolver(unlockSchema),
    defaultValues: { passphrase: "" },
  });

  const handleCreate = async (data: RegisterValues) => {
    setError(null);
    setCreating(true);
    try {
      await createIdentity(
        {
          username: data.username,
          displayName: data.displayName,
          bio: data.bio,
        },
        data.passphrase
      );
      toast({ title: "Identity created", description: "You’re in. No server, no middleman." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create identity";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleUnlock = async (data: UnlockValues) => {
    setError(null);
    setUnlocking(true);
    try {
      await unlock(data.passphrase);
      toast({ title: "Welcome back", description: "Identity unlocked." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Incorrect passphrase";
      setError(msg);
      toast({ title: "Unlock failed", description: msg, variant: "destructive" });
    } finally {
      setUnlocking(false);
    }
  };

  if (user) return <Redirect to="/" />;

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img src={logoImage} alt="gHosted" className="h-24 w-24" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">gHosted</h1>
          <p className="text-center text-muted-foreground mb-8">
            Decentralized. No server. Your keys, your chain.
          </p>

          <Tabs defaultValue={hasIdentity ? "unlock" : "create"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create identity</TabsTrigger>
              <TabsTrigger value="unlock">Unlock</TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5" />
                    New identity
                  </CardTitle>
                  <CardDescription>
                    Generate keys locally. No registration, no middleman. Passphrase encrypts your key.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <div className="mb-4 p-3 rounded bg-destructive/10 text-destructive text-sm">
                      {error}
                    </div>
                  )}
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(handleCreate)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="alice" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display name</FormLabel>
                            <FormControl>
                              <Input placeholder="Alice" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Developer" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="passphrase"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Passphrase</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Min 6 chars" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="passphraseConfirm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm passphrase</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={creating}>
                        {creating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create identity"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="unlock">
              <Card>
                <CardHeader>
                  <CardTitle>Unlock identity</CardTitle>
                  <CardDescription>
                    Enter your passphrase to unlock your keys.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <div className="mb-4 p-3 rounded bg-destructive/10 text-destructive text-sm">
                      {error}
                    </div>
                  )}
                  <Form {...unlockForm}>
                    <form onSubmit={unlockForm.handleSubmit(handleUnlock)} className="space-y-4">
                      <FormField
                        control={unlockForm.control}
                        name="passphrase"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Passphrase</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={unlocking}>
                        {unlocking ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Unlocking...
                          </>
                        ) : (
                          "Unlock"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary/90 to-indigo-600 text-primary-foreground items-center justify-center p-8">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold mb-4">No middleman</h2>
          <p className="mb-4">
            When you meet another person with gHosted, you connect directly. Your identity lives on your device.
          </p>
          <ul className="space-y-2 text-sm opacity-90">
            <li>• Keys generated locally</li>
            <li>• No server registration</li>
            <li>• Data syncs peer-to-peer</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
