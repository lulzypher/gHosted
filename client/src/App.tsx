import React, { useEffect, useState } from 'react';
import { Route, Switch, Link, useLocation } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast'; 
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/lib/protected-route';

// Landing page for unauthenticated users
const LandingPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">gHosted</h1>
      <p className="text-gray-600 text-center mb-4">
        A decentralized social platform connecting people across devices.
      </p>
      <div className="flex justify-center gap-4">
        <Link href="/auth">
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Login / Register
          </button>
        </Link>
        <Link href="/about">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100">
            Learn More
          </button>
        </Link>
      </div>
    </div>
  </div>
);

// Dashboard Home page for authenticated users
const HomePage = () => {
  const { user, logoutMutation } = useAuth();
  const navigate = useLocation()[1];
  
  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-blue-600">gHosted</h1>
              </div>
              <nav className="ml-6 flex space-x-8">
                <Link href="/">
                  <button className="inline-flex items-center px-1 pt-1 border-b-2 border-blue-500 text-sm font-medium text-gray-900">
                    Home
                  </button>
                </Link>
                <Link href="/about">
                  <button className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    About
                  </button>
                </Link>
              </nav>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">
                Welcome, {user?.displayName || user?.username}
              </span>
              <button
                onClick={handleLogout}
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-4 flex flex-col items-center justify-center">
              <h2 className="text-2xl font-bold text-gray-700 mb-4">Welcome to your gHosted Dashboard</h2>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                This is your personal dashboard where you'll be able to manage your content,
                connect with peers, and configure your IPFS settings.
              </p>
              <p className="text-gray-500 italic">
                More features coming soon!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
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
    
    // Generate random values for the required fields
    const publicKey = crypto.randomUUID();
    const did = 'did:key:' + crypto.randomUUID();
    
    try {
      await registerMutation.mutateAsync({
        username: formData.username,
        password: formData.password,
        displayName: formData.displayName || formData.username,
        publicKey,
        did
      });
      navigate('/');
    } catch (error) {
      // Error handled by mutation
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          {mode === 'login' ? 'Login to gHosted' : 'Create a new account'}
        </h1>
        
        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input 
              type="text" 
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Display Name</label>
              <input 
                type="text" 
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="How you'll appear to others"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input 
              type="password" 
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <input 
                type="password" 
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
          
          <div>
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
        
        <div className="mt-4 text-center text-sm text-gray-600">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button 
                onClick={() => setMode('register')} 
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button 
                onClick={() => setMode('login')} 
                className="text-blue-600 hover:text-blue-800 font-medium"
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
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-2xl w-full p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">About gHosted</h1>
      <p className="text-gray-600 mb-4">
        gHosted is a cutting-edge decentralized social platform that works across all devices.
        Unlike traditional social networks, gHosted does not rely on central servers 
        and allows you to use the platform even when offline.
      </p>
      <p className="text-gray-600 mb-4">
        Key features:
      </p>
      <ul className="list-disc pl-5 mb-4 text-gray-600">
        <li>Peer-to-peer networking without central servers</li>
        <li>Offline-first functionality</li>
        <li>Content preservation through IPFS technology</li>
        <li>Secure identification with Public Key Cryptography</li>
        <li>Distributed hosting where everyone helps keep the platform alive</li>
      </ul>
      <div className="flex justify-center mt-6">
        <Link href="/">
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Back to Home
          </button>
        </Link>
      </div>
    </div>
  </div>
);

// Not Found page
const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md text-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
      <h2 className="text-2xl font-medium text-gray-600 mb-6">Page Not Found</h2>
      <Link href="/">
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Back to Home
        </button>
      </Link>
    </div>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          <ProtectedRoute path="/" component={HomePage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/about" component={AboutPage} />
          <Route component={NotFoundPage} />
        </Switch>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
