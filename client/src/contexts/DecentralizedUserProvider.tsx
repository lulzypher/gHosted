/**
 * Provides useUser() with data from LocalIdentity in decentralized mode.
 */

import React from "react";
import { useLocalIdentity } from "./LocalIdentityContext";
import { UserContext } from "./UserContext";
import type { User } from "@/types";
import type { Device } from "@/types";

function toLegacyUser(u: ReturnType<typeof useLocalIdentity>["user"]): User | null {
  if (!u) return null;
  return {
    id: 0,
    username: u.username,
    displayName: u.displayName,
    bio: u.bio,
    avatarCid: u.avatarCid,
    did: u.did,
    publicKey: u.publicKey,
  } as User;
}

export function DecentralizedUserProvider({ children }: { children: React.ReactNode }) {
  const { user: localUser, lock } = useLocalIdentity();
  const user = toLegacyUser(localUser);

  const logout = () => lock();

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading: false,
        error: null,
        devices: [],
        login: async () => {},
        register: async () => {},
        logout,
        getCurrentDevice: () => undefined as Device | undefined,
        isMobileDevice: () => /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent),
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
