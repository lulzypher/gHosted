/**
 * Decentralized identity context - no server.
 * Identity = keys + DID. Unlock with passphrase to "log in".
 */

import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import {
  hasStoredIdentity,
  createIdentity,
  unlockIdentity,
  updateStoredProfile,
  getPublicIdentity,
  type LocalIdentity,
  type LocalProfile,
} from "@/lib/localIdentity";

// Compatible with components expecting a "user" object
export interface DecentralizedUser {
  id: string;
  did: string;
  publicKey: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarCid?: string;
  _identity?: LocalIdentity;
}

interface LocalIdentityContextType {
  user: DecentralizedUser | null;
  isUnlocked: boolean;
  hasIdentity: boolean;
  isLoading: boolean;
  createIdentity: (profile: LocalProfile, passphrase: string) => Promise<DecentralizedUser>;
  unlock: (passphrase: string) => Promise<DecentralizedUser>;
  lock: () => void;
  updateProfile: (profile: Partial<LocalProfile>) => void;
  getPrivateKey: () => string | null;
}

const LocalIdentityContext = createContext<LocalIdentityContextType | undefined>(undefined);

function identityToUser(identity: LocalIdentity): DecentralizedUser {
  return {
    id: identity.did,
    did: identity.did,
    publicKey: identity.publicKey,
    username: identity.profile.username,
    displayName: identity.profile.displayName,
    bio: identity.profile.bio,
    avatarCid: identity.profile.avatarCid,
    _identity: identity,
  };
}

export const LocalIdentityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DecentralizedUser | null>(null);
  const [hasIdentity, setHasIdentity] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setHasIdentity(hasStoredIdentity());
    setIsLoading(false);
  }, []);

  const handleCreateIdentity = useCallback(async (profile: LocalProfile, passphrase: string): Promise<DecentralizedUser> => {
    const identity = await createIdentity(profile, passphrase);
    const u = identityToUser(identity);
    setUser(u);
    setHasIdentity(true);
    return u;
  }, []);

  const handleUnlock = useCallback(async (passphrase: string): Promise<DecentralizedUser> => {
    const identity = await unlockIdentity(passphrase);
    const u = identityToUser(identity);
    setUser(u);
    return u;
  }, []);

  const handleLock = useCallback(() => {
    setUser(null);
  }, []);

  const handleUpdateProfile = useCallback((updates: Partial<LocalProfile>) => {
    if (!user?._identity) return;
    const newProfile = { ...user._identity.profile, ...updates };
    updateStoredProfile(newProfile);
    setUser(identityToUser({ ...user._identity, profile: newProfile }));
  }, [user]);

  const getPrivateKey = useCallback(() => user?._identity?.privateKey ?? null, [user]);

  return (
    <LocalIdentityContext.Provider
      value={{
        user,
        isUnlocked: !!user,
        hasIdentity,
        isLoading,
        createIdentity: handleCreateIdentity,
        unlock: handleUnlock,
        lock: handleLock,
        updateProfile: handleUpdateProfile,
        getPrivateKey,
      }}
    >
      {children}
    </LocalIdentityContext.Provider>
  );
};

export function useLocalIdentity() {
  const ctx = useContext(LocalIdentityContext);
  if (ctx === undefined) throw new Error("useLocalIdentity must be used within LocalIdentityProvider");
  return ctx;
}
