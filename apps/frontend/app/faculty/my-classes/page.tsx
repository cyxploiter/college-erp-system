'use client';

import React, { useMemo } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { ScheduleItem as BaseScheduleItem, Section, Course, Semester, User } from '@college-erp/common';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, AlertCircle, BookOpen, Clock, MapPin, Users as RosterIcon, CalendarDays, School } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import * as dateFns from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

// Richer type for PopulatedScheduleItem as returned by backend scheduleService
interface PopulatedScheduleItemBE extends Omit<BaseScheduleItem, 'section' | 'startTime' | 'endTime'> {
  startTime: string; // ISO string from backend
  endTime: string;   // ISO string from backend
  section: Section & {
    course?: Course;
    semester?: Semester;
    faculty?: Pick<User, 'id' | 'username' | 'email'>;
  };
  className?: string;
  facultyName?: string;
}

// Type for frontend processing after parsing dates
interface PopulatedScheduleItem extends Omit<PopulatedScheduleItemBE, 'startTime' | 'endTime'> {
  startTime: Date;
  endTime: Date;
}

interface TransformedClass {
  sectionId: number;
  courseName: string;
  courseCode: string;
  sectionCode: string;
  semesterName: string;
  defaultRoomNumber?: string | null;
  maxCapacity?: number | null;
  meetings: Array<{
    id: number; // scheduleItem id
    dayOfWeek: string;
    startTime: string; // Formatted time string
    endTime: string;   // Formatted time string
    roomNumber: string;
    fullStartTime: Date; // Original Date object for sorting
  }>;
}

const fetchFacultySchedules = async (): Promise<PopulatedScheduleItem[]> => {
  const response = await apiClient.get<{ data: PopulatedScheduleItemBE[] }>('/schedules/my');
  return response.data.data.map(item => ({
    ...item,
    startTime: dateFns.parseISO(item.startTime),
    endTime: dateFns.parseISO(item.endTime),
  }));
};

const transformSchedulesToClasses = (schedules: PopulatedScheduleItem[]): TransformedClass[] => {
  if (!schedules || schedules.length === 0) return [];

  const classesMap = new Map<number, TransformedClass>();

  schedules.forEach(schedule => {
    const section = schedule.section;
    if (!section || !section.course || !section.semester) {
      console.warn('Skipping schedule item due to missing section/course/semester details:', schedule);
      return; 
    }

    if (!classesMap.has(section.id)) {
      classesMap.set(section.id, {
        sectionId: section.id,
        courseName: section.course.courseName,
        courseCode: section.course.courseCode,
        sectionCode: section.sectionCode,
        semesterName: section.semester.name,
        defaultRoomNumber: section.roomNumber,
        maxCapacity: section.maxCapacity,
        meetings: [],
      });
    }

    const classEntry = classesMap.get(section.id)!;
    classEntry.meetings.push({
      id: schedule.id,
      startTime: dateFns.format(schedule.startTime, 'p'), // 'h:mm a'
      endTime: dateFns.format(schedule.endTime, 'p'),
      dayOfWeek: dateFns.format(schedule.startTime, 'EEEE'), // 'Monday'
      roomNumber: schedule.roomNumber || section.roomNumber || 'N/A', // Specific meeting room or section default
      fullStartTime: schedule.startTime, 
    });
  });

  classesMap.forEach(classEntry => {
    classEntry.meetings.sort((a, b) => a.fullStartTime.getTime() - b.fullStartTime.getTime());
  });

  return Array.from(classesMap.values()).sort((a,b) => {
    // Optional: Sort classes by semester, then course code
    if (a.semesterName !== b.semesterName) {
        return a.semesterName.localeCompare(b.semesterName);
    }
    return a.courseCode.localeCompare(b.courseCode);
  });
};

export default function FacultyMyClassesPage() {
  const { user } = useAuth();
  const { data: rawSchedules, isLoading, error } = useQuery<PopulatedScheduleItem[], Error>({
    queryKey: ['facultyMySchedules', user?.id],
    queryFn: fetchFacultySchedules,
    enabled: !!user && user.role === 'faculty',
  });

  const facultyClasses = useMemo(() => {
    if (!rawSchedules) return [];
    return transformSchedulesToClasses(rawSchedules);
  }, [rawSchedules]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading your classes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Classes</h2>
        <p className="text-muted-foreground">{error.message}</p>
        <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page or contact support if the issue persists.</p>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['faculty']}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center">
            <BookOpen className="mr-3 h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            My Teaching Assignments
          </h1>
           <Badge variant="outline" className="text-sm py-1 px-3">
             {facultyClasses.length} class{facultyClasses.length !== 1 && 'es'} found
           </Badge>
        </div>

        {facultyClasses.length === 0 ? (
          <Card className="shadow-md">
            <CardContent className="pt-6 text-center">
              <School className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">No Classes Assigned</p>
              <p className="text-sm text-muted-foreground mt-1">You are not currently assigned to teach any classes.</p>
              <p className="text-sm text-muted-foreground mt-1">If this seems incorrect, please contact your department administrator.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {facultyClasses.map((klass) => (
              <Card key={klass.sectionId} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold text-primary leading-tight">
                      {klass.courseCode} - {klass.courseName}
                    </CardTitle>
                    <Badge variant="secondary" className="ml-2 shrink-0">Sec: {klass.sectionCode}</Badge>
                  </div>
                  <CardDescription className="text-sm text-muted-foreground pt-1">{klass.semesterName}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {klass.defaultRoomNumber && (
                       <div className="flex items-center">
                         <MapPin className="h-3.5 w-3.5 mr-1.5 text-primary/70" />
                         Default Room: <span className="font-medium text-foreground ml-1">{klass.defaultRoomNumber}</span>
                       </div>
                    )}
                    {klass.maxCapacity !== undefined && klass.maxCapacity !== null && (
                       <div className="flex items-center">
                         <RosterIcon className="h-3.5 w-3.5 mr-1.5 text-primary/70" />
                         Capacity: <span className="font-medium text-foreground ml-1">{klass.maxCapacity}</span>
                       </div>
                    )}
                  </div>
                  
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-1.5 flex items-center">
                        <CalendarDays className="h-4 w-4 mr-2 text-primary/80"/> Meeting Times
                    </h4>
                    {klass.meetings.length > 0 ? (
                      <ul className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin pr-1">
                        {klass.meetings.map(meeting => (
                          <li key={meeting.id} className="text-xs p-1.5 bg-muted/60 rounded-md border border-border/50">
                            <div className="font-medium text-foreground">{meeting.dayOfWeek}</div>
                            <div className="text-muted-foreground flex items-center">
                               <Clock className="h-3 w-3 mr-1 text-muted-foreground/80" /> {meeting.startTime} - {meeting.endTime}
                            </div>
                            { (meeting.roomNumber && meeting.roomNumber !== klass.defaultRoomNumber) &&
                              <div className="text-muted-foreground flex items-center">
                                <MapPin className="h-3 w-3 mr-1 text-muted-foreground/80" /> Room: {meeting.roomNumber}
                              </div>
                            }
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No specific meeting times listed for this section yet.</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-3 mt-auto">
                   <p className="text-xs text-muted-foreground italic">Details such as student roster will be available soon.</p>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
