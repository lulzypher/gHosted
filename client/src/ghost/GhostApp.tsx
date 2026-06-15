import React from "react";
import { Route, Switch, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { GatewaySessionProvider } from "@/contexts/GatewaySession";
import { GatewayProtectedRoute } from "@/lib/gatewayProtectedRoute";
import GhostMessagesPage from "@/ghost/GhostMessagesPage";
import IdentityPage from "@/ghost/IdentityPage";

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 text-muted-foreground">
      Not found.
    </div>
  );
}

/** gHosted.u messenger — alt.dream gateway inbox (Ghost UI). */
export default function GhostApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <GatewaySessionProvider>
        <Switch>
          <Route path="/">
            <Redirect to="/messages" />
          </Route>
          <Route path="/identity" component={IdentityPage} />
          <GatewayProtectedRoute path="/messages" component={GhostMessagesPage} />
          <Route path="/auth">
            <Redirect to="/identity" />
          </Route>
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </GatewaySessionProvider>
    </QueryClientProvider>
  );
}
