
'use client'; // Added 'use client'
import React, { useState, useMemo } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { ScheduleItem as BaseScheduleItem, Section, Course, Semester, User, APIResponse } from '@college-erp/common'; // Import base types
import {
  ChevronLeft, ChevronRight, CalendarDays, AlertCircle, X, Clock, MapPin, BookOpen, User as UserIcon, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { parseISO } from 'date-fns/parseISO';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { getDay } from 'date-fns/getDay';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import { format } from 'date-fns/format';
import { isSameMonth } from 'date-fns/isSameMonth';
import { isToday } from 'date-fns/isToday';
import { isSameDay } from 'date-fns/isSameDay';
import { subMonths } from 'date-fns/subMonths';
import { addMonths } from 'date-fns/addMonths';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

// Define a richer type for frontend use, based on what scheduleService now returns
interface PopulatedScheduleItem extends Omit<BaseScheduleItem, 'section' | 'startTime' | 'endTime'> {
  startTime: Date; // Parsed date
  endTime: Date;   // Parsed date
  section: Section & {
    course?: Course;
    semester?: Semester;
    faculty?: Pick<User, 'id' | 'name' | 'email'>; // User model now has 'name'
  };
  className?: string; // Derived: section.course.courseName
  facultyName?: string; // Derived: section.faculty.name
}


const fetchMySchedules = async (): Promise<PopulatedScheduleItem[]> => {
  const response = await apiClient.get<APIResponse<PopulatedScheduleItem[]>>('/schedules/my'); // Expecting richer data
  return response.data.data?.map((item: any): PopulatedScheduleItem => ({ // Ensure data exists before mapping
    ...item,
    startTime: parseISO(item.startTime),
    endTime: parseISO(item.endTime),
    // section and its nested properties should already be populated by backend
  })) || [];
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
        "min-h-[4rem] sm:min-h-[5rem] md:min-h-[6rem] border-t border-r border-border p-1 sm:p-1.5 flex flex-col cursor-pointer transition-all duration-150 ease-in-out", 
        isCurrentMonth ? "bg-card hover:bg-muted/80" : "bg-muted/50 text-muted-foreground hover:bg-muted",
        isTodayDate && "bg-primary/10 ring-1 ring-primary z-10",
        hasEvents && isCurrentMonth && "relative"
      )}
      onClick={() => onDayClick(day)}
    >
      <span
        className={cn(
          "text-xs sm:text-sm font-medium self-end", 
          isTodayDate && isCurrentMonth && "text-primary font-bold",
          !isCurrentMonth && "opacity-60"
        )}
      >
        {format(day, 'd')}
      </span>
      {hasEvents && isCurrentMonth && (
        <div className="mt-1 flex-grow overflow-y-auto scrollbar-thin space-y-1"> 
          {events.slice(0, 2).map(event => ( // Show max 2 events directly, then indicator
             <div key={event.id} className="text-[0.6rem] sm:text-xs p-0.5 sm:p-1 bg-primary/10 text-primary rounded-sm truncate" title={event.className || event.section?.course?.courseName}> 
               {event.className || event.section?.course?.courseName || 'Scheduled Event'}
            </div>
          ))}
          {events.length > 2 && (
            <div className="text-[0.6rem] sm:text-xs text-primary/80 font-medium text-center mt-0.5">+{events.length - 2} more</div> 
          )}
        </div>
      )}
       {hasEvents && isCurrentMonth && !isTodayDate && (
        <div className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary opacity-75"></div>
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

  const daysToDisplay = useMemo(() => {
    const monthStartValue = startOfMonth(currentDate);
    const monthEndValue = endOfMonth(currentDate);

    const startDateValue = new Date(monthStartValue);
    // Adjust to ensure calendar starts on Monday (getDay returns 0 for Sun, 1 for Mon, ..., 6 for Sat)
    const dayOfWeekStart = (getDay(startDateValue) + 6) % 7; 
    startDateValue.setDate(startDateValue.getDate() - dayOfWeekStart);

    const endDateValue = new Date(monthEndValue);
    // Adjust to ensure calendar ends on Sunday
    const dayOfWeekEnd = (getDay(endDateValue) + 6) % 7; 
    endDateValue.setDate(endDateValue.getDate() + (6 - dayOfWeekEnd));
    
    // Ensure we display a full 6 weeks (42 days) for consistent layout
    let daysArray = eachDayOfInterval({ start: startDateValue, end: endDateValue });
    if (daysArray.length < 42) {
        const lastDay = daysArray[daysArray.length -1];
        const extraDaysNeeded = 42 - daysArray.length;
        const extraDays = eachDayOfInterval({ start: new Date(lastDay.setDate(lastDay.getDate() + 1)), end: new Date(lastDay.setDate(lastDay.getDate() + extraDaysNeeded)) });
        daysArray = daysArray.concat(extraDays);
    }


    return daysArray.slice(0, 42); // Take exactly 42 days
  }, [currentDate]);


  const eventsByDate = useMemo(() => {
    const map = new Map<string, PopulatedScheduleItem[]>();
    schedules.forEach(event => {
      const eventDateStr = format(event.startTime, 'yyyy-MM-dd');
      if (!map.has(eventDateStr)) {
        map.set(eventDateStr, []);
      }
      map.get(eventDateStr)?.push(event);
    });
    return map;
  }, [schedules]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsModalOpen(true);
  };

  const eventsForSelectedDate = selectedDate
    ? (eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []).sort((a,b) => a.startTime.getTime() - b.startTime.getTime())
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
              {format(currentDate, 'MMMM yyyy')}
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
            {isLoading && (
                <div className="flex items-center justify-center flex-grow">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading schedule...</p>
                </div>
            )}
            {error && (
                <div className="flex items-center justify-center flex-grow text-destructive bg-destructive/10 p-4">
                    <AlertCircle className="mr-2 h-5 w-5"/> Error loading schedule: {error.message}
                </div>
            )}
            {!isLoading && !error && (
              <div className="grid grid-cols-7 flex-grow border-l border-border">
                {daysToDisplay.map((day) => (
                  <CalendarCell
                    key={day.toString()}
                    day={day}
                    isCurrentMonth={isSameMonth(day, currentDate)}
                    isTodayDate={isToday(day)}
                    events={eventsByDate.get(format(day, 'yyyy-MM-dd')) || []}
                    onDayClick={handleDayClick}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-lg bg-card">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-foreground">
                Events for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
              </DialogTitle>
               <DialogClose asChild>
                  <Button variant="ghost" size="icon" className="absolute top-3 right-3">
                    <X className="h-5 w-5" />
                  </Button>
              </DialogClose>
            </DialogHeader>
            <div className="py-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
              {eventsForSelectedDate.length > 0 ? (
                <ul className="space-y-4">
                  {eventsForSelectedDate.map(event => (
                    <li key={event.id} className="p-4 border border-border rounded-md bg-muted/50 shadow-sm">
                      <h4 className="font-semibold text-primary text-md">
                        {event.className || event.section?.course?.courseName || 'Scheduled Event'}
                      </h4>
                      <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                        <p className="flex items-center"><Clock className="mr-2 h-4 w-4 text-primary/70" /> {format(event.startTime, 'h:mm a')} - {format(event.endTime, 'h:mm a')}</p>
                        <p className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary/70" /> Room: {event.roomNumber || event.section?.roomNumber || 'N/A'}</p>
                        {event.section?.course?.courseCode && <p className="flex items-center"><BookOpen className="mr-2 h-4 w-4 text-primary/70" /> Course: {event.section.course.courseCode}</p>}
                        {event.facultyName && <p className="flex items-center"><UserIcon className="mr-2 h-4 w-4 text-primary/70" /> Faculty: {event.facultyName}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-6">No events scheduled for this day.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </ProtectedRoute>
  );
}
