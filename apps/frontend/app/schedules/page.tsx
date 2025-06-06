
'use client';
import React, { useState, useMemo } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { ScheduleItem as BaseScheduleItem, Section, Course, Semester, User, UserRole } from '@college-erp/common';
import {
  ChevronLeft, ChevronRight, CalendarDays, AlertCircle, X, Clock, MapPin, BookOpen as CourseIcon, User as UserIcon, School, Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import * as dateFns from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface PopulatedScheduleItemBE extends Omit<BaseScheduleItem, 'section' | 'startTime' | 'endTime'> {
  startTime: string; 
  endTime: string;   
  section: Section & {
    course?: Course;
    semester?: Semester;
    faculty?: Pick<User, 'id' | 'username' | 'email'>;
  };
  className?: string; 
  facultyName?: string; 
}

interface PopulatedScheduleItem extends Omit<PopulatedScheduleItemBE, 'startTime' | 'endTime'> {
  startTime: Date;
  endTime: Date;
}

const fetchMySchedules = async (): Promise<PopulatedScheduleItem[]> => {
  const response = await apiClient.get<{ data: PopulatedScheduleItemBE[] }>('/schedules/my');
  return response.data.data.map((item: PopulatedScheduleItemBE): PopulatedScheduleItem => ({
    ...item,
    startTime: dateFns.parseISO(item.startTime),
    endTime: dateFns.parseISO(item.endTime),
  }));
};

// For Faculty's "My Teaching Assignments" section
interface FacultyClassSummary {
  sectionId: number;
  courseName: string;
  courseCode: string;
  sectionCode: string;
  semesterName: string;
  defaultRoomNumber?: string | null;
  maxCapacity?: number | null;
  meetingPatterns: Array<{
    days: string[]; // e.g., ["Mon", "Wed"] (short day names)
    time: string;   // e.g., "9:00 AM - 10:30 AM"
    room: string;   // e.g., "CS-R1A"
  }>;
}

const transformSchedulesToFacultyClassesSummary = (schedules: PopulatedScheduleItem[]): FacultyClassSummary[] => {
  if (!schedules || schedules.length === 0) return [];

  const classesMap = new Map<number, FacultyClassSummary>();

  schedules.forEach(schedule => {
    const section = schedule.section;
    if (!section || !section.course || !section.semester) return;

    if (!classesMap.has(section.id)) {
      classesMap.set(section.id, {
        sectionId: section.id,
        courseName: section.course.courseName,
        courseCode: section.course.courseCode,
        sectionCode: section.sectionCode,
        semesterName: section.semester.name,
        defaultRoomNumber: section.roomNumber,
        maxCapacity: section.maxCapacity,
        meetingPatterns: [],
      });
    }

    const classEntry = classesMap.get(section.id)!;
    const timeStr = `${dateFns.format(schedule.startTime, 'p')} - ${dateFns.format(schedule.endTime, 'p')}`;
    const roomStr = schedule.roomNumber || section.roomNumber || 'N/A';
    const dayStr = dateFns.format(schedule.startTime, 'E'); // Short day name e.g. "Mon"
    
    let pattern = classEntry.meetingPatterns.find(p => p.time === timeStr && p.room === roomStr);
    if (pattern) {
      if (!pattern.days.includes(dayStr)) {
        pattern.days.push(dayStr);
        // Sort days based on standard week order (Mon, Tue, Wed...)
        const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        pattern.days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
      }
    } else {
      classEntry.meetingPatterns.push({ days: [dayStr], time: timeStr, room: roomStr });
    }
  });
  
  return Array.from(classesMap.values()).sort((a,b) => {
    if (a.semesterName !== b.semesterName) return a.semesterName.localeCompare(b.semesterName);
    return a.courseCode.localeCompare(b.courseCode);
  });
};


const CalendarCell: React.FC<{
  day: Date;
  isCurrentMonth: boolean;
  isTodayDate: boolean;
  events: PopulatedScheduleItem[];
  onDayClick: (day: Date) => void;
}> = ({ day, isCurrentMonth, isTodayDate, events, onDayClick }) => {
  const hasEvents = events.length > 0;

  return (
    <div
      className={cn(
        "min-h-[3rem] sm:min-h-[3.5rem] border-t border-r border-border p-0.5 sm:p-1 flex flex-col cursor-pointer transition-all duration-150 ease-in-out",
        isCurrentMonth ? "bg-card hover:bg-muted/80" : "bg-muted/50 text-muted-foreground hover:bg-muted",
        isTodayDate && "bg-primary/10 ring-1 ring-primary z-10",
        hasEvents && isCurrentMonth && "relative"
      )}
      onClick={() => onDayClick(day)}
    >
      <span
        className={cn(
          "text-[0.6rem] sm:text-xs font-medium self-end",
          isTodayDate && isCurrentMonth && "text-primary font-bold",
          !isCurrentMonth && "opacity-60"
        )}
      >
        {dateFns.format(day, 'd')}
      </span>
      {hasEvents && isCurrentMonth && (
        <div className="mt-px flex-grow overflow-y-auto scrollbar-thin space-y-px">
          {events.slice(0, 1).map(event => (
             <div key={event.id} className="text-[0.5rem] sm:text-[0.6rem] p-px sm:p-0.5 bg-primary/10 text-primary rounded-sm truncate" title={event.className || event.section?.course?.courseName}>
               {event.className || event.section?.course?.courseName || 'Scheduled Event'}
            </div>
          ))}
          {events.length > 1 && ( 
            <div className="text-[0.5rem] sm:text-[0.6rem] text-primary/80 font-medium text-center mt-px">+{events.length - 1} more</div>
          )}
        </div>
      )}
       {hasEvents && isCurrentMonth && !isTodayDate && (
        <div className="absolute bottom-1 right-1 h-1 w-1 rounded-full bg-primary opacity-75"></div>
      )}
    </div>
  );
};

export default function SchedulesPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: schedules = [], isLoading, error } = useQuery<PopulatedScheduleItem[], Error>({
    queryKey: ['mySchedules', user?.id],
    queryFn: fetchMySchedules,
    enabled: !!user,
  });

  const facultyClassesSummary = useMemo(() => {
    if (user?.role === 'faculty') {
      return transformSchedulesToFacultyClassesSummary(schedules);
    }
    return [];
  }, [schedules, user?.role]);

  const daysToDisplay = useMemo(() => {
    const monthStart = dateFns.startOfMonth(currentDate);
    const monthEnd = dateFns.endOfMonth(currentDate);
    
    const startDate = new Date(monthStart);
    const dayOfWeekStart = (dateFns.getDay(startDate) + 6) % 7;
    startDate.setDate(startDate.getDate() - dayOfWeekStart);

    const endDate = new Date(monthEnd);
    const dayOfWeekEnd = (dateFns.getDay(endDate) + 6) % 7;
    endDate.setDate(endDate.getDate() + (6 - dayOfWeekEnd)); 
    
    return dateFns.eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);


  const eventsByDate = useMemo(() => {
    const map = new Map<string, PopulatedScheduleItem[]>();
    schedules.forEach(event => {
      const eventDateStr = dateFns.format(event.startTime, 'yyyy-MM-dd');
      if (!map.has(eventDateStr)) {
        map.set(eventDateStr, []);
      }
      map.get(eventDateStr)?.push(event);
    });
    return map;
  }, [schedules]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => dateFns.subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => dateFns.addMonths(prev, 1));
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsModalOpen(true);
  };

  const eventsForSelectedDate = selectedDate
    ? (eventsByDate.get(dateFns.format(selectedDate, 'yyyy-MM-dd')) || []).sort((a,b) => a.startTime.getTime() - b.startTime.getTime())
    : [];

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <ProtectedRoute allowedRoles={['student', 'faculty']}>
      <div className="flex flex-col flex-grow space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center">
            <CalendarDays className="mr-3 h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            My Academic Schedule
          </h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" onClick={handlePrevMonth} aria-label="Previous month">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground w-36 sm:w-44 text-center">
              {dateFns.format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button variant="outline" onClick={handleNextMonth} aria-label="Next month">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-border flex flex-col flex-grow overflow-hidden">
           <CardHeader className="bg-muted/30 border-b border-border p-2 sm:p-3">
                <div className="grid grid-cols-7">
                    {weekDays.map(day => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                        {day}
                    </div>
                    ))}
                </div>
           </CardHeader>
          <CardContent className="p-0 flex flex-col flex-grow">
            {isLoading && <p className="text-muted-foreground py-10 text-center">Loading your schedule...</p>}
            {error && (
              <div className="text-destructive bg-destructive/10 p-6 rounded-md flex items-center justify-center">
                <AlertCircle className="h-5 w-5 mr-2"/> Error loading schedules: {error.message}
              </div>
            )}
            {!isLoading && !error && (
              <div className="grid grid-cols-7 border-l border-border flex-grow">
                {daysToDisplay.map((day, index) => (
                  <CalendarCell
                    key={index}
                    day={day}
                    isCurrentMonth={dateFns.isSameMonth(day, currentDate)}
                    isTodayDate={dateFns.isToday(day)}
                    events={eventsByDate.get(dateFns.format(day, 'yyyy-MM-dd')) || []}
                    onDayClick={handleDayClick}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {user?.role === 'faculty' && !isLoading && !error && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center">
                <Building className="mr-3 h-6 w-6 text-primary" />
                My Teaching Assignments
              </h2>
              <Badge variant="secondary" className="text-sm">
                {facultyClassesSummary.length} class{facultyClassesSummary.length !== 1 && 'es'}
              </Badge>
            </div>
            {facultyClassesSummary.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="pt-6 text-center">
                  <School className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-md font-medium text-muted-foreground">No classes currently assigned.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                {facultyClassesSummary.map((klass) => (
                  <Card key={klass.sectionId} className="shadow-md hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-md font-semibold text-primary">
                          {klass.courseCode} - {klass.courseName}
                        </CardTitle>
                        <Badge variant="outline">Sec: {klass.sectionCode}</Badge>
                      </div>
                      <CardDescription className="text-xs text-muted-foreground pt-0.5">{klass.semesterName}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                       <div className="flex items-center text-muted-foreground">
                         <MapPin className="h-3.5 w-3.5 mr-1.5 text-primary/70 shrink-0" />
                         Default Room: <span className="font-medium text-foreground ml-1">{klass.defaultRoomNumber || 'N/A'}</span>
                         <span className="mx-2">|</span>
                         Capacity: <span className="font-medium text-foreground ml-1">{klass.maxCapacity ?? 'N/A'}</span>
                       </div>
                      {klass.meetingPatterns.length > 0 && <Separator className="my-1.5"/>}
                      <ul className="space-y-1">
                        {klass.meetingPatterns.map((pattern, idx) => (
                          <li key={idx} className="flex items-start">
                            <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/80 shrink-0 mt-px" />
                            <div>
                                <span className="font-medium text-foreground/90">{pattern.days.join(', ')}:</span> {pattern.time}
                                {pattern.room !== klass.defaultRoomNumber && pattern.room !== 'N/A' && (
                                    <span className="text-muted-foreground/80"> (Room: {pattern.room})</span>
                                )}
                            </div>
                          </li>
                        ))}
                      </ul>
                       {klass.meetingPatterns.length === 0 && (
                           <p className="italic text-muted-foreground/90">No specific meeting patterns found for this section from your current schedule view.</p>
                       )}
                    </CardContent>
                     <CardFooter className="pt-2 pb-3">
                        <p className="text-xs text-muted-foreground/70 italic w-full text-right">Roster & detailed view coming soon.</p>
                     </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedDate && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-lg bg-card">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl font-semibold text-primary flex items-center">
                   <CalendarDays className="mr-2.5 h-6 w-6"/> Events for {dateFns.format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </DialogTitle>
                 <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                </DialogClose>
              </DialogHeader>
              <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
                {eventsForSelectedDate.length > 0 ? (
                  <ul className="space-y-4">
                    {eventsForSelectedDate.map(event => (
                      <li key={event.id} className="p-4 border border-border rounded-lg bg-muted/50 hover:shadow-md transition-shadow">
                        <h3 className="font-semibold text-base sm:text-lg text-foreground mb-1 flex items-center">
                           <CourseIcon className="h-5 w-5 mr-2 text-primary/80"/> 
                           {event.section?.course?.courseCode} - {event.className || event.section?.course?.courseName || 'Scheduled Event'} (Sec: {event.section?.sectionCode})
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center mb-0.5">
                          <Clock className="h-4 w-4 mr-1.5 text-muted-foreground/80" />
                          {dateFns.format(event.startTime, 'p')} - {dateFns.format(event.endTime, 'p')}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center mb-0.5">
                          <MapPin className="h-4 w-4 mr-1.5 text-muted-foreground/80" />
                          Room: {event.roomNumber || event.section?.roomNumber || 'N/A'}
                        </p>
                        {user?.role === 'student' && event.facultyName && ( // Show faculty name to students
                          <p className="text-sm text-muted-foreground flex items-center">
                            <UserIcon className="h-4 w-4 mr-1.5 text-muted-foreground/80" />
                            Instructor: {event.facultyName}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-center py-8 text-sm">No events scheduled for this day.</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </ProtectedRoute>
  );
}
