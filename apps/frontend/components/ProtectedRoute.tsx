
'use client';
import React, { ReactNode, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { UserRole } from '@college-erp/common';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated()) {
        router.replace('/login');
      } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // User is authenticated but does not have the required role
        router.replace('/dashboard?error=unauthorized_access'); // Or a dedicated unauthorized page
      }
    }
  }, [user, isAuthenticated, isLoading, router, allowedRoles]);

  if (isLoading || !isAuthenticated() || (allowedRoles && user && !allowedRoles.includes(user.role))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading or verifying access...</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
