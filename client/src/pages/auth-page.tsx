import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCryptoIdentity } from "@/hooks/use-crypto-identity";
import { Redirect } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
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
import { Loader2, QrCode, SmartphoneNfc, ServerCrash } from "lucide-react";
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import logoImage from "@assets/logoTransparent1.png";

// Login schema with support for username@domain
const loginSchema = z.object({
  identifier: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Registration schema - extend the insertUserSchema
const registerSchema = insertUserSchema
  .pick({
    username: true,
    password: true,
    displayName: true,
    bio: true,
    did: true,
    publicKey: true,
  })
  .extend({
    password: z.string().min(6, "Password must be at least 6 characters"),
    passwordConfirm: z.string().min(6, "Password confirmation is required"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords do not match",
    path: ["passwordConfirm"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

// Handle clearInterval and setInterval typings (fixes Window type issues)
declare global {
  interface Window {
    clearInterval(id: number | null): void;
    setInterval(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
  }
}

export default function AuthPage() {
  const { user, loginMutation, registerMutation, qrLoginMutation } = useAuth();
  const { generateNewKeys } = useCryptoIdentity();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrCheckInterval, setQrCheckInterval] = useState<number | null>(null);
  const [qrExpiry, setQrExpiry] = useState<number>(Date.now() + 5 * 60 * 1000); // 5 minutes
  const [isQrExpired, setIsQrExpired] = useState<boolean>(false);
  const [qrError, setQrError] = useState<boolean>(false);
  const [qrSessionStatus, setQrSessionStatus] = useState<'pending' | 'authenticated' | 'expired' | 'invalid'>('pending');
  const qrCanvasRef = useRef<HTMLDivElement>(null);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      passwordConfirm: "",
      displayName: "",
      bio: "",
      did: "", // Will be auto-generated on submit
      publicKey: "", // Will be auto-generated on submit
    },
  });

  // We'll handle redirect after all hooks have been called

  // Generate QR code for authentication
  const generateQRCode = async () => {
    try {
      setQrError(false);
      // Clear any previous intervals
      if (qrCheckInterval) {
        clearInterval(qrCheckInterval);
      }
      
      // Generate a new session ID
      const newSessionId = uuidv4();
      setSessionId(newSessionId);
      
      // Set expiration time (5 minutes from now)
      const expiryTime = Date.now() + 5 * 60 * 1000;
      setQrExpiry(expiryTime);
      setIsQrExpired(false);
      setQrSessionStatus('pending');
      
      // Create QR code data
      const qrData = {
        type: 'ghosted-auth',
        sessionId: newSessionId,
        serverUrl: window.location.origin,
        timestamp: Date.now(),
        expires: expiryTime
      };
      
      // Generate QR code with simpler options
      const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        margin: 2,
        width: 200
      });
      
      setQrDataUrl(qrCodeUrl);
      
      // Set up interval to check for authentication status
      const intervalId = setInterval(() => {
        // Check if QR code is expired
        if (expiryTime < Date.now()) {
          setIsQrExpired(true);
          setQrSessionStatus('expired');
          clearInterval(intervalId);
          return;
        }
        
        // Check if session is authenticated
        if (sessionId) {
          checkQrSession(newSessionId);
        }
      }, 3000);
      
      // Store interval ID for cleanup
      setQrCheckInterval(Number(intervalId));
    } catch (error) {
      console.error('Error generating QR code:', error);
      setQrError(true);
    }
  };
  
  // Check if QR session is authenticated
  const checkQrSession = (sessionId: string) => {
    // This would typically make a call to the server to check if the session has been authenticated
    // For now, we'll mock this functionality
    console.log("Checking QR session", sessionId);
    // TODO: Implement actual session checking with backend
  };
  
  // Handle login form submission with domain user
  const handleLogin = (data: LoginFormValues) => {
    // For domain user login
    if (data.identifier.includes('@')) {
      const [username, domain] = data.identifier.split('@');
      
      // Login with domain credentials
      loginMutation.mutate({
        username,
        domain,
        password: data.password
      });
    } else {
      // Error - must use domain format
      loginForm.setError("identifier", {
        type: "manual",
        message: "Please use the username@domain format"
      });
    }
  };
  
  const handleRegister = async (data: RegisterFormValues) => {
    try {
      // Generate proper cryptographic keys using our utility
      const keyPair = await generateNewKeys(data.password);
      
      // Generate a proper DID from the public key
      const did = `did:ghosted:${keyPair.publicKey.substring(0, 16)}`;
      
      // Remove passwordConfirm from data before sending to API
      const { passwordConfirm, ...userData } = data;
      
      registerMutation.mutate({
        ...userData,
        did,
        publicKey: keyPair.publicKey,
      });
    } catch (error) {
      console.error("Error generating cryptographic keys:", error);
      
      // Fallback to simpler key generation if the advanced crypto fails
      const did = `did:ghosted:${Math.random().toString(36).substring(2, 15)}`;
      const publicKey = `${Math.random().toString(36).substring(2, 15)}.${Math.random().toString(36).substring(2, 15)}`;
      
      // Remove passwordConfirm from data before sending to API
      const { passwordConfirm, ...userData } = data;
      
      registerMutation.mutate({
        ...userData,
        did,
        publicKey,
      });
    }
  };

  // Effect to generate QR code when component loads
  useEffect(() => {
    if (activeTab === "login") {
      generateQRCode();
    }
    
    return () => {
      if (qrCheckInterval) {
        clearInterval(qrCheckInterval);
      }
    };
  }, [activeTab]);

  // After all hooks are called, we can safely redirect if user is logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Auth forms */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img src={logoImage} alt="gHosted Logo" className="h-24 w-24" />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent text-3xl font-bold">
                    Welcome to gHosted
                  </CardTitle>
                  <CardDescription className="text-center">
                    The decentralized social platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* QR Code Login */}
                  <div className="flex flex-col items-center py-4 mb-6">
                    <h3 className="text-lg font-medium mb-4">Scan QR Code to Login</h3>
                    <div ref={qrCanvasRef} className="bg-white p-3 rounded-lg mb-4">
                      {isQrExpired ? (
                        <div className="flex flex-col items-center justify-center" style={{ width: '200px', height: '200px' }}>
                          <p className="text-destructive font-medium">QR Code Expired</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={generateQRCode} 
                            className="mt-2"
                          >
                            Generate New QR Code
                          </Button>
                        </div>
                      ) : (
                        qrError ? (
                          <div className="flex flex-col items-center justify-center" style={{ width: '200px', height: '200px' }}>
                            <p className="text-destructive font-medium">Error generating QR code</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={generateQRCode} 
                              className="mt-2"
                            >
                              Try Again
                            </Button>
                          </div>
                        ) : (
                          qrDataUrl ? (
                            <img 
                              src={qrDataUrl} 
                              alt="Login QR Code" 
                              className="max-w-full"
                            />
                          ) : (
                            <div className="flex items-center justify-center" style={{ width: '200px', height: '200px' }}>
                              <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            </div>
                          )
                        )
                      )}
                    </div>
                    <p className="text-sm text-center text-muted-foreground mb-2">
                      Scan with your mobile device to login
                    </p>
                    <p className="text-xs text-center text-muted-foreground">
                      QR code expires in {Math.max(0, Math.floor((qrExpiry - Date.now()) / 1000))} seconds
                    </p>
                    {qrSessionStatus === 'authenticated' && (
                      <p className="text-sm text-center text-green-500 font-medium mt-2">
                        Authentication successful! Redirecting...
                      </p>
                    )}
                  </div>
                  
                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-muted-foreground/30"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Login Options</span>
                    </div>
                  </div>

                  {/* Temporary Development Login */}
                  <div className="mb-6">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 mb-4">
                      <h3 className="text-sm font-semibold text-amber-500 mb-1">Development Mode</h3>
                      <p className="text-xs text-muted-foreground">
                        This simplified login is available during development. 
                        Enter any username and password to create a new account.
                      </p>
                    </div>
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit((data) => {
                        // Simple dev login that works without domain
                        loginMutation.mutate({
                          username: data.identifier,
                          password: data.password
                        });
                      })} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="identifier"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Development Username</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="any-username" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="any-password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full bg-amber-500 hover:bg-amber-600" 
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Logging in...
                            </>
                          ) : (
                            "Development Login"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </div>

                  {/* Domain user login */}
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-3">Domain Authentication</h3>
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="identifier"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username@Domain</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="username@server.domain" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                              <p className="text-xs text-muted-foreground mt-1">
                                Format: username@servername (e.g., user@homeserver.net)
                              </p>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="********" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Logging in...
                            </>
                          ) : (
                            "Login with Domain"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Button variant="link" className="p-0" onClick={() => setActiveTab("register")}>
                      Register
                    </Button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent text-3xl font-bold">
                    Create Account
                  </CardTitle>
                  <CardDescription className="text-center">
                    Join the decentralized social revolution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 mb-4">
                    <h3 className="text-sm font-semibold text-amber-500 mb-1">Development Mode Registration</h3>
                    <p className="text-xs text-muted-foreground">
                      Create a new account with any details for development testing.
                      This form generates cryptographic keys just like in production.
                    </p>
                  </div>
                  
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Choose a username" {...field} />
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
                            <FormLabel>Display Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your public display name" {...field} />
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
                            <FormLabel>Bio</FormLabel>
                            <FormControl>
                              <Input placeholder="A short description about yourself" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Create a strong password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="passwordConfirm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm your password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Button variant="link" className="p-0" onClick={() => setActiveTab("login")}>
                      Login
                    </Button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero/Info section */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary/90 to-indigo-600 text-primary-foreground">
        <div className="flex flex-col justify-center items-center p-8 w-full">
          <h1 className="text-4xl font-bold mb-6 text-center">Decentralized Social Networking</h1>
          <div className="space-y-4 max-w-md">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
              <h3 className="text-xl font-bold mb-2">Truly Decentralized</h3>
              <p>No central servers, no trackers, no censorship. Your data lives on your devices and those you choose to share with.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
              <h3 className="text-xl font-bold mb-2">Content Preservation</h3>
              <p>Content you appreciate is stored on your device. Use ❤️ to pin content to your PC and ❤️‍🔥 to pin it to all your devices.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
              <h3 className="text-xl font-bold mb-2">Offline First</h3>
              <p>Browse and interact even when offline. Your activity will sync automatically when connectivity is restored.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
              <h3 className="text-xl font-bold mb-2">Local-Network Sync</h3>
              <p>Your devices find each other on the same network and automatically sync content without requiring internet access.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}