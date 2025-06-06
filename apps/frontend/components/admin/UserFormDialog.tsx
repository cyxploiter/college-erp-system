
'use client';

import React, { useEffect, useMemo } from 'react'; 
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
import { Textarea } from "@/components/ui/textarea";
import { Department, UserRole, UserProfileResponse } from '@college-erp/common';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const userRoles = ['student', 'faculty', 'admin', 'superuser'] as const;

// Base schema for form values (string representation for some fields like departmentId)
const baseUserFormSchema = z.object({
  name: z.string().min(3, "Full name must be at least 3 characters").max(100, "Name too long"),
  email: z.string().email("Invalid email address"),
  profilePictureUrl: z.string().url("Invalid URL for profile picture.").optional().nullable(),
  password: z.string().optional(), // Optional for edit, required for create (refined later)
  role: z.enum(userRoles, { required_error: "Role is required" }),
  departmentId: z.string().optional().nullable(), // Department ID from select is string

  // Student-specific fields
  program: z.string().max(100, "Program name too long").optional().nullable(),
  branch: z.string().max(100, "Branch name too long").optional().nullable(),
  expectedGraduationYear: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? null : (typeof val === 'string' && val.trim() !== '' ? parseInt(val, 10) : val),
    z.number().int().positive("Year must be positive").optional().nullable()
  ),
  currentYearOfStudy: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? null : (typeof val === 'string' && val.trim() !== '' ? parseInt(val, 10) : val),
    z.number().int().min(1).max(10).optional().nullable()
  ),
  gpa: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? null : (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : val),
    z.number().min(0).max(10, "GPA must be between 0 and 10").optional().nullable()
  ),
  academicStatus: z.string().max(50).optional().nullable(),
  fatherName: z.string().max(100).optional().nullable(),
  motherName: z.string().max(100).optional().nullable(),
  dateOfBirth: z.string().optional().nullable().refine(val => !val || !isNaN(Date.parse(val)) || /^\d{4}-\d{2}-\d{2}$/.test(val), { message: "Invalid date (YYYY-MM-DD)" }),
  phoneNumber: z.string().max(20, "Phone number too long").optional().nullable(),
  permanentAddress: z.string().max(255).optional().nullable(),
  currentAddress: z.string().max(255).optional().nullable(),

  // Faculty-specific fields
  officeNumber: z.string().max(50, "Office number too long").optional().nullable(),
  specialization: z.string().max(100, "Specialization too long").optional().nullable(),

  // Admin-specific fields
  permissionLevel: z.string().max(50, "Permission level too long").optional().nullable(),

  // Superuser-specific fields
  superuserPermissions: z.string().optional().nullable(),
});

export type UserFormValues = z.infer<typeof baseUserFormSchema>;

interface UserFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (values: UserFormValues & { departmentId?: number | null }, isEditing: boolean) => Promise<void>; // onSubmit expects numeric departmentId
  defaultValues?: UserProfileResponse | null;
  isEditing: boolean;
  departments: Department[];
  isLoading: boolean;
}

