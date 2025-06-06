'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth'; // Keep useAuth to check existing session
import { Loader2, AlertTriangle, LogIn } from 'lucide-react';
import { APIResponse, LoginResponse } from '@college-erp/common';
import apiClient from '@/lib/apiClient';

const CollegeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3.5a1 1 0 00.002 1.792l7 3.5a1 1 0 00.786 0l7-3.5a1 1 0 00.002-1.792l-7-3.5zM3 9V17a1 1 0 001 1h12a1 1 0 001-1V9l-7 3.5L3 9z"></path>
  </svg>
);

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

export default function LoginPage() {
  const [identifier, setIdentifierState] = useState(''); // Renamed to avoid conflict
  const [password, setPasswordState] = useState(''); // Renamed to avoid conflict
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Changed from isLoading to avoid conflict
  
  const router = useRouter();
  const { toast } = useToast();
  const { login: contextLogin, isLoading: authLoading, user, isAuthenticated } = useAuth(); // Get auth context

  useEffect(() => {
    // If user is already authenticated (e.g. from a previous session loaded by AuthContext), redirect
    if (isAuthenticated() && user && !authLoading) {
      router.replace('/dashboard');
    }
  }, [user, isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!identifier.trim()) {
      setError('Student/Employee ID is required.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    setIsSubmitting(true);

    const payload = { identifier, password };
    console.log(`Sending payload to ${BACKEND_API_URL}/auth/login:`, payload);

    try {
      // Use the custom API client for the POST request
      const res = await apiClient.post('/auth/login', payload);

      const data: APIResponse<LoginResponse> = res.data;

      if (!data.success) {
        throw new Error(data.message || data.error || 'An unknown error occurred.');
      }

      // If the request is successful, update localStorage and show success toast
      if (data.data?.token && data.data?.user) {
        localStorage.setItem('authToken', data.data.token);
        localStorage.setItem('authUser', JSON.stringify(data.data.user));
        toast({
          title: 'Login Successful',
          description: 'Redirecting to your dashboard...',
          variant: 'default',
          className: "bg-success text-success-foreground border-success"
        });
        window.location.href = '/dashboard'; // Force reload to ensure AuthContext picks up
      } else {
        throw new Error('Login response was successful but did not contain token or user data.');
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      if (err.message === 'Invalid identifier or password.' || err.status === 401) {
        setError('Failed to login. Please check your credentials.');
      } else {
        setError(err.message || 'An unknown error occurred.');
      }
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading session...</p>
      </div>
    );
  }
  
  // If user becomes authenticated while on this page (e.g. by AuthContext loading from localStorage)
  // And we are not in an error state from a failed login attempt.
  if (isAuthenticated() && user && !error) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Already logged in. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-muted p-4 selection:bg-primary/20">
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center space-x-2">
         <CollegeIcon className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold text-foreground">CollegeERP</span>
      </div>
      <Card className="w-full max-w-md shadow-xl border-border rounded-xl overflow-hidden bg-card">
        <CardHeader className="text-center pt-8 pb-6">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">Welcome Back</CardTitle>
          <CardDescription className="text-muted-foreground pt-1 text-sm sm:text-base">
            Sign in to access your College ERP dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="identifier">Student/Employee ID</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="e.g., 2025000001 or A1234"
                value={identifier}
                onChange={(e) => setIdentifierState(e.target.value)}
                className="shadcn-input h-11 text-sm sm:text-base" 
                autoComplete="username" 
                disabled={isSubmitting || authLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPasswordState(e.target.value)}
                className="shadcn-input h-11 text-sm sm:text-base"
                autoComplete="current-password"
                disabled={isSubmitting || authLoading}
              />
            </div>
            
            {error && (
              <div className="flex items-start p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm shadow-sm">
                <AlertTriangle className="h-5 w-5 mr-2.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-base font-semibold" 
              disabled={isSubmitting || authLoading}
            >
              {(isSubmitting || authLoading) ? ( 
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" /> Sign In
                </>
              )}
            </Button>
          </form>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Having trouble signing in? Please contact IT support.
          </p>
        </CardContent>
      </Card>
       <p className="text-xs text-muted-foreground mt-8 text-center absolute bottom-6">
         © {new Date().getFullYear()} College ERP System. All rights reserved.
       </p>
    </div>
  );
}
