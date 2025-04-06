import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Ghost, Loader } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { v4 as uuidv4 } from 'uuid';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  bio: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const { register, isLoading, error } = useUser();
  const [, navigate] = useLocation();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      displayName: '',
      bio: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    // Generate a DID and public key (simplified for demo)
    const did = `did:ipfs:${uuidv4()}`;
    const publicKey = `${uuidv4()}`; // In a real app, this would be a proper key pair

    await register({
      ...data,
      did,
      publicKey,
    });

    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center text-2xl font-bold text-accent">
            <Ghost className="h-8 w-8 mr-2" />
            <span>gHosted</span>
          </div>
          <h1 className="text-xl font-bold mt-4">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join the decentralized social network</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Choose a username" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Create a password" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Your public display name" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell us about yourself" 
                      {...field} 
                      disabled={isLoading}
                      className="resize-none"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700 mb-2">
              <p className="font-medium">Important:</p>
              <p>This will create your decentralized identity (DID) and key pair for secure content storage.</p>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Create Account
            </Button>
          </form>
        </Form>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center text-sm">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link href="/login">
              <a className="text-primary font-medium hover:underline">
                Sign In
              </a>
            </Link>
          </p>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>gHosted - Decentralized social media using IPFS</p>
          <p className="mt-1">Your data stays with you, always</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