// Maps UserProfileResponse (where departmentId is number) to UserFormValues (where departmentId is string for select)
const mapProfileToFormValues = (profile?: UserProfileResponse | null): Partial<UserFormValues> => {
  if (!profile) return { role: 'student', departmentId: null }; 
  
  let formDepartmentId: string | null = null;
  if (profile.role === 'faculty' && profile.facultyDetails?.departmentId) {
    formDepartmentId = profile.facultyDetails.departmentId.toString();
  } else if (profile.departmentId) { // General departmentId from user object
    formDepartmentId = profile.departmentId.toString();
  }
  
  return {
    name: profile.name,
    email: profile.email,
    profilePictureUrl: profile.profilePictureUrl,
    role: profile.role,
    departmentId: formDepartmentId,

    program: profile.studentDetails?.program || undefined,
    branch: profile.studentDetails?.branch || undefined,
    expectedGraduationYear: profile.studentDetails?.expectedGraduationYear || undefined,
    currentYearOfStudy: profile.studentDetails?.currentYearOfStudy || undefined,
    gpa: profile.studentDetails?.gpa || undefined,
    academicStatus: profile.studentDetails?.academicStatus || undefined,
    fatherName: profile.studentDetails?.fatherName || undefined,
    motherName: profile.studentDetails?.motherName || undefined,
    dateOfBirth: profile.studentDetails?.dateOfBirth ? profile.studentDetails.dateOfBirth.split('T')[0] : undefined,
    phoneNumber: profile.studentDetails?.phoneNumber || undefined,
    permanentAddress: profile.studentDetails?.permanentAddress || undefined,
    currentAddress: profile.studentDetails?.currentAddress || undefined,

    officeNumber: profile.facultyDetails?.officeNumber || undefined,
    specialization: profile.facultyDetails?.specialization || undefined,

    permissionLevel: profile.adminDetails?.permissionLevel || undefined,
    superuserPermissions: profile.superuserDetails?.permissions || undefined,
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

  const refinedUserFormSchema = useMemo(() => {
    return baseUserFormSchema.superRefine((data, ctx) => {
      if (!isEditing && (!data.password || data.password.length < 8)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password must be at least 8 characters for new users.",
          path: ['password'],
        });
      }
      // For faculty, departmentId (string from form) must be present and a valid number.
      if (data.role === 'faculty' && (!data.departmentId || isNaN(parseInt(data.departmentId)))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Department is required for faculty.",
          path: ['departmentId'],
        });
      }
      if (data.role === 'superuser' && data.superuserPermissions) {
          try {
              if (data.superuserPermissions.trim() !== "") JSON.parse(data.superuserPermissions);
          } catch (e) {
              ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Permissions must be a valid JSON string if provided.",
                  path: ['superuserPermissions'],
              });
          }
      }
      if (data.dateOfBirth && data.dateOfBirth.trim() !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(data.dateOfBirth)) {
         ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date of Birth must be in YYYY-MM-DD format.",
          path: ['dateOfBirth'],
        });
      }
    });
  }, [isEditing]);


  const form = useForm<UserFormValues>({
    resolver: zodResolver(refinedUserFormSchema),
    defaultValues: mapProfileToFormValues(defaultValues || { role: 'student', departmentId: null }),
  });

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = form;
  const selectedRole = watch('role');

  useEffect(() => {
    if (isOpen) {
      reset(mapProfileToFormValues(defaultValues || { role: 'student', departmentId: null }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultValues, reset]);

  const handleFormSubmit = async (data: UserFormValues) => {
    const submissionData = { ...data };
    if (isEditing && (!submissionData.password || submissionData.password.trim() === '')) {
        delete submissionData.password;
    }
    // Convert departmentId from string to number for the onSubmit callback
    const numericDepartmentId = data.departmentId ? parseInt(data.departmentId, 10) : null;
    await onSubmit({ ...submissionData, departmentId: numericDepartmentId }, isEditing);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {isEditing ? 'Edit User' : 'Add New User'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? `Update details for ${defaultValues?.name || 'the user'}.` : 'Fill in the form to create a new user account.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
          <ScrollArea className="max-h-[65vh] p-1 pr-4"> 
            <div className="space-y-4 px-1"> 
              <div>
                <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                <Input id="name" {...register('name')} className="mt-1" aria-invalid={!!errors.name} />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input id="email" type="email" {...register('email')} className="mt-1" aria-invalid={!!errors.email} />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
              </div>
              
              <div>
                <Label htmlFor="profilePictureUrl">Profile Picture URL</Label>
                <Input id="profilePictureUrl" type="url" {...register('profilePictureUrl')} className="mt-1" placeholder="https://example.com/image.png" aria-invalid={!!errors.profilePictureUrl} />
                {errors.profilePictureUrl && <p className="text-xs text-destructive mt-1">{errors.profilePictureUrl.message}</p>}
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
                  <Label htmlFor="password">New Password (Optional)</Label>
                  <Input id="password" type="password" {...register('password')} className="mt-1" placeholder="Leave blank to keep current password" aria-invalid={!!errors.password} />
                   {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
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
              
              {(selectedRole === 'student' || selectedRole === 'faculty' || selectedRole === 'admin') && (
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
                          <SelectValue placeholder={selectedRole === 'faculty' ? "Select a department (Required)" : "Select a department (Optional)"} />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="">None</SelectItem> {/* Explicit None option */}
                          {departments.map(dept => (
                            <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.departmentId && <p className="text-xs text-destructive mt-1">{errors.departmentId.message}</p>}
                </div>
              )}


              {selectedRole === 'student' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="program">Program</Label>
                      <Input id="program" {...register('program')} className="mt-1" />
                      {errors.program && <p className="text-xs text-destructive mt-1">{errors.program.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="branch">Branch</Label>
                      <Input id="branch" {...register('branch')} className="mt-1" />
                      {errors.branch && <p className="text-xs text-destructive mt-1">{errors.branch.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} className="mt-1" placeholder="YYYY-MM-DD" />
                      {errors.dateOfBirth && <p className="text-xs text-destructive mt-1">{errors.dateOfBirth.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input id="phoneNumber" {...register('phoneNumber')} className="mt-1" />
                      {errors.phoneNumber && <p className="text-xs text-destructive mt-1">{errors.phoneNumber.message}</p>}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="fatherName">Father's Name</Label>
                    <Input id="fatherName" {...register('fatherName')} className="mt-1" />
                    {errors.fatherName && <p className="text-xs text-destructive mt-1">{errors.fatherName.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="motherName">Mother's Name</Label>
                    <Input id="motherName" {...register('motherName')} className="mt-1" />
                    {errors.motherName && <p className="text-xs text-destructive mt-1">{errors.motherName.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="permanentAddress">Permanent Address</Label>
                    <Textarea id="permanentAddress" {...register('permanentAddress')} className="mt-1" />
                    {errors.permanentAddress && <p className="text-xs text-destructive mt-1">{errors.permanentAddress.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="currentAddress">Current Address</Label>
                    <Textarea id="currentAddress" {...register('currentAddress')} className="mt-1" />
                    {errors.currentAddress && <p className="text-xs text-destructive mt-1">{errors.currentAddress.message}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="expectedGraduationYear">Expected Graduation Year</Label>
                        <Input id="expectedGraduationYear" type="number" {...register('expectedGraduationYear')} className="mt-1" placeholder="e.g., 2027" />
                        {errors.expectedGraduationYear && <p className="text-xs text-destructive mt-1">{errors.expectedGraduationYear.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="currentYearOfStudy">Current Year of Study</Label>
                        <Input id="currentYearOfStudy" type="number" {...register('currentYearOfStudy')} className="mt-1" placeholder="e.g., 1, 2" />
                        {errors.currentYearOfStudy && <p className="text-xs text-destructive mt-1">{errors.currentYearOfStudy.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="gpa">GPA</Label>
                        <Input id="gpa" type="number" step="0.01" {...register('gpa')} className="mt-1" placeholder="e.g., 8.5" />
                        {errors.gpa && <p className="text-xs text-destructive mt-1">{errors.gpa.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="academicStatus">Academic Status</Label>
                         <Controller
                            name="academicStatus"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <SelectTrigger id="academicStatus" className="w-full mt-1">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">None</SelectItem>
                                    <SelectItem value="Good Standing">Good Standing</SelectItem>
                                    <SelectItem value="Probation">Probation</SelectItem>
                                    <SelectItem value="Suspended">Suspended</SelectItem>
                                </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.academicStatus && <p className="text-xs text-destructive mt-1">{errors.academicStatus.message}</p>}
                    </div>
                  </div>
                </>
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
              
              {selectedRole === 'superuser' && (
                <div>
                  <Label htmlFor="superuserPermissions">Permissions (JSON)</Label>
                  <Textarea id="superuserPermissions" {...register('superuserPermissions')} className="mt-1 min-h-[80px]" placeholder='e.g., {"canManageSettings": true}' />
                  {errors.superuserPermissions && <p className="text-xs text-destructive mt-1">{errors.superuserPermissions.message}</p>}
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isLoading} onClick={() => onOpenChange(false)}>
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