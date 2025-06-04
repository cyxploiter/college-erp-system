
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
    if (parts.length > 1) {
      return parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground flex items-center">
                <UserCircle className="mr-3 h-8 w-8 text-primary" />
                My Profile
            </h1>
            <Button variant="outline" disabled>
                <Edit className="mr-2 h-4 w-4" /> Edit Profile (Soon)
            </Button>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20 border-2 border-primary">
                <AvatarImage src={`https://avatars.githubusercontent.com/${user?.username}?size=80`} alt={user?.username} />
                <AvatarFallback className="text-2xl bg-muted text-muted-foreground">{getInitials(user?.username)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl text-foreground">{user?.username}</CardTitle>
                <CardDescription className="text-muted-foreground">Role: {user?.role}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="username" className="text-sm font-medium text-muted-foreground">Username</Label>
                <Input id="username" value={user?.username || ''} readOnly disabled className="mt-1 bg-muted/50 cursor-not-allowed"/>
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">Email Address</Label>
                <Input id="email" type="email" value={user?.email || ''} readOnly disabled className="mt-1 bg-muted/50 cursor-not-allowed"/>
              </div>
            </div>
            <div>
                <Label htmlFor="role" className="text-sm font-medium text-muted-foreground">Role</Label>
                <Input id="role" value={user?.role || ''} readOnly disabled className="mt-1 bg-muted/50 cursor-not-allowed"/>
            </div>
            {/* Add more profile fields here as needed, e.g., department, join date etc. */}
            {/* These would typically come from a more detailed user profile API endpoint */}
             <div className="border-t border-border pt-6 mt-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">Account Information</h3>
                <p className="text-sm text-muted-foreground">
                    Joined: N/A (Placeholder - fetch from user details) <br />
                    Last Login: N/A (Placeholder)
                </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
