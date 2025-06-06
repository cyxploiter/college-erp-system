
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Briefcase, GraduationCap, Loader2, ArrowRight, Settings, ShieldCheck } from 'lucide-react'; // Added ShieldCheck for Superuser
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
  const [editingUserFullProfile, setEditingUserFullProfile] = useState<UserProfileResponse | null>(null); 
  const [isEditingMode, setIsEditingMode] = useState(false); 
  
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  
  const [isFetchingProfileForEdit, setIsFetchingProfileForEdit] = useState(false);

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery<UserPayload[], Error>({
    queryKey: ['allAdminUsers'],
    queryFn: fetchAllUsers,
  });

  const { data: departments, isLoading: departmentsLoading, error: departmentsError } = useQuery<Department[], Error>({
    queryKey: ['allAdminDepartments'],
    queryFn: fetchAllDepartments,
  });

  const userStats = useMemo(() => {
    if (!users) return { total: 0, faculty: 0, students: 0, admins: 0, superusers: 0 };
    return {
      total: users.length,
      faculty: users.filter(u => u.role === 'faculty').length,
      students: users.filter(u => u.role === 'student').length,
      admins: users.filter(u => u.role === 'admin').length,
      superusers: users.filter(u => u.role === 'superuser').length, // Added superuser count
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
    
    // Create a base payload from UserFormValues, ensuring all optional fields from the form
    // are correctly mapped to CreateUserInput/UpdateUserInput.
    // UserFormValues already contains all necessary fields like program, branch etc.
    const formPayload = {
        name: values.name, // Corrected from username
        email: values.email,
        profilePictureUrl: values.profilePictureUrl,
        role: values.role,
        departmentId: departmentIdNumber,
        // Student fields
        program: values.role === 'student' ? values.program : undefined,
        branch: values.role === 'student' ? values.branch : undefined,
        expectedGraduationYear: values.role === 'student' ? values.expectedGraduationYear : undefined,
        currentYearOfStudy: values.role === 'student' ? values.currentYearOfStudy : undefined,
        gpa: values.role === 'student' ? values.gpa : undefined,
        academicStatus: values.role === 'student' ? values.academicStatus : undefined,
        fatherName: values.role === 'student' ? values.fatherName : undefined,
        motherName: values.role === 'student' ? values.motherName : undefined,
        dateOfBirth: values.role === 'student' ? values.dateOfBirth : undefined,
        phoneNumber: values.role === 'student' ? values.phoneNumber : undefined,
        permanentAddress: values.role === 'student' ? values.permanentAddress : undefined,
        currentAddress: values.role === 'student' ? values.currentAddress : undefined,
        // Faculty fields
        officeNumber: values.role === 'faculty' ? values.officeNumber : undefined,
        specialization: values.role === 'faculty' ? values.specialization : undefined,
        // Admin fields
        permissionLevel: values.role === 'admin' ? values.permissionLevel : undefined,
        // Superuser fields
        superuserPermissions: values.role === 'superuser' ? values.superuserPermissions : undefined,
    };


    if (isEditingSubmit && editingUserFullProfile) {
      const updatePayload: UpdateUserInput = {
        ...formPayload
        // Password is not included here, UserFormDialog handles optional password update
      };
      if (values.password && values.password.trim() !== '') {
        // This scenario (sending password on update) is not directly supported by current UpdateUserInput
        // and backend userService.updateUserById. Typically password updates are separate.
        // For now, we assume password is not updated here, or UserFormDialog logic needs to be enhanced
        // and backend needs a dedicated password change endpoint or logic.
        // If password needs to be updated, it should be handled carefully.
        // The current `UserFormDialog` correctly omits password if it's blank during edit.
      }
      await updateUserMutation.mutateAsync({ userId: editingUserFullProfile.id, data: updatePayload });
    } else {
      if (!values.password) { 
        toast({ title: "Validation Error", description: "Password is required for new users.", variant: "destructive" });
        return;
      }
      const createPayload: CreateUserInput = {
        ...formPayload,
        password_DO_NOT_USE_THIS_FIELD_EVER_EXCEPT_ON_CREATE_ONLY: values.password,
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
    <ProtectedRoute allowedRoles={['admin', 'superuser']}> {/* Allow superuser to see this page */}
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center">
                <Users className="mr-3 h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                User Management Overview
            </h1>
            <Button onClick={handleOpenAddUserDialog} disabled={createUserMutation.isPending || updateUserMutation.isPending}>
                <UserPlus className="mr-2 h-4 w-4" /> Add New User
            </Button>
        </div>
        
        {pageError && (
          <div className="text-destructive bg-destructive/10 p-4 rounded-md flex items-center">
            <Users className="h-5 w-5 mr-2"/> Error loading user data: {pageError.message}
          </div>
        )}

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"> {/* Adjusted grid for 5 cards */}
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
             <StatCard 
                title="Administrators" 
                value={userStats.admins} 
                icon={Settings}
                description="System administrators."
                isLoading={pageIsLoading}
                // linkTo="/admin/users/admins" // If a separate admin management page exists
            />
            <StatCard 
                title="Superusers" 
                value={userStats.superusers} 
                icon={ShieldCheck} // New icon for superusers
                description="Top-level system managers."
                isLoading={pageIsLoading}
                // No link for superusers for now, managed via general Add User or specific interface if built
            />
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>User Management Hub</CardTitle>
            <CardDescription>Navigate to specific user categories using the cards above for detailed management options. Use 'Add New User' for all types.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This overview provides quick statistics. For detailed lists and specific actions related to faculty or students, please use their respective linked pages. The "Add New User" button allows creation of any user type, including Administrators and Superusers.
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
            isLoading={createUserMutation.isPending || updateUserMutation.isPending || isFetchingProfileForEdit || departmentsLoading}
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