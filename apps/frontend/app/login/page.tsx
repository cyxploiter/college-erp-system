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
import { useRouter } from 'next/navigation'; 
import { Loader2, AlertTriangle, LogIn } from 'lucide-react'; 
import { APIResponse } from '@college-erp/common';

// Placeholder CollegeIcon (can be replaced with an actual SVG or Lucide icon)
const CollegeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3.5a1 1 0 00.002 1.792l7 3.5a1 1 0 00.786 0l7-3.5a1 1 0 00.002-1.792l-7-3.5zM3 9V17a1 1 0 001 1h12a1 1 0 001-1V9l-7 3.5L3 9z"></path>
  </svg>
);

const loginSchema = z.object({
  identifier: z.string().min(1, { message: "Student/Employee ID is required." }), // Changed from username
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
      identifier: "", // Changed from username
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
      await login(data.identifier, data.password); // Pass identifier
    } catch (err: any) {
        const apiError = err as APIResponse<null>; 
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
  
  if (authLoading && !error && !isAuthenticated()) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }
  
  if (isAuthenticated()) { // Handles the case where redirect is happening
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting to dashboard...</p>
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-sm font-medium text-foreground">Student/Employee ID</Label> {/* Changed label */}
              <Input
                id="identifier" // Changed id
                type="text"
                placeholder="e.g., 2025000001 or 10123" // Changed placeholder
                {...form.register("identifier")} // Register identifier
                className="shadcn-input h-11 text-sm sm:text-base" 
                autoComplete="username" // Keep autocomplete as username for browser compatibility if desired, or change to off
              />
              {form.formState.errors.identifier && ( // Check errors for identifier
                <p className="text-xs text-destructive pt-0.5">{form.formState.errors.identifier.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...form.register("password")}
                className="shadcn-input h-11 text-sm sm:text-base"
                autoComplete="current-password"
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive pt-0.5">{form.formState.errors.password.message}</p>
              )}
            </div>
            
            {error && (
              <div className="flex items-start p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm shadow-sm">
                <AlertTriangle className="h-5 w-5 mr-2.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-base font-semibold" disabled={authLoading}>
              {authLoading ? (
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