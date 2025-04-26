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
import { Loader2, QrCode, SmartphoneNfc, ServerCrash, User } from "lucide-react";
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

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
  const [loginMethod, setLoginMethod] = useState<'credentials' | 'qr' | 'domainuser'>('credentials');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrCheckInterval, setQrCheckInterval] = useState<number | null>(null);
  const [qrExpires, setQrExpires] = useState<Date | null>(null);
  const [isQrExpired, setIsQrExpired] = useState<boolean>(false);
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

  // If user is already logged in, redirect to home
  if (user) {
    return <Redirect to="/" />;
  }

  // Generate QR code for authentication
  const generateQRCode = async () => {
    try {
      // Clear any previous intervals
      if (qrCheckInterval) {
        clearInterval(qrCheckInterval);
      }
      
      // Generate a new session ID
      const newSessionId = uuidv4();
      setSessionId(newSessionId);
      
      // Set expiration time (5 minutes from now)
      const expiration = new Date();
      expiration.setMinutes(expiration.getMinutes() + 5);
      setQrExpires(expiration);
      setIsQrExpired(false);
      
      // Create QR code data
      const qrData = {
        type: 'ghosted-auth',
        sessionId: newSessionId,
        serverUrl: window.location.origin,
        timestamp: Date.now(),
        expires: expiration.getTime()
      };
      
      // Generate QR code with simpler options
      const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        margin: 2,
        width: 200
      });
      
      setQrCode(qrCodeUrl);
      
      // Set up interval to check for authentication status
      const intervalId = setInterval(() => {
        // Check if QR code is expired
        if (expiration.getTime() < Date.now()) {
          setIsQrExpired(true);
          clearInterval(intervalId);
          return;
        }
        
        // Check if session is authenticated
        if (sessionId) {
          checkQrSession(sessionId);
        }
      }, 3000);
      
      // Store interval ID for cleanup
      setQrCheckInterval(Number(intervalId));
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };
  
  // Check if QR session is authenticated
  const checkQrSession = (sessionId: string) => {
    // This would typically make a call to the server to check if the session has been authenticated
    // For now, we'll mock this functionality
    console.log("Checking QR session", sessionId);
    // TODO: Implement actual session checking with backend
  };
  
  // Handle login form submission with credentials
  const onLoginSubmit = (data: LoginFormValues) => {
    // Check if it's a username@domain format
    if (data.identifier.includes('@')) {
      const [username, domain] = data.identifier.split('@');
      
      // Login with domain credentials
      loginMutation.mutate({
        username,
        domain,
        password: data.password
      });
    } else {
      // Standard login
      loginMutation.mutate({
        username: data.identifier,
        password: data.password
      });
    }
  };
  
  // Handle QR code login (for mobile devices that scan the code)
  const handleQrLogin = () => {
    if (!sessionId) return;
    
    // In a real implementation, the mobile app would sign the session ID with the user's private key
    // and send it to the server. For now, we'll mock this.
    qrLoginMutation.mutate({
      sessionId,
      signature: "mock-signature", // This would be replaced with a real signature
      publicKey: "mock-public-key" // This would be replaced with the user's public key
    });
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
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

  return (
    <div className="flex min-h-screen">
      {/* Left side - Auth forms */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 p-6 bg-background">
        <div className="w-full max-w-md">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login to gHosted</CardTitle>
                  <CardDescription>
                    Choose how you want to access your account
                  </CardDescription>
                  <div className="flex mt-4 border-b">
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium ${loginMethod === 'credentials' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
                      onClick={() => setLoginMethod('credentials')}
                    >
                      <User className="w-4 h-4 inline mr-2" />
                      Username
                    </button>
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium ${loginMethod === 'domainuser' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
                      onClick={() => setLoginMethod('domainuser')}
                    >
                      <ServerCrash className="w-4 h-4 inline mr-2" />
                      Username@Domain
                    </button>
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium ${loginMethod === 'qr' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
                      onClick={() => {
                        setLoginMethod('qr');
                        generateQRCode();
                      }}
                    >
                      <QrCode className="w-4 h-4 inline mr-2" />
                      QR Code
                    </button>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Username/Password Login Form */}
                  {(loginMethod === 'credentials' || loginMethod === 'domainuser') && (
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                        <FormField
                          control={loginForm.control}
                          name="identifier"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{loginMethod === 'domainuser' ? 'Username@Domain' : 'Username'}</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={loginMethod === 'domainuser' ? 'username@server.domain' : 'your_username'} 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                              {loginMethod === 'domainuser' && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Format: username@servername (e.g., user@homeserver.net)
                                </p>
                              )}
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
                            "Login"
                          )}
                        </Button>
                      </form>
                    </Form>
                  )}

                  {/* QR Code Login */}
                  {loginMethod === 'qr' && (
                    <div className="flex flex-col items-center py-4">
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
                              Generate New QR
                            </Button>
                          </div>
                        ) : qrCode ? (
                          <img 
                            src={qrCode} 
                            alt="Login QR Code" 
                            className="max-w-full"
                          />
                        ) : (
                          <div className="flex items-center justify-center" style={{ width: '200px', height: '200px' }}>
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-center text-muted-foreground mb-4">
                        Scan this QR code with your gHosted mobile app to login
                      </p>
                      {qrExpires && !isQrExpired && (
                        <p className="text-xs text-muted-foreground">
                          Expires in {Math.max(0, Math.floor((qrExpires.getTime() - Date.now()) / 1000))} seconds
                        </p>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={generateQRCode} 
                        className="mt-2"
                      >
                        Generate New QR
                      </Button>
                      <div className="mt-6 text-xs text-muted-foreground text-center">
                        <p>No mobile app? Get started with username login instead.</p>
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-xs"
                          onClick={() => setLoginMethod('credentials')}
                        >
                          Switch to username login
                        </Button>
                      </div>
                    </div>
                  )}
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
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Join gHosted to start creating and sharing content in a decentralized way
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="your_username" {...field} />
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
                              <Input placeholder="Your Name" {...field} />
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
                            <FormLabel>Bio (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Tell us about yourself" 
                                {...field} 
                                value={field.value || ""} 
                              />
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
                              <Input type="password" placeholder="********" {...field} />
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
                              <Input type="password" placeholder="********" {...field} />
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
                            Creating account...
                          </>
                        ) : (
                          "Register"
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
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="max-w-lg text-center">
          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Welcome to gHosted
          </h1>
          <p className="text-xl mb-8">
            A decentralized social platform where your content stays yours.
          </p>
          <div className="space-y-4 text-left">
            <div className="bg-card p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-2">🌐 Truly Distributed</h3>
              <p className="text-muted-foreground">
                All content is stored across a network of peers, making the platform resilient and censorship-resistant.
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-2">🔒 Secure by Design</h3>
              <p className="text-muted-foreground">
                Your identity is secured with public key cryptography, ensuring only you can control your account.
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-2">📱 Available Everywhere</h3>
              <p className="text-muted-foreground">
                Access your content from any device, even when offline, with automatic synchronization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}