import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  clearGatewaySession,
  loginToGateway,
  readGatewaySession,
  saveGatewaySession,
  type GatewaySession,
} from "@/lib/gatewayAuth";
import { apiConfig, socialApi } from "@/lib/gatewayApi";

type Ctx = {
  session: GatewaySession | null;
  isLoading: boolean;
  login: (did: string, privateKeyB64: string) => Promise<void>;
  logout: () => void;
  api: ReturnType<typeof apiConfig> | null;
};

const GatewaySessionContext = createContext<Ctx | null>(null);

export function GatewaySessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<GatewaySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSession(readGatewaySession());
    setIsLoading(false);
  }, []);

  const login = useCallback(async (did: string, privateKeyB64: string) => {
    const s = await loginToGateway(did, privateKeyB64);
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    clearGatewaySession();
    setSession(null);
  }, []);

  const api = useMemo(() => (session ? apiConfig(session) : null), [session]);

  return (
    <GatewaySessionContext.Provider value={{ session, isLoading, login, logout, api }}>
      {children}
    </GatewaySessionContext.Provider>
  );
}

export function useGatewaySession() {
  const ctx = useContext(GatewaySessionContext);
  if (!ctx) throw new Error("useGatewaySession requires GatewaySessionProvider");
  return ctx;
}

export async function ensureProfile(api: NonNullable<Ctx["api"]>, displayName: string): Promise<void> {
  try {
    await socialApi.updateProfile(api, { displayName });
  } catch {
    /* profile may already exist */
  }
}

export { saveGatewaySession };
