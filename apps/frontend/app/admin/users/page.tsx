
'use client';
import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Users, UserPlus, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { UserPayload } from '@college-erp/common';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


// In a real app, this endpoint would be paginated and have search/filter capabilities
const fetchAllUsers = async (): Promise<UserPayload[]> => {
  const response = await apiClient.get<{ data: UserPayload[] }>('/users/all-detailed'); // Hypothetical endpoint
  return response.data.data;
};


export default function AdminUsersPage() {
   const { data: users, isLoading, error } = useQuery<UserPayload[], Error>({
    queryKey: ['allAdminUsers'],
    queryFn: fetchAllUsers, // You'd need a service and endpoint for this
  });

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground flex items-center">
                <Users className="mr-3 h-8 w-8 text-primary" />
                User Management
            </h1>
            <Button disabled>
                <UserPlus className="mr-2 h-4 w-4" /> Add New User (Soon)
            </Button>
        </div>
        
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>All System Users</CardTitle>
            <CardDescription>View, edit, and manage user accounts.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading && <p className="text-muted-foreground py-4 text-center">Loading users...</p>}
            {error && (
              <div className="text-destructive bg-destructive/10 p-4 rounded-md flex items-center">
                <AlertCircle className="h-5 w-5 mr-2"/> Error loading users: {error.message}
              </div>
            )}
            {!isLoading && !error && users && users.length === 0 && (
              <p className="text-muted-foreground py-4 text-center">No users found in the system.</p>
            )}
            {!isLoading && !error && users && users.length > 0 && (
              <Table>
                <TableCaption className="text-xs text-muted-foreground">List of all registered users.</TableCaption>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-foreground font-semibold">ID</TableHead>
                    <TableHead className="text-foreground font-semibold">Username</TableHead>
                    <TableHead className="text-foreground font-semibold">Email</TableHead>
                    <TableHead className="text-foreground font-semibold">Role</TableHead>
                    <TableHead className="text-right text-foreground font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-b border-border hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">{user.id}</TableCell>
                      <TableCell className="text-muted-foreground">{user.username}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="text-muted-foreground capitalize">{user.role}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" disabled className="text-primary hover:text-primary/80">Edit</Button>
                        <Button variant="ghost" size="sm" disabled className="text-destructive hover:text-destructive/80 ml-2">Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
