import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  keyLoginMutation: UseMutationResult<User, Error, KeyLoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, InsertUser>;
  keyRegisterMutation: UseMutationResult<User, Error, KeyRegisterData>;
  qrLoginMutation: UseMutationResult<User, Error, QrLoginData>;
  checkQrSession: UseMutationResult<QrSessionStatus, Error, string>;
};

// Extended login data to support username@domain
type LoginData = {
  username: string;
  password: string;
  domain?: string;
};

// Key-based login (challenge-response, no password to server)
type KeyLoginData = {
  challengeId: string;
  challenge: string;
  publicKey: string;
  signature: string;
};

// Key-only registration
type KeyRegisterData = {
  challengeId: string;
  signature: string;
  username: string;
  displayName: string;
  bio?: string;
  did: string;
  publicKey: string;
  avatarCid?: string;
};

// QR code login data
type QrLoginData = {
  sessionId: string;
  signature: string;
  publicKey: string;
  deviceId?: string;
};

// QR session status
type QrSessionStatus = {
  status: 'pending' | 'authenticated' | 'expired' | 'invalid';
  userId?: number;
  username?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Welcome back!",
        description: `You're now logged in as ${user.displayName || user.username}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const keyLoginMutation = useMutation({
    mutationFn: async (data: KeyLoginData) => {
      const res = await apiRequest("POST", "/api/auth/verify", {
        challengeId: data.challengeId,
        publicKey: data.publicKey,
        signature: data.signature,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Key login failed");
      }
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Welcome back!",
        description: `You're now logged in as ${user.displayName || user.username}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Key login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", userData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Registration failed");
      }
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Account created",
        description: "Your account has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const keyRegisterMutation = useMutation({
    mutationFn: async (data: KeyRegisterData) => {
      const res = await apiRequest("POST", "/api/register/key", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Registration failed");
      }
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Account created",
        description: "Your decentralized identity has been registered.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Logout failed");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // QR code login mutation
  const qrLoginMutation = useMutation({
    mutationFn: async (qrData: QrLoginData) => {
      const res = await apiRequest("POST", "/api/qr-login", qrData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "QR login failed");
      }
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Welcome back!",
        description: `You're now logged in as ${user.displayName || user.username}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "QR login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check QR session status
  const checkQrSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest("GET", `/api/qr-session/${sessionId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to check QR session");
      }
      return await res.json();
    },
    onError: (error: Error) => {
      console.error("Error checking QR session:", error);
      return {
        status: 'error' as 'pending', // Type hack since our status doesn't include 'error'
        error: error.message
      };
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        keyLoginMutation,
        logoutMutation,
        registerMutation,
        keyRegisterMutation,
        qrLoginMutation,
        checkQrSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}