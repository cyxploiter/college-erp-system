
'use client';
import React, { useState, useMemo } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Users, UserPlus, AlertCircle, Briefcase, GraduationCap, Loader2, ArrowRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { UserPayload, Department, UserProfileResponse, APIResponse, CreateUserInput, UpdateUserInput } from '@college-erp/common';
import { useToast } from '@/components/hooks/use-toast';
import { UserFormDialog, UserFormValues } from '@/components/admin/UserFormDialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Fetch all users (admin) - UserPayload structure
const fetchAllUsers = async (): Promise<UserPayload[]> => {
  const response = await apiClient.get<APIResponse<UserPayload[]>>('/users');
  return response.data.data || [];
};

// Fetch all departments (admin)
const fetchAllDepartments = async (): Promise<Department[]> => {
    const response = await apiClient.get<APIResponse<Department[]>>('/users/departments');
    return response.data.data || [];
};

export default function AdminUsersOverviewPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUserFullProfile, setEditingUserFullProfile] = useState<UserProfileResponse | null>(null); // Kept for dialog
  const [isEditingMode, setIsEditingMode] = useState(false); // Kept for dialog
  
  // Deletion state kept for ConfirmationDialog's logic, though not triggered from this page
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  
  const [isFetchingProfileForEdit, setIsFetchingProfileForEdit] = useState(false); // Kept for dialog

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery<UserPayload[], Error>({
    queryKey: ['allAdminUsers'],
    queryFn: fetchAllUsers,
  });

  const { data: departments, isLoading: departmentsLoading, error: departmentsError } = useQuery<Department[], Error>({
    queryKey: ['allAdminDepartments'],
    queryFn: fetchAllDepartments,
  });

  const userStats = useMemo(() => {
    if (!users) return { total: 0, faculty: 0, students: 0 };
    return {
      total: users.length,
      faculty: users.filter(u => u.role === 'faculty').length,
      students: users.filter(u => u.role === 'student').length,
    };
  }, [users]);

  // Mutations
  const createUserMutation = useMutation<UserPayload, Error, CreateUserInput>({
    mutationFn: (newUserData) => apiClient.post<APIResponse<UserPayload>>('/users', newUserData).then(res => res.data.data!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAdminUsers'] });
      toast({ title: "User Created", description: "New user has been successfully added.", variant: "default", className: "bg-success text-success-foreground border-success" });
      setIsUserFormOpen(false);
    },
    onError: (error) => {
      toast({ title: "Creation Failed", description: error.message || "Could not create user.", variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation<UserPayload, Error, { userId: number; data: UpdateUserInput }>({
    mutationFn: ({ userId, data }) => apiClient.put<APIResponse<UserPayload>>(`/users/${userId}`, data).then(res => res.data.data!),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allAdminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.userId] });
      toast({ title: "User Updated", description: "User details have been successfully updated.", variant: "default", className: "bg-success text-success-foreground border-success" });
      setIsUserFormOpen(false);
      setEditingUserFullProfile(null);
    },
    onError: (error) => {
      toast({ title: "Update Failed", description: error.message || "Could not update user.", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation<void, Error, number>({
    mutationFn: (userId) => apiClient.delete(`/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAdminUsers'] });
      toast({ title: "User Deleted", description: "User has been successfully deleted.", variant: "default" });
      setIsConfirmDeleteDialogOpen(false);
      setDeletingUserId(null);
    },
    onError: (error) => {
      toast({ title: "Deletion Failed", description: error.message || "Could not delete user.", variant: "destructive" });
      setIsConfirmDeleteDialogOpen(false);
    },
  });

  const handleOpenAddUserDialog = () => {
    setIsEditingMode(false);
    setEditingUserFullProfile(null);
    setIsUserFormOpen(true);
  };
  
  const onUserFormSubmit = async (values: UserFormValues, isEditingSubmit: boolean) => {
    const departmentIdNumber = values.departmentId ? parseInt(values.departmentId, 10) : null;

    if (isEditingSubmit && editingUserFullProfile) {
      const updatePayload: UpdateUserInput = {
        username: values.username,
        email: values.email,
        role: values.role, 
        departmentId: departmentIdNumber, 
        major: values.role === 'student' ? values.major : undefined,
        officeNumber: values.role === 'faculty' ? values.officeNumber : undefined,
        specialization: values.role === 'faculty' ? values.specialization : undefined,
        permissionLevel: values.role === 'admin' ? values.permissionLevel : undefined,
      };
      await updateUserMutation.mutateAsync({ userId: editingUserFullProfile.id, data: updatePayload });
    } else {
      if (!values.password) { 
        toast({ title: "Validation Error", description: "Password is required for new users.", variant: "destructive" });
        return;
      }
      const createPayload: CreateUserInput = {
        username: values.username,
        email: values.email,
        password_DO_NOT_USE_THIS_FIELD_EVER_EXCEPT_ON_CREATE_ONLY: values.password,
        role: values.role,
        departmentId: departmentIdNumber,
        major: values.role === 'student' ? values.major : undefined,
        officeNumber: values.role === 'faculty' ? values.officeNumber : undefined,
        specialization: values.role === 'faculty' ? values.specialization : undefined,
        permissionLevel: values.role === 'admin' ? values.permissionLevel : undefined,
      };
      await createUserMutation.mutateAsync(createPayload);
    }
  };
  
  const handleConfirmDelete = () => {
    if (deletingUserId) {
      deleteUserMutation.mutate(deletingUserId);
    }
  };

  const pageIsLoading = usersLoading || departmentsLoading;
  const pageError = usersError || departmentsError;

  interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ElementType;
    description: string;
    isLoading?: boolean;
    linkTo?: string;
  }

  const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, description, isLoading, linkTo }) => {
    const cardContent = (
      <Card className="shadow-md hover:shadow-lg transition-shadow h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex-grow">
          {isLoading ? (
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
          ) : (
              <div className="text-3xl font-bold text-foreground">{value}</div>
          )}
          <p className="text-xs text-muted-foreground pt-1">{description}</p>
        </CardContent>
        {linkTo && !isLoading && (
          <CardFooter className="pt-2 mt-auto">
             <div className="text-xs text-primary font-medium flex items-center">
                Manage <ArrowRight className="ml-1 h-3 w-3" />
            </div>
          </CardFooter>
        )}
      </Card>
    );

    if (linkTo && !isLoading) {
      return <Link href={linkTo} className="block h-full">{cardContent}</Link>;
    }
    return cardContent;
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center">
                <Users className="mr-3 h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                User Overview
            </h1>
            <Button onClick={handleOpenAddUserDialog} disabled={createUserMutation.isPending || updateUserMutation.isPending}>
                <UserPlus className="mr-2 h-4 w-4" /> Add New User
            </Button>
        </div>
        
        {pageError && (
          <div className="text-destructive bg-destructive/10 p-4 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2"/> Error loading user data: {pageError.message}
          </div>
        )}

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StatCard 
                title="Total Users" 
                value={userStats.total} 
                icon={Users}
                description="All registered users in the system."
                isLoading={pageIsLoading}
            />
            <StatCard 
                title="Faculty Members" 
                value={userStats.faculty} 
                icon={Briefcase}
                description="Teaching and non-teaching staff."
                isLoading={pageIsLoading}
                linkTo="/admin/users/faculty"
            />
            <StatCard 
                title="Students Enrolled" 
                value={userStats.students} 
                icon={GraduationCap}
                description="Currently enrolled students."
                isLoading={pageIsLoading}
                linkTo="/admin/users/students"
            />
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>User Management Hub</CardTitle>
            <CardDescription>Click on the cards above to navigate to detailed management pages for each user category.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This overview provides quick statistics. For detailed lists, editing, and specific actions related to users, faculty, or students, please use the respective linked pages.
            </p>
          </CardContent>
        </Card>

        <UserFormDialog 
            isOpen={isUserFormOpen} 
            onOpenChange={setIsUserFormOpen}
            onSubmit={onUserFormSubmit}
            defaultValues={editingUserFullProfile}
            isEditing={isEditingMode}
            departments={departments || []}
            isLoading={createUserMutation.isPending || updateUserMutation.isPending || isFetchingProfileForEdit}
        />

        <ConfirmationDialog
            isOpen={isConfirmDeleteDialogOpen}
            onOpenChange={setIsConfirmDeleteDialogOpen}
            title="Confirm User Deletion"
            description={
                <>
                    Are you sure you want to delete this user? <br />
                    <span className="font-semibold text-destructive">This action cannot be undone.</span>
                </>
            }
            onConfirm={handleConfirmDelete}
            isLoading={deleteUserMutation.isPending}
            isDestructive={true}
            confirmText="Delete User"
        />
      </div>
    </ProtectedRoute>
  );
}
