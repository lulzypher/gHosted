import React, { useEffect, useState } from 'react';
import { Route, Switch, Link, useLocation } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast'; 
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/lib/protected-route';
import { useCryptoIdentity } from '@/hooks/use-crypto-identity';
import { PeerDiscoveryProvider } from '@/contexts/PeerDiscoveryContext';
import { SyncProvider } from '@/contexts/SyncContext';
import { P2PProvider } from '@/contexts/P2PContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { IPFSProvider } from '@/contexts/IPFSContext';
import { UserProvider } from '@/contexts/UserContext';
import { ConflictResolution } from '@/components/ConflictResolution';
import { DebugPanel } from '@/components/DebugPanel';
import HomePageContent from '@/pages/home-page';
import MessagingPage from '@/pages/messaging';
import UserProfile from '@/pages/user-profile';
import Profile from '@/pages/profile';
import UsersDirectory from '@/pages/users-directory';
import AuthPage from '@/pages/auth-page';
import logoImage from "@assets/logoTransparent1.png";

// Landing page for unauthenticated users
const LandingPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="max-w-md w-full p-6 bg-card rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6 text-foreground">gHosted</h1>
      <p className="text-muted-foreground text-center mb-4">
        A decentralized social platform connecting people across devices.
      </p>
      <div className="flex justify-center gap-4">
        <Link href="/auth">
          <a className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Login / Register
          </a>
        </Link>
        <Link href="/about">
          <a className="px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted/50">
            Learn More
          </a>
        </Link>
      </div>
    </div>
  </div>
);

// Home page is now imported from pages/home-page.tsx
const HomePage = () => {
  return <HomePageContent />;
};

// Import AuthPage from its dedicated file instead of defining it here

// About page
const AboutPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="max-w-2xl w-full p-6 bg-card rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6 text-foreground">About gHosted</h1>
      <p className="text-muted-foreground mb-4">
        gHosted is a cutting-edge decentralized social platform that works across all devices.
        Unlike traditional social networks, gHosted does not rely on central servers 
        and allows you to use the platform even when offline.
      </p>
      <p className="text-foreground mb-4">
        Key features:
      </p>
      <ul className="list-disc pl-5 mb-4 text-muted-foreground">
        <li>Peer-to-peer networking without central servers</li>
        <li>Offline-first functionality</li>
        <li>Content preservation through IPFS technology</li>
        <li>Secure identification with Public Key Cryptography</li>
        <li>Distributed hosting where everyone helps keep the platform alive</li>
      </ul>
      <div className="flex justify-center mt-6">
        <Link href="/">
          <a className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Back to Home
          </a>
        </Link>
      </div>
    </div>
  </div>
);

// Not Found page
const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="max-w-md w-full p-6 bg-card rounded-lg shadow-md text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-medium text-foreground mb-6">Page Not Found</h2>
      <Link href="/">
        <a className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Back to Home
        </a>
      </Link>
    </div>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* User provider for user data and authentication state */}
        <UserProvider>
          {/* WebSocket provider for real-time messaging */}
          <WebSocketProvider>
            {/* IPFS provider for decentralized storage */}
            <IPFSProvider>
              {/* Rearranged context providers to avoid circular dependencies */}
              <SyncProvider>
                <P2PProvider>
                  <PeerDiscoveryProvider>
                    <Switch>
                      <ProtectedRoute path="/" component={HomePage} />
                      <ProtectedRoute path="/messages" component={MessagingPage} />
                      <ProtectedRoute path="/profile" component={Profile} />
                      <ProtectedRoute path="/users" component={UsersDirectory} />
                      <ProtectedRoute path="/user/:id" component={UserProfile} />
                      <Route path="/auth" component={AuthPage} />
                      <Route path="/about" component={AboutPage} />
                      <Route component={NotFoundPage} />
                    </Switch>
                    {/* Show conflict resolution dialog when needed */}
                    <ConflictResolution />
                    <Toaster />
                    {/* Debug panel to diagnose session inconsistencies */}
                    <DebugPanel />
                  </PeerDiscoveryProvider>
                </P2PProvider>
              </SyncProvider>
            </IPFSProvider>
          </WebSocketProvider>
        </UserProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
