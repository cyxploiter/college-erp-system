'use client';
import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Edit, Home, Phone, CalendarDays as CalendarIcon, Users, BookOpen, Briefcase, Info, GraduationCap } from 'lucide-react'; // Added GraduationCap
import { UserProfileResponse, APIResponse } from '@college-erp/common';
import apiClient from '@/lib/apiClient';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const ProfileField: React.FC<{ label: string, value?: string | number | null, icon?: React.ElementType, placeholder?: string }> = 
  ({ label, value, icon: Icon, placeholder = "N/A" }) => (
  <div>
    <Label className="text-xs font-medium text-muted-foreground flex items-center">
      {Icon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
      {label}
    </Label>
    <p className="mt-0.5 text-sm text-foreground bg-muted/30 px-3 py-1.5 rounded-md min-h-[36px] flex items-center">
      {value || <span className="text-muted-foreground/70 italic">{placeholder}</span>}
    </p>
  </div>
);

export default function ProfilePage() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [profileData, setProfileData] = useState<UserProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    if (authUser?.id) {
      setIsLoadingProfile(true);
      apiClient.get<APIResponse<UserProfileResponse>>(`/users/me`)
        .then(response => {
          setProfileData(response.data.data || null);
        })
        .catch(error => {
          console.error("Failed to fetch full profile:", error);
          // Fallback to authUser if full profile fetch fails, though it might be less detailed
          if(authUser) {
            setProfileData(authUser as UserProfileResponse); // Cast, knowing it might be partial
          }
        })
        .finally(() => setIsLoadingProfile(false));
    } else if (!authLoading) {
        setIsLoadingProfile(false); // No user ID, so stop loading
    }
  }, [authUser, authLoading]);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    let initials = parts[0]?.[0] || '';
    if (parts.length > 1) {
      initials += parts[parts.length - 1]?.[0] || '';
    } else if (name.length > 1 && parts[0].length > 1) { // Changed from name.length > 1
      initials = name.substring(0, 2);
    } else if (initials === '') {
        initials = name.substring(0,1) || 'U';
    }
    return initials.toUpperCase();
  };

  const userToDisplay = profileData || authUser; // Prioritize full profile, fallback to context
  
  if (authLoading || isLoadingProfile) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6 max-w-4xl mx-auto">
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
                <AvatarImage 
                  src={userToDisplay?.profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userToDisplay?.name || 'U')}&background=3B82F6&color=FFFFFF&size=128&bold=true`} 
                  alt={userToDisplay?.name} />
                <AvatarFallback className="text-3xl bg-muted text-muted-foreground">{getInitials(userToDisplay?.name)}</AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <CardTitle className="text-2xl sm:text-3xl text-foreground">{userToDisplay?.name}</CardTitle>
                <CardDescription className="text-base text-muted-foreground mt-1">
                  Role: <span className="font-medium text-primary capitalize">{userToDisplay?.role}</span>
                </CardDescription>
                 {userToDisplay?.department && (
                    <CardDescription className="text-sm text-muted-foreground mt-0.5">
                        Department: <span className="font-medium">{userToDisplay.department.name}</span>
                    </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <ProfileField label="Full Name" value={userToDisplay?.name} icon={UserCircle} />
              <ProfileField label="Email Address" value={userToDisplay?.email} icon={Info} />
            </div>
            
            {/* Student Specific Details */}
            {userToDisplay?.role === 'student' && userToDisplay.studentDetails && (
              <div className="border-t border-border pt-6 mt-4">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <GraduationCap className="mr-2 h-5 w-5 text-primary/80" /> Student Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                  <ProfileField label="Student ID" value={userToDisplay.studentRegistrationId} />
                  <ProfileField label="Date of Birth" value={userToDisplay.studentDetails.dateOfBirth ? format(new Date(userToDisplay.studentDetails.dateOfBirth), 'MMMM d, yyyy') : undefined} icon={CalendarIcon} />
                  <ProfileField label="Phone Number" value={userToDisplay.studentDetails.phoneNumber} icon={Phone} />
                  <ProfileField label="Program" value={userToDisplay.studentDetails.program} />
                  <ProfileField label="Branch" value={userToDisplay.studentDetails.branch} />
                  <ProfileField label="Current Year" value={userToDisplay.studentDetails.currentYearOfStudy ? `${userToDisplay.studentDetails.currentYearOfStudy}` : undefined} />
                  <ProfileField label="Expected Graduation" value={userToDisplay.studentDetails.expectedGraduationYear ? `${userToDisplay.studentDetails.expectedGraduationYear}` : undefined} />
                  <ProfileField label="GPA" value={userToDisplay.studentDetails.gpa?.toString()} />
                  <ProfileField label="Academic Status" value={userToDisplay.studentDetails.academicStatus} />
                  <ProfileField label="Father's Name" value={userToDisplay.studentDetails.fatherName} icon={Users} />
                  <ProfileField label="Mother's Name" value={userToDisplay.studentDetails.motherName} icon={Users} />
                  <ProfileField label="Permanent Address" value={userToDisplay.studentDetails.permanentAddress} icon={Home} />
                  <ProfileField label="Current Address" value={userToDisplay.studentDetails.currentAddress} icon={Home} />
                </div>
              </div>
            )}

            {/* Faculty Specific Details */}
             {userToDisplay?.role === 'faculty' && userToDisplay.facultyDetails && (
              <div className="border-t border-border pt-6 mt-4">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <Briefcase className="mr-2 h-5 w-5 text-primary/80" /> Faculty Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                  <ProfileField label="Faculty ID" value={userToDisplay.facultyEmployeeId} />
                  <ProfileField label="Office Number" value={userToDisplay.facultyDetails.officeNumber} />
                  <ProfileField label="Specialization" value={userToDisplay.facultyDetails.specialization} />
                </div>
              </div>
            )}

            {/* Admin Specific Details */}
            {userToDisplay?.role === 'admin' && userToDisplay.adminDetails && (
              <div className="border-t border-border pt-6 mt-4">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <Edit className="mr-2 h-5 w-5 text-primary/80" /> Admin Information
                </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    <ProfileField label="Admin ID" value={userToDisplay.adminEmployeeId} />
                    <ProfileField label="Permission Level" value={userToDisplay.adminDetails.permissionLevel} />
                </div>
              </div>
            )}
            
            {/* Superuser Specific Details */}
            {userToDisplay?.role === 'superuser' && userToDisplay.superuserDetails && (
              <div className="border-t border-border pt-6 mt-4">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <UserCircle className="mr-2 h-5 w-5 text-primary/80" /> Superuser Information
                </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    <ProfileField label="Superuser ID" value={userToDisplay.superuserEmployeeId} />
                 </div>
                 <div>
                    <Label className="text-xs font-medium text-muted-foreground flex items-center">Permissions</Label>
                    <pre className="mt-0.5 text-xs text-foreground bg-muted/30 p-3 rounded-md whitespace-pre-wrap break-all">
                        {userToDisplay.superuserDetails.permissions ? JSON.stringify(JSON.parse(userToDisplay.superuserDetails.permissions), null, 2) : 'N/A'}
                    </pre>
                 </div>
              </div>
            )}


            <div className="border-t border-border pt-6 mt-2">
                <h3 className="text-lg font-semibold text-foreground mb-3">Account Activity</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                    <p><span className="font-medium text-foreground/90">Joined:</span> {userToDisplay?.createdAt ? format(new Date(userToDisplay.createdAt), 'MMMM d, yyyy') : 'N/A'}</p>
                    <p><span className="font-medium text-foreground/90">Last Updated:</span> {userToDisplay?.updatedAt ? format(new Date(userToDisplay.updatedAt), 'MMMM d, yyyy, p') : 'N/A'}</p>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}