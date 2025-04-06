import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ghost, Loader } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { login, isLoading, error } = useUser();
  const [, navigate] = useLocation();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    await login(data.username, data.password);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center text-2xl font-bold text-accent">
            <Ghost className="h-8 w-8 mr-2" />
            <span>gHosted</span>
          </div>
          <h1 className="text-xl font-bold mt-4">Sign In</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome to your decentralized social network</p>
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
                      placeholder="Enter your username" 
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
                      placeholder="Enter your password" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Sign In
            </Button>
          </form>
        </Form>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center text-sm">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link href="/register">
              <a className="text-primary font-medium hover:underline">
                Sign Up
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

export default Login;
