
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Briefcase, UserPlus, ArrowLeft, Edit, Trash2, MoreHorizontal, Search, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { UserFormDialog, UserFormValues } from '@/components/admin/UserFormDialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Department, UserProfileResponse, CreateUserInput, UserPayload, APIResponse, UpdateUserInput } from '@college-erp/common';
import apiClient from '@/lib/apiClient';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const fetchAdminUsers = async (): Promise<UserPayload[]> => {
    const response = await apiClient.get<APIResponse<UserPayload[]>>('/users');
    return response.data.data || [];
};

const fetchAllDepartments = async (): Promise<Department[]> => {
    const response = await apiClient.get<APIResponse<Department[]>>('/users/departments');
    return response.data.data || [];
};

const fetchUserProfile = async (userId: string): Promise<UserProfileResponse> => { // userId is string
    const response = await apiClient.get<APIResponse<UserProfileResponse>>(`/users/${userId}`);
    return response.data.data!;
};


export default function ManageFacultyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUserFullProfile, setEditingUserFullProfile] = useState<UserProfileResponse | null>(null); 
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null); // userId is string
  const [isFetchingProfileForEdit, setIsFetchingProfileForEdit] = useState(false);

  const { data: allUsers, isLoading: usersLoading, error: usersError } = useQuery<UserPayload[], Error>({
    queryKey: ['allAdminUsersForFacultyPage'], 
    queryFn: fetchAdminUsers,
  });

  const { data: departments, isLoading: departmentsLoading, error: departmentsError } = useQuery<Department[], Error>({
    queryKey: ['allAdminDepartments'],
    queryFn: fetchAllDepartments,
  });
  
  const facultyUsers = useMemo(() => {
    if (!allUsers) return [];
    const filtered = allUsers.filter(u => u.role === 'faculty');
    if (!searchTerm) return filtered;
    return filtered.filter(
      u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allUsers, searchTerm]);

  const departmentMap = useMemo(() => {
    const map = new Map<number, string>();
    departments?.forEach(dept => map.set(dept.id, dept.name));
    return map;
  }, [departments]);

  const createUserMutation = useMutation<UserPayload, Error, CreateUserInput>({
    mutationFn: (newUserData) => apiClient.post<APIResponse<UserPayload>>('/users', newUserData).then(res => res.data.data!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAdminUsersForFacultyPage'] });
      queryClient.invalidateQueries({ queryKey: ['allAdminUsers'] }); 
      toast({ title: "Faculty Created", description: "New faculty member has been successfully added.", variant: "default", className: "bg-success text-success-foreground border-success" });
      setIsUserFormOpen(false);
    },
    onError: (error) => {
      toast({ title: "Creation Failed", description: error.message || "Could not create faculty.", variant: "destructive" });
    },
  });
  
   const updateUserMutation = useMutation<UserPayload, Error, { userId: string; data: UpdateUserInput }>({ // userId is string
    mutationFn: ({ userId, data }) => apiClient.put<APIResponse<UserPayload>>(`/users/${userId}`, data).then(res => res.data.data!),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allAdminUsersForFacultyPage'] });
      queryClient.invalidateQueries({ queryKey: ['allAdminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.userId]});
      toast({ title: "Faculty Updated", description: "Faculty details updated.", variant: "default", className: "bg-success text-success-foreground border-success" });
      setIsUserFormOpen(false);
    },
    onError: (error) => toast({ title: "Update Failed", description: error.message, variant: "destructive" }),
  });

  const deleteUserMutation = useMutation<void, Error, string>({ // userId is string
    mutationFn: (userId) => apiClient.delete(`/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAdminUsersForFacultyPage'] });
      queryClient.invalidateQueries({ queryKey: ['allAdminUsers'] });
      toast({ title: "Faculty Deleted", description: "Faculty member has been successfully deleted.", variant: "default" });
      setIsConfirmDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
      setIsConfirmDeleteDialogOpen(false);
    },
  });

  const handleOpenAddFacultyDialog = () => {
    setIsEditingMode(false);
    setEditingUserFullProfile(null); 
    setIsUserFormOpen(true);
  };

  const handleOpenEditDialog = async (facultyUser: UserPayload) => { // facultyUser.id is string
    setIsFetchingProfileForEdit(true);
    try {
        const profile = await fetchUserProfile(facultyUser.id); // Pass string ID
        setEditingUserFullProfile(profile);
        setIsEditingMode(true);
        setIsUserFormOpen(true);
    } catch (error) {
        toast({ title: "Error", description: "Could not fetch faculty details for editing.", variant: "destructive" });
    } finally {
        setIsFetchingProfileForEdit(false);
    }
  };

  const handleOpenDeleteDialog = (userId: string) => { // userId is string
    setDeletingUserId(userId);
    setIsConfirmDeleteDialogOpen(true);
  };
  
  // onSubmit for UserFormDialog now expects departmentId to be number | null
  const onUserFormSubmit = async (values: UserFormValues & { departmentId?: number | null }, isEditingSubmit: boolean) => {
     if (isEditingSubmit && editingUserFullProfile) {
       const updatePayload: UpdateUserInput = { 
           name: values.name, 
           email: values.email, 
           profilePictureUrl: values.profilePictureUrl,
           departmentId: values.departmentId, 
           officeNumber: values.officeNumber, 
           specialization: values.specialization,
        };
       await updateUserMutation.mutateAsync({ userId: editingUserFullProfile.id, data: updatePayload }); // editingUserFullProfile.id is string
    } else {
      if (!values.password) { 
        toast({ title: "Validation Error", description: "Password is required for new users.", variant: "destructive" });
        return;
      }
       if (values.role !== 'faculty') {
         toast({ title: "Role Error", description: "Please select 'Faculty' role when adding.", variant: "destructive" });
         return;
       }
      const createPayload: CreateUserInput = {
        name: values.name,
        email: values.email,
        profilePictureUrl: values.profilePictureUrl,
        password_DO_NOT_USE_THIS_FIELD_EVER_EXCEPT_ON_CREATE_ONLY: values.password,
        role: 'faculty', 
        departmentId: values.departmentId,
        officeNumber: values.officeNumber,
        specialization: values.specialization,
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

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
           <Button variant="outline" size="sm" asChild className="mb-2 sm:mb-0 self-start sm:self-center">
            <Link href="/admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              User Overview
            </Link>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center sm:flex-grow sm:justify-center">
            <Briefcase className="mr-3 h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Manage Faculty
          </h1>
          <Button onClick={handleOpenAddFacultyDialog} className="self-end sm:self-center" disabled={createUserMutation.isPending || updateUserMutation.isPending || pageIsLoading}>
            <UserPlus className="mr-2 h-4 w-4" /> Add New Faculty
          </Button>
        </div>

        <Card className="shadow-lg border-border">
            <CardHeader>
                <CardTitle>Faculty List</CardTitle>
                <CardDescription>View, search, and manage faculty members.</CardDescription>
                <div className="mt-4 flex items-center gap-2">
                    <Search className="h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                    />
                </div>
            </CardHeader>
            <CardContent>
                {pageIsLoading && !pageError && (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                )}
                {pageError && (
                    <div className="text-destructive bg-destructive/10 p-4 rounded-md flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2"/> Error loading data: {pageError.message}
                    </div>
                )}
                {!pageIsLoading && !pageError && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Faculty ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {facultyUsers.length > 0 ? facultyUsers.map((faculty) => ( // faculty.id is string
                                <TableRow key={faculty.id}>
                                    <TableCell className="font-mono text-xs">{faculty.id}</TableCell>
                                    <TableCell className="font-medium">{faculty.name}</TableCell>
                                    <TableCell>{faculty.email}</TableCell>
                                    <TableCell>{faculty.departmentId ? departmentMap.get(faculty.departmentId) || 'N/A' : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={isFetchingProfileForEdit && editingUserFullProfile?.id === faculty.id}>
                                                    {isFetchingProfileForEdit && editingUserFullProfile?.id === faculty.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" />}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenEditDialog(faculty)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleOpenDeleteDialog(faculty.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6"> {/* Adjusted colSpan */}
                                        {searchTerm ? 'No faculty members match your search.' : 'No faculty members found.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                         <TableCaption>{facultyUsers.length} faculty member(s) found.</TableCaption>
                    </Table>
                )}
            </CardContent>
        </Card>

         <UserFormDialog 
            isOpen={isUserFormOpen} 
            onOpenChange={setIsUserFormOpen}
            onSubmit={onUserFormSubmit}
            defaultValues={editingUserFullProfile || { role: 'faculty', departmentId: null }} // Pass null for departmentId initially
            isEditing={isEditingMode}
            departments={departments || []}
            isLoading={createUserMutation.isPending || updateUserMutation.isPending || departmentsLoading || isFetchingProfileForEdit}
        />
        <ConfirmationDialog
            isOpen={isConfirmDeleteDialogOpen}
            onOpenChange={setIsConfirmDeleteDialogOpen}
            title="Confirm Faculty Deletion"
            description="Are you sure you want to delete this faculty member? This action cannot be undone."
            onConfirm={handleConfirmDelete}
            isLoading={deleteUserMutation.isPending}
            isDestructive
            confirmText="Delete Faculty"
        />
      </div>
    </ProtectedRoute>
  );
}