/**
 * Bridges LocalIdentity to the legacy useAuth interface.
 * Uses AuthContext so useAuth() works in decentralized mode.
 */

import React from "react";
import { useLocalIdentity, type DecentralizedUser } from "./LocalIdentityContext";
import { AuthContext } from "@/hooks/use-auth";
import type { User } from "@shared/schema";
import type { UseMutationResult } from "@tanstack/react-query";

function toLegacyUser(u: DecentralizedUser): User {
  return {
    id: 0,
    username: u.username,
    displayName: u.displayName,
    bio: u.bio ?? null,
    avatarCid: u.avatarCid ?? null,
    did: u.did,
    publicKey: u.publicKey,
    password: null,
    encryptionKey: null,
    ipnsAddress: null,
    createdAt: new Date(),
    settings: null,
  } as User;
}

type LoginData = { username: string; password: string; domain?: string };
type RegisterData = Record<string, unknown>;

function createPassThroughMutation<T, E, V>(): UseMutationResult<T, E, V> {
  return {
    mutate: () => {},
    mutateAsync: async () => undefined as T,
    isPending: false,
    isSuccess: false,
    isError: false,
    data: undefined,
    error: null,
    reset: () => {},
    variables: undefined,
    isIdle: true,
    status: "idle",
    context: undefined,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    submittedAt: 0,
    isPlaceholderData: false,
  } as unknown as UseMutationResult<T, E, V>;
}

export function DecentralizedAuthBridge({ children }: { children: React.ReactNode }) {
  const { user: localUser, hasIdentity, isLoading, createIdentity, unlock, lock } = useLocalIdentity();

  const user = localUser ? toLegacyUser(localUser) : null;

  const loginMutation = {
    mutate: (data: LoginData) => {
      unlock(data.password).catch(() => {});
    },
    mutateAsync: async (data: LoginData) => {
      const u = await unlock(data.password);
      return toLegacyUser(u);
    },
    isPending: false,
    isSuccess: false,
    isError: false,
    data: user ?? undefined,
    error: null,
    reset: () => {},
  } as UseMutationResult<User, Error, LoginData>;

  const registerMutation = {
    mutate: (data: RegisterData) => {
      createIdentity(
        {
          username: (data.username as string) || "user",
          displayName: (data.displayName as string) || "User",
          bio: (data.bio as string) || undefined,
        },
        (data.passphrase as string) || (data.password as string) || "changeme"
      ).catch(() => {});
    },
    mutateAsync: async (data: RegisterData) => {
      const u = await createIdentity(
        {
          username: (data.username as string) || "user",
          displayName: (data.displayName as string) || "User",
          bio: (data.bio as string) || undefined,
        },
        (data.passphrase as string) || (data.password as string) || "changeme"
      );
      return toLegacyUser(u);
    },
    isPending: false,
    isSuccess: false,
    isError: false,
    data: user ?? undefined,
    error: null,
    reset: () => {},
    variables: undefined,
    isIdle: true,
    status: "idle",
    context: undefined,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    submittedAt: 0,
    isPlaceholderData: false,
  } as unknown as UseMutationResult<User, Error, RegisterData>;

  const logoutMutation = {
    mutate: () => lock(),
    mutateAsync: async () => { lock(); },
    isPending: false,
    isSuccess: false,
    isError: false,
    data: undefined,
    error: null,
    reset: () => {},
  } as UseMutationResult<void, Error, void>;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoading && !hasIdentity,
        error: null,
        loginMutation,
        logoutMutation,
        registerMutation: registerMutation as any,
        keyLoginMutation: createPassThroughMutation(),
        keyRegisterMutation: createPassThroughMutation(),
        qrLoginMutation: createPassThroughMutation(),
        checkQrSession: createPassThroughMutation(),
      } as any}
    >
      {children}
    </AuthContext.Provider>
  );
}
