
'use client';
import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation'; // Using App Router
import { Loader2, AlertTriangle } from 'lucide-react';
import { APIResponse } from '@college-erp/common';


const loginSchema = z.object({
  username: z.string().min(1, { message: "Username or email is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isLoading: authLoading, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);


  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    try {
      await login(data.username, data.password);
      // Login function in AuthContext handles redirection on success
    } catch (err: any) {
        const apiError = err as APIResponse<null>; // Error from apiClient interceptor
        if (apiError && apiError.message) {
            setError(apiError.message);
        } else if (err.message) {
             setError(err.message);
        }
         else {
            setError("An unexpected error occurred. Please try again.");
        }
    }
  };

  if (isAuthenticated()) { // Prevent flash of login page if already authenticated and redirecting
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm shadow-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-foreground">Welcome Back</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to access your College ERP dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">Username or Email</Label>
              <Input
                id="username"
                type="text"
                placeholder="your.username or user@example.com"
                {...form.register("username")}
                className="shadcn-input"
                autoComplete="username"
              />
              {form.formState.errors.username && (
                <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...form.register("password")}
                className="shadcn-input"
                autoComplete="current-password"
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            
            {error && (
              <div className="flex items-center p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={authLoading}>
              {authLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Forgot your password? Contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
