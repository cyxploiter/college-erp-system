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
import { useToast } from '@/components/hooks/use-toast';
import { UserFormDialog, UserFormValues } from '@/components/admin/UserFormDialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Department, UserProfileResponse, CreateUserInput, UserPayload, APIResponse, UpdateUserInput } from '@college-erp/common';
import apiClient from '@/lib/apiClient';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
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

const fetchUserProfile = async (userId: number): Promise<UserProfileResponse> => {
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
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [isFetchingProfileForEdit, setIsFetchingProfileForEdit] = useState(false);
  const [currentlyEditingFacultyId, setCurrentlyEditingFacultyId] = useState<number | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const { data: allUsers, isLoading: usersLoading, error: usersError } = useQuery<UserPayload[], Error>({
    queryKey: ['allAdminUsersForFacultyPage'], // Unique key for this page's specific fetch if needed, or use global 'allAdminUsers'
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
      u => u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      queryClient.invalidateQueries({ queryKey: ['allAdminUsers'] }); // Invalidate general query too
      toast({ title: "Faculty Created", description: "New faculty member has been successfully added.", variant: "default", className: "bg-success text-success-foreground border-success" });
      setIsUserFormOpen(false);
    },
    onError: (error) => {
      toast({ title: "Creation Failed", description: error.message || "Could not create faculty.", variant: "destructive" });
    },
  });
  
   const updateUserMutation = useMutation<UserPayload, Error, { userId: number; data: UpdateUserInput }>({
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

  const deleteUserMutation = useMutation<void, Error, number>({
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

  const handleOpenEditDialog = async (facultyUser: UserPayload) => {
    setIsFetchingProfileForEdit(true);
    setCurrentlyEditingFacultyId(facultyUser.id);
    try {
        const profile = await fetchUserProfile(facultyUser.id);
        setEditingUserFullProfile(profile);
        setIsEditingMode(true);
        setIsUserFormOpen(true);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Could not fetch faculty details for editing.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
        setIsFetchingProfileForEdit(false);
        setCurrentlyEditingFacultyId(null);
    }
  };

  const handleOpenDeleteDialog = (userId: number) => {
    setDeletingUserId(userId);
    setIsConfirmDeleteDialogOpen(true);
  };
  
  const onUserFormSubmit = async (values: UserFormValues, isEditingSubmit: boolean) => {
    const departmentIdNumber = values.departmentId ? parseInt(values.departmentId, 10) : null;
     if (isEditingSubmit && editingUserFullProfile) {
       const updatePayload: UpdateUserInput = { 
           username: values.username, 
           email: values.email, 
           departmentId: departmentIdNumber, 
           officeNumber: values.officeNumber, 
           specialization: values.specialization,
           // role: 'faculty' // Role change not allowed usually
        };
       await updateUserMutation.mutateAsync({ userId: editingUserFullProfile.id, data: updatePayload });
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
        username: values.username,
        email: values.email,
        password_DO_NOT_USE_THIS_FIELD_EVER_EXCEPT_ON_CREATE_ONLY: values.password,
        role: 'faculty', 
        departmentId: departmentIdNumber,
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

  const columns = useMemo<ColumnDef<UserPayload>[]>(() => [
    {
      accessorKey: 'username',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-1"
        >
          Username
          {column.getIsSorted() === "asc" ? <span className="ml-1">▲</span> : column.getIsSorted() === "desc" ? <span className="ml-1">▼</span> : ""}
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.getValue('username')}</div>,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-1"
        >
          Email
          {column.getIsSorted() === "asc" ? <span className="ml-1">▲</span> : column.getIsSorted() === "desc" ? <span className="ml-1">▼</span> : ""}
        </Button>
      ),
      cell: ({ row }) => row.getValue('email'),
    },
    {
      accessorKey: 'departmentId',
      header: 'Department',
      cell: ({ row }) => {
        const departmentId = row.getValue('departmentId') as number | null;
        return departmentId ? departmentMap.get(departmentId) || 'N/A' : 'N/A';
      },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const faculty = row.original;
        const isLoadingThisRow = isFetchingProfileForEdit && currentlyEditingFacultyId === faculty.id;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoadingThisRow}>
                  {isLoadingThisRow ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
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
          </div>
        );
      },
      enableSorting: false,
    },
  ], [departmentMap, isFetchingProfileForEdit, currentlyEditingFacultyId, handleOpenEditDialog, handleOpenDeleteDialog]); // Added handlers as they are used in cell

  const table = useReactTable({
    data: facultyUsers,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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
                    <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
                        <Table>
                          <TableHeader className="sticky top-0 bg-card z-10">
                            {table.getHeaderGroups().map(headerGroup => (
                              <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                  <TableHead key={header.id}>
                                    {header.isPlaceholder
                                      ? null
                                      : flexRender(
                                          header.column.columnDef.header,
                                          header.getContext()
                                        )}
                                  </TableHead>
                                ))}
                              </TableRow>
                            ))}
                          </TableHeader>
                          <TableBody>
                            {table.getRowModel().rows?.length ? (
                              table.getRowModel().rows.map(row => (
                                <TableRow
                                  key={row.id}
                                  data-state={row.getIsSelected() && "selected"}
                                >
                                  {row.getVisibleCells().map(cell => (
                                    <TableCell key={cell.id}>
                                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))
                            ) : (
                                    <TableRow>
                                        <TableCell 
                                          colSpan={columns.length} 
                                          className="h-24 text-center text-muted-foreground py-6"
                                        >
                                            {searchTerm ? 'No faculty members match your search.' : 'No faculty members found.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                         </Table>
                    </div>
                )}
            </CardContent>
             {!pageIsLoading && !pageError && facultyUsers.length > 0 && (
                <CardFooter className="pt-4">
                    <TableCaption className="mt-0">{facultyUsers.length} faculty member(s) found.</TableCaption>
                </CardFooter>
             )}
        </Card>

         <UserFormDialog 
            isOpen={isUserFormOpen} 
            onOpenChange={setIsUserFormOpen}
            onSubmit={onUserFormSubmit}
            defaultValues={editingUserFullProfile || { role: 'faculty' }}
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
