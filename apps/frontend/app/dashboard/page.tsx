
'use client';
import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { ArrowRight, Bell, BookOpen, CalendarClock, User, Users, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { ScheduleItem, Message, UserRole } from '@college-erp/common';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils'; 

interface DashboardData {
  nextClass?: ScheduleItem;
  recentAnnouncements?: Message[];
}

const fetchDashboardData = async (): Promise<DashboardData> => {
  const [schedulesResponse, messagesResponse] = await Promise.all([
    apiClient.get<{ data: ScheduleItem[] }>('/schedules/my'),
    apiClient.get<{ data: Message[] }>('/messages/my?type=Broadcast'), // Fetch all broadcasts
  ]);

  const schedules = schedulesResponse.data.data;
  const now = new Date();
  const nextClass = schedules
    .filter(s => new Date(s.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  const recentAnnouncements = messagesResponse.data.data
    .filter(m => m.type === 'Broadcast') // Ensure it's a broadcast
    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0,3); // Get top 3 recent

  return { nextClass, recentAnnouncements };
};


const DashboardCard: React.FC<{title: string, description?: string, icon?: React.ElementType, children: React.ReactNode, footerLink?: string, footerText?: string, className?: string, contentClassName?: string }> = 
  ({ title, description, icon: Icon, children, footerLink, footerText, className, contentClassName }) => (
  <Card className={cn("shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out border-border rounded-lg flex flex-col", className)}>
    <CardHeader className="pb-4">
      <div className="flex items-center justify-between">
        <CardTitle className="text-xl font-semibold text-foreground">{title}</CardTitle>
        {Icon && <Icon className="h-6 w-6 text-primary" />}
      </div>
      {description && <CardDescription className="text-muted-foreground text-sm mt-1">{description}</CardDescription>}
    </CardHeader>
    <CardContent className={cn("flex-grow", contentClassName)}>
      {children}
    </CardContent>
    {footerLink && footerText && (
      <CardFooter className="pt-4 mt-auto">
        <Button variant="link" asChild className="p-0 text-sm text-primary hover:text-primary/80 font-medium">
          <Link href={footerLink}>
            {footerText} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    )}
  </Card>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery<DashboardData, Error>({
    queryKey: ['dashboardData', user?.id], // Add user?.id to re-fetch if user changes
    queryFn: fetchDashboardData,
    enabled: !!user, 
  });

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Loading dashboard...</p>
    </div>
  );
  
  if (error) return <div className="text-destructive bg-destructive/10 p-4 rounded-md">Error loading dashboard data: {error.message}</div>;

  return (
    <ProtectedRoute>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Welcome back, <span className="text-primary">{user?.username || 'User'}</span>!
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground px-2 py-1 bg-muted rounded-md border border-border">
            Role: <span className="font-semibold text-foreground">{user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}</span>
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(user?.role === 'student' || user?.role === 'faculty') && (
            <DashboardCard title="Next Up" icon={CalendarClock} footerLink="/schedules" footerText="View Full Schedule" className="bg-card">
              {data?.nextClass ? (
                <div className="space-y-1.5">
                  <p className="font-semibold text-lg text-primary">{data.nextClass.className}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(data.nextClass.startTime), "eeee, MMM d, h:mm a")} - {format(new Date(data.nextClass.endTime), "h:mm a")}
                  </p>
                  <p className="text-sm text-muted-foreground">Room: {data.nextClass.roomNumber || 'N/A'}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No upcoming classes found in your schedule.</p>
              )}
            </DashboardCard>
          )}

          <DashboardCard 
            title="Announcements" 
            icon={Bell} 
            footerLink="/messages?filter=broadcast" 
            footerText="View All Announcements" 
            className={cn("bg-card", (user?.role === 'admin' && !(user?.role === 'student' || user?.role === 'faculty')) ? 'lg:col-span-2' : '')}
            contentClassName="max-h-72 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          >
            {data?.recentAnnouncements && data.recentAnnouncements.length > 0 ? (
              <ul className="space-y-3">
                {data.recentAnnouncements.map((announcement) => (
                  <li key={announcement.id} className="border-l-4 border-primary pl-3 py-1.5 bg-muted/50 rounded-r-md transition-transform hover:scale-[1.01]">
                    <h4 className="font-medium text-foreground text-sm">{announcement.subject}</h4>
                    <p className="text-xs text-muted-foreground truncate-2-lines">{announcement.content}</p> {/* Allows 2 lines */}
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      {formatDistanceToNow(new Date(announcement.timestamp), { addSuffix: true })}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No recent announcements.</p>
            )}
          </DashboardCard>

          {user?.role === 'admin' && (
            <DashboardCard title="Admin Actions" icon={Users} className="bg-card">
              <div className="space-y-2.5">
                <Button variant="outline" className="w-full justify-start text-sm" asChild>
                  <Link href="/admin/users"><Users className="mr-2 h-4 w-4 text-primary" /> Manage Users</Link>
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm" asChild>
                  <Link href="/admin/schedules"><BookOpen className="mr-2 h-4 w-4 text-primary" /> Manage Schedules</Link>
                </Button>
                 <Button variant="outline" className="w-full justify-start text-sm" asChild>
                  <Link href="/messages?action=compose&type=broadcast"><Bell className="mr-2 h-4 w-4 text-primary" /> Send Broadcast</Link>
                </Button>
              </div>
            </DashboardCard>
          )}
          
           <DashboardCard title="My Profile" icon={User} footerLink="/profile" footerText="View & Edit Profile" className="bg-card">
            <p className="text-sm text-muted-foreground">
                Keep your personal information up to date for a seamless experience.
            </p>
            <div className="mt-3 space-y-1">
                <p className="text-sm"><span className="font-medium text-foreground">Email:</span> <span className="text-muted-foreground">{user?.email}</span></p>
                <p className="text-sm"><span className="font-medium text-foreground">Role:</span> <span className="text-muted-foreground capitalize">{user?.role}</span></p>
            </div>
          </DashboardCard>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// Add this to your globals.css or a utility CSS file if you don't have it
// .truncate-2-lines {
//   display: -webkit-box;
//   -webkit-line-clamp: 2;
//   -webkit-box-orient: vertical;
//   overflow: hidden;
//   text-overflow: ellipsis;
// }
// .scrollbar-thin {
//   scrollbar-width: thin;
//   scrollbar-color: hsl(var(--border)) hsl(var(--background)); /* thumb track */
// }
// .scrollbar-thin::-webkit-scrollbar {
//   width: 6px;
//   height: 6px;
// }
// .scrollbar-thin::-webkit-scrollbar-track {
//   background: transparent;
// }
// .scrollbar-thin::-webkit-scrollbar-thumb {
//   background-color: hsl(var(--border));
//   border-radius: 3px;
//   border: 1px solid hsl(var(--background));
// }
