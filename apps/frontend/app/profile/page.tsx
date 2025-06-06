
'use client';
import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Edit } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    let initials = parts[0][0] || '';
    if (parts.length > 1) {
      initials += parts[parts.length - 1][0] || '';
    } else if (name.length > 1) {
      initials = name.substring(0, 2);
    }
    return initials.toUpperCase();
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center">
                <UserCircle className="mr-3 h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                My Profile
            </h1>
            <Button variant="outline" disabled className="w-full sm:w-auto">
                <Edit className="mr-2 h-4 w-4" /> Edit Profile (Soon)
            </Button>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-2 border-primary shadow-md">
                <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'U')}&background=3B82F6&color=FFFFFF&size=128`} alt={user?.username} />
                <AvatarFallback className="text-3xl bg-muted text-muted-foreground">{getInitials(user?.username)}</AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <CardTitle className="text-2xl sm:text-3xl text-foreground">{user?.username}</CardTitle>
                <CardDescription className="text-base text-muted-foreground mt-1">Role: <span className="font-medium text-primary">{user?.role}</span></CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <Label htmlFor="username" className="text-sm font-medium text-muted-foreground">Username</Label>
                <Input id="username" value={user?.username || ''} readOnly disabled className="mt-1 bg-muted/70 border-transparent cursor-not-allowed focus-visible:ring-0 focus-visible:ring-offset-0"/>
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">Email Address</Label>
                <Input id="email" type="email" value={user?.email || ''} readOnly disabled className="mt-1 bg-muted/70 border-transparent cursor-not-allowed focus-visible:ring-0 focus-visible:ring-offset-0"/>
              </div>
            </div>
            <div>
                <Label htmlFor="roleDisplay" className="text-sm font-medium text-muted-foreground">Role</Label>
                <Input id="roleDisplay" value={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || ''} readOnly disabled className="mt-1 bg-muted/70 border-transparent cursor-not-allowed capitalize focus-visible:ring-0 focus-visible:ring-offset-0"/>
            </div>
            
             <div className="border-t border-border pt-6 mt-2">
                <h3 className="text-lg font-semibold text-foreground mb-3">Account Information</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                    <p><span className="font-medium text-foreground/90">Joined:</span> N/A (Feature to be added)</p>
                    <p><span className="font-medium text-foreground/90">Last Login:</span> N/A (Feature to be added)</p>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
