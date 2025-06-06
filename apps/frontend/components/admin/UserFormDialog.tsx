
'use client';

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Department, UserRole, UserProfileResponse } from '@college-erp/common';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area'; // Assuming ScrollArea is added to shadcn
import { cn } from '@/lib/utils';

const userRoles = ['student', 'faculty', 'admin'] as const;

// Schema for the form
// We'll refine password requirement based on `isEditing` prop directly in the component or submit handler
const baseUserFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50, "Username too long"),
  email: z.string().email("Invalid email address"),
  password: z.string().optional(), // Optional: handled based on isEditing
  role: z.enum(userRoles, { required_error: "Role is required" }),
  departmentId: z.string().optional().nullable(), // String because Select value is string
  // Role-specific fields
  major: z.string().max(100, "Major too long").optional().nullable(),
  officeNumber: z.string().max(50, "Office number too long").optional().nullable(),
  specialization: z.string().max(100, "Specialization too long").optional().nullable(),
  permissionLevel: z.string().max(50, "Permission level too long").optional().nullable(),
});

export type UserFormValues = z.infer<typeof baseUserFormSchema>;

interface UserFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (values: UserFormValues, isEditing: boolean) => Promise<void>;
  defaultValues?: UserProfileResponse | null; // For pre-filling the form in edit mode
  isEditing: boolean;
  departments: Department[];
  isLoading: boolean; // For submission loading state
}

// Helper to map UserProfileResponse to UserFormValues
const mapProfileToFormValues = (profile?: UserProfileResponse | null): Partial<UserFormValues> => {
  if (!profile) return {};
  return {
    username: profile.username,
    email: profile.email,
    role: profile.role,
    departmentId: profile.role === 'faculty'
      ? profile.facultyDetails?.departmentId?.toString() || undefined
      : profile.departmentId?.toString() || undefined,
    major: profile.studentDetails?.major || undefined,
    officeNumber: profile.facultyDetails?.officeNumber || undefined,
    specialization: profile.facultyDetails?.specialization || undefined,
    permissionLevel: profile.adminDetails?.permissionLevel || undefined,
    // Password is not pre-filled for editing
  };
};


export function UserFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  defaultValues,
  isEditing,
  departments,
  isLoading,
}: UserFormDialogProps) {

  const refinedUserFormSchema = baseUserFormSchema.superRefine((data, ctx) => {
    if (!isEditing && (!data.password || data.password.length < 8)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must be at least 8 characters for new users.",
        path: ['password'],
      });
    }
    if (data.role === 'faculty' && !data.departmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Department is required for faculty.",
        path: ['departmentId'],
      });
    }
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(refinedUserFormSchema),
    defaultValues: mapProfileToFormValues(defaultValues),
  });

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = form;
  const selectedRole = watch('role');

  useEffect(() => {
    if (isOpen) {
      reset(mapProfileToFormValues(defaultValues));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultValues, reset]);

  const handleFormSubmit = async (data: UserFormValues) => {
    await onSubmit(data, isEditing);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {isEditing ? 'Edit User' : 'Add New User'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? `Update details for ${defaultValues?.username || 'the user'}.` : 'Fill in the form to create a new user account.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
          <ScrollArea className="max-h-[65vh] p-1 pr-4"> {/* Added padding for scrollbar visibility */}
            <div className="space-y-4 px-1">
              <div>
                <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
                <Input id="username" {...register('username')} className="mt-1" aria-invalid={!!errors.username} />
                {errors.username && <p className="text-xs text-destructive mt-1">{errors.username.message}</p>}
              </div>

              <div>
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input id="email" type="email" {...register('email')} className="mt-1" aria-invalid={!!errors.email} />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
              </div>

              {!isEditing && (
                <div>
                  <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                  <Input id="password" type="password" {...register('password')} className="mt-1" placeholder="Min. 8 characters" aria-invalid={!!errors.password} />
                  {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                </div>
              )}
              {isEditing && (
                 <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" {...register('password')} className="mt-1" placeholder="Leave blank to keep current password" aria-invalid={!!errors.password} />
                   {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                   <p className="text-xs text-muted-foreground mt-1">Password change for existing users is currently not supported through this form. This field will be ignored if filled.</p>
                </div>
              )}

              <div>
                <Label htmlFor="role">Role <span className="text-destructive">*</span></Label>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={isEditing && !!defaultValues?.role}>
                      <SelectTrigger id="role" className="w-full mt-1" aria-invalid={!!errors.role}>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {userRoles.map(roleValue => (
                          <SelectItem key={roleValue} value={roleValue} className="capitalize">
                            {roleValue.charAt(0).toUpperCase() + roleValue.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                 {isEditing && !!defaultValues?.role && <p className="text-xs text-muted-foreground mt-1">Role cannot be changed after user creation.</p>}
                {errors.role && <p className="text-xs text-destructive mt-1">{errors.role.message}</p>}
              </div>

              {/* Department - always visible, but only required for Faculty */}
              <div>
                <Label htmlFor="departmentId">
                  Department {selectedRole === 'faculty' && <span className="text-destructive">*</span>}
                </Label>
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <SelectTrigger id="departmentId" className="w-full mt-1" aria-invalid={!!errors.departmentId}>
                        <SelectValue placeholder="Select a department (optional unless Faculty)" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
                        ))}
                        {/* <SelectItem value=""><em>None / Not Applicable</em></SelectItem> */} {/* Removed this line */}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.departmentId && <p className="text-xs text-destructive mt-1">{errors.departmentId.message}</p>}
              </div>


              {/* Conditional Fields based on Role */}
              {selectedRole === 'student' && (
                <div>
                  <Label htmlFor="major">Major</Label>
                  <Input id="major" {...register('major')} className="mt-1" />
                  {errors.major && <p className="text-xs text-destructive mt-1">{errors.major.message}</p>}
                </div>
              )}

              {selectedRole === 'faculty' && (
                <>
                  <div>
                    <Label htmlFor="officeNumber">Office Number</Label>
                    <Input id="officeNumber" {...register('officeNumber')} className="mt-1" />
                    {errors.officeNumber && <p className="text-xs text-destructive mt-1">{errors.officeNumber.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="specialization">Specialization</Label>
                    <Input id="specialization" {...register('specialization')} className="mt-1" />
                    {errors.specialization && <p className="text-xs text-destructive mt-1">{errors.specialization.message}</p>}
                  </div>
                </>
              )}

              {selectedRole === 'admin' && (
                <div>
                  <Label htmlFor="permissionLevel">Permission Level</Label>
                  <Input id="permissionLevel" {...register('permissionLevel')} className="mt-1" />
                  {errors.permissionLevel && <p className="text-xs text-destructive mt-1">{errors.permissionLevel.message}</p>}
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading} className="min-w-[100px]">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (isEditing ? 'Save Changes' : 'Create User')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
