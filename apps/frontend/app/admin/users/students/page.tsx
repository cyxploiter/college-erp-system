
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { GraduationCap, UserPlus, ArrowLeft, Edit, Trash2, MoreHorizontal, Search, Loader2, AlertCircle } from 'lucide-react';
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

export default function ManageStudentsPage() {
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
    queryKey: ['allAdminUsersForStudentPage'],
    queryFn: fetchAdminUsers,
  });

  const { data: departments, isLoading: departmentsLoading, error: departmentsError } = useQuery<Department[], Error>({
    queryKey: ['allAdminDepartments'], // Still needed for UserFormDialog if student can have an optional department
    queryFn: fetchAllDepartments,
  });
  
  const studentUsers = useMemo(() => {
    if (!allUsers) return [];
    const filtered = allUsers.filter(u => u.role === 'student');
    if (!searchTerm) return filtered;
    return filtered.filter(
      u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
           u.studentRegistrationId?.toLowerCase().includes(searchTerm.toLowerCase()) || // studentRegistrationId is user.id
           u.program?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           u.branch?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allUsers, searchTerm]);

  const createUserMutation = useMutation<UserPayload, Error, CreateUserInput>({
    mutationFn: (newUserData) => apiClient.post<APIResponse<UserPayload>>('/users', newUserData).then(res => res.data.data!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAdminUsersForStudentPage'] });
      queryClient.invalidateQueries({ queryKey: ['allAdminUsers'] });
      toast({ title: "Student Created", description: "New student has been successfully added.", variant: "default", className: "bg-success text-success-foreground border-success" });
      setIsUserFormOpen(false);
    },
    onError: (error) => {
      toast({ title: "Creation Failed", description: error.message || "Could not create student.", variant: "destructive" });
    },
  });
  
   const updateUserMutation = useMutation<UserPayload, Error, { userId: string; data: UpdateUserInput }>({ // userId is string
    mutationFn: ({ userId, data }) => apiClient.put<APIResponse<UserPayload>>(`/users/${userId}`, data).then(res => res.data.data!),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allAdminUsersForStudentPage'] });
      queryClient.invalidateQueries({ queryKey: ['allAdminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.userId]});
      toast({ title: "Student Updated", description: "Student details updated.", variant: "default", className: "bg-success text-success-foreground border-success" });
      setIsUserFormOpen(false);
    },
    onError: (error) => toast({ title: "Update Failed", description: error.message, variant: "destructive" }),
  });

  const deleteUserMutation = useMutation<void, Error, string>({ // userId is string
    mutationFn: (userId) => apiClient.delete(`/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAdminUsersForStudentPage'] });
      queryClient.invalidateQueries({ queryKey: ['allAdminUsers'] });
      toast({ title: "Student Deleted", description: "Student has been successfully deleted.", variant: "default" });
      setIsConfirmDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
      setIsConfirmDeleteDialogOpen(false);
    },
  });

  const handleOpenAddStudentDialog = () => {
    setIsEditingMode(false);
    setEditingUserFullProfile(null); 
    setIsUserFormOpen(true);
  };

  const handleOpenEditDialog = async (studentUser: UserPayload) => { // studentUser.id is string
    setIsFetchingProfileForEdit(true);
    try {
        const profile = await fetchUserProfile(studentUser.id); // Pass string ID
        setEditingUserFullProfile(profile);
        setIsEditingMode(true);
        setIsUserFormOpen(true);
    } catch (error) {
        toast({ title: "Error", description: "Could not fetch student details for editing.", variant: "destructive" });
    } finally {
        setIsFetchingProfileForEdit(false);
    }
  };

  const handleOpenDeleteDialog = (userId: string) => { // userId is string
    setDeletingUserId(userId);
    setIsConfirmDeleteDialogOpen(true);
  };
  
  const onUserFormSubmit = async (values: UserFormValues & { departmentId?: number | null }, isEditingSubmit: boolean) => {
     if (isEditingSubmit && editingUserFullProfile) {
       const updatePayload: UpdateUserInput = { 
           name: values.name, 
           email: values.email,
           profilePictureUrl: values.profilePictureUrl,
           departmentId: values.departmentId, // Students might have an optional department
           program: values.program,
           branch: values.branch,
           expectedGraduationYear: values.expectedGraduationYear,
           currentYearOfStudy: values.currentYearOfStudy,
           gpa: values.gpa,
           academicStatus: values.academicStatus,
           fatherName: values.fatherName,
           motherName: values.motherName,
           dateOfBirth: values.dateOfBirth,
           phoneNumber: values.phoneNumber,
           permanentAddress: values.permanentAddress,
           currentAddress: values.currentAddress,
        };
       await updateUserMutation.mutateAsync({ userId: editingUserFullProfile.id, data: updatePayload }); // editingUserFullProfile.id is string
    } else {
      if (!values.password) { 
        toast({ title: "Validation Error", description: "Password is required for new users.", variant: "destructive" });
        return;
      }
       if (values.role !== 'student') {
         toast({ title: "Role Error", description: "Please select 'Student' role when adding.", variant: "destructive" });
         return;
       }
      const createPayload: CreateUserInput = {
        name: values.name,
        email: values.email,
        profilePictureUrl: values.profilePictureUrl,
        password_DO_NOT_USE_THIS_FIELD_EVER_EXCEPT_ON_CREATE_ONLY: values.password,
        role: 'student', 
        departmentId: values.departmentId,
        program: values.program,
        branch: values.branch,
        expectedGraduationYear: values.expectedGraduationYear,
        currentYearOfStudy: values.currentYearOfStudy,
        gpa: values.gpa,
        academicStatus: values.academicStatus,
        fatherName: values.fatherName,
        motherName: values.motherName,
        dateOfBirth: values.dateOfBirth,
        phoneNumber: values.phoneNumber,
        permanentAddress: values.permanentAddress,
        currentAddress: values.currentAddress,
      };
      await createUserMutation.mutateAsync(createPayload);
    }
  };

  const handleConfirmDelete = () => {
    if (deletingUserId) {
      deleteUserMutation.mutate(deletingUserId);
    }
  };

  const pageIsLoading = usersLoading || departmentsLoading; // departmentsLoading is still relevant for the form
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
            <GraduationCap className="mr-3 h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Manage Students
          </h1>
          <Button onClick={handleOpenAddStudentDialog} className="self-end sm:self-center" disabled={createUserMutation.isPending || updateUserMutation.isPending || pageIsLoading}>
            <UserPlus className="mr-2 h-4 w-4" /> Add New Student
          </Button>
        </div>
        
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle>Student List</CardTitle>
            <CardDescription>View, search, and manage student records.</CardDescription>
             <div className="mt-4 flex items-center gap-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Search by name, email, ID, program, branch..."
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
                            <TableHead>Student ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Program</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {studentUsers.length > 0 ? studentUsers.map((student) => ( // student.id and student.studentRegistrationId are string
                            <TableRow key={student.id}>
                                <TableCell className="font-mono text-xs">{student.studentRegistrationId || student.id}</TableCell> {/* student.id is the reg ID */}
                                <TableCell className="font-medium">{student.name}</TableCell>
                                <TableCell>{student.email}</TableCell>
                                <TableCell>{student.program || 'N/A'}</TableCell>
                                <TableCell>{student.branch || 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isFetchingProfileForEdit && editingUserFullProfile?.id === student.id}>
                                                {isFetchingProfileForEdit && editingUserFullProfile?.id === student.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" />}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleOpenEditDialog(student)}>
                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleOpenDeleteDialog(student.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-6"> 
                                     {searchTerm ? 'No students match your search.' : 'No students found.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    <TableCaption>{studentUsers.length} student(s) found.</TableCaption>
                </Table>
            )}
          </CardContent>
        </Card>

         <UserFormDialog 
            isOpen={isUserFormOpen} 
            onOpenChange={setIsUserFormOpen}
            onSubmit={onUserFormSubmit}
            defaultValues={editingUserFullProfile || { role: 'student', departmentId: null }} 
            isEditing={isEditingMode}
            departments={departments || []} 
            isLoading={createUserMutation.isPending || updateUserMutation.isPending || departmentsLoading || isFetchingProfileForEdit}
        />
        <ConfirmationDialog
            isOpen={isConfirmDeleteDialogOpen}
            onOpenChange={setIsConfirmDeleteDialogOpen}
            title="Confirm Student Deletion"
            description="Are you sure you want to delete this student? This action cannot be undone."
            onConfirm={handleConfirmDelete}
            isLoading={deleteUserMutation.isPending}
            isDestructive
            confirmText="Delete Student"
        />
      </div>
    </ProtectedRoute>
  );
}