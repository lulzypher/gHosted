import React from 'react';
import { Route, Switch, Link } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/toaster';

// Simplified Home page
const HomePage = () => (
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

// Simple Auth page (placeholder)
const AuthPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">Login / Register</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Username</label>
          <input 
            type="text" 
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input 
            type="password" 
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <button className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Login
          </button>
        </div>
        <div className="text-center text-sm text-gray-600">
          Don't have an account? <Link href="/register"><span className="text-blue-600 hover:text-blue-800 cursor-pointer">Register</span></Link>
        </div>
      </div>
    </div>
  </div>
);

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
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/about" component={AboutPage} />
        <Route component={NotFoundPage} />
      </Switch>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
