import React from "react";
import { Route, Switch, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { ProtectedRoute } from "@/lib/protected-route";
import MessagingPage from "@/pages/messaging";
import IdentityPage from "@/ghost/IdentityPage";

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 text-muted-foreground">
      Not found.
    </div>
  );
}

/** Standalone Ghost messenger: did:key session + Telegram-like UI. */
export default function GhostApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <Switch>
            <Route path="/">
              <Redirect to="/messages" />
            </Route>
            <Route path="/identity" component={IdentityPage} />
            <ProtectedRoute path="/messages" component={MessagingPage} />
            <Route path="/auth">
              <Redirect to="/identity" />
            </Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
