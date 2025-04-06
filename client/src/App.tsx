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
import HomePageContent from '@/pages/home-page';

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

// Functional Auth Page with Login and Registration
const AuthPage = () => {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = React.useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    username: '',
    password: '',
    displayName: '',
    confirmPassword: '',
  });
  
  // Import the crypto identity hook
  const { 
    generateNewKeys, 
    isGeneratingKeys
  } = useCryptoIdentity();
  
  const navigate = useLocation()[1];
  
  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    setFormData({
      ...formData,
      [target.name]: target.value
    });
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await loginMutation.mutateAsync({
        username: formData.username,
        password: formData.password
      });
      navigate('/');
    } catch (error) {
      // Error handled by mutation
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure your passwords match.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Generate proper cryptographic keys
      toast({
        title: "Generating cryptographic keys",
        description: "This may take a moment...",
      });
      
      const { publicKey, did, encryptedPrivateKey } = await generateNewKeys(formData.password);
      
      toast({
        title: "Keys generated successfully",
        description: "Creating your account...",
      });
      
      // Register with proper cryptographic identity
      await registerMutation.mutateAsync({
        username: formData.username,
        password: formData.password,
        displayName: formData.displayName || formData.username,
        publicKey,
        did
      });
      
      toast({
        title: "Welcome to gHosted!",
        description: "Your account has been created with secure cryptographic identity.",
        variant: "default"
      });
      
      navigate('/');
    } catch (error) {
      // Error handled by mutation
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-6 bg-card rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-foreground">
          {mode === 'login' ? 'Login to gHosted' : 'Create a new account'}
        </h1>
        
        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Username</label>
            <input 
              type="text" 
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-foreground focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
          
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-foreground">Display Name</label>
              <input 
                type="text" 
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="How you'll appear to others"
                className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-foreground focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-foreground">Password</label>
            <input 
              type="password" 
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-foreground focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
          
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-foreground">Confirm Password</label>
              <input 
                type="password" 
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-muted/50 text-foreground focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
          )}
          
          <div>
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {mode === 'login' ? 'Logging in...' : 'Creating account...'}
                </span>
              ) : (
                mode === 'login' ? 'Login' : 'Create Account'
              )}
            </button>
          </div>
        </form>
        
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button 
                onClick={() => setMode('register')} 
                className="text-primary hover:text-primary/80 font-medium"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button 
                onClick={() => setMode('login')} 
                className="text-primary hover:text-primary/80 font-medium"
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

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
        <PeerDiscoveryProvider>
          <Switch>
            <ProtectedRoute path="/" component={HomePage} />
            <Route path="/auth" component={AuthPage} />
            <Route path="/about" component={AboutPage} />
            <Route component={NotFoundPage} />
          </Switch>
          <Toaster />
        </PeerDiscoveryProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
