
'use client';
import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { ArrowRight, Bell, BookOpen, CalendarClock, User, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { ScheduleItem, Message, UserRole } from '@college-erp/common';
import { format } from 'date-fns';
import { NotificationDisplay } from '@/components/NotificationDisplay'; // Assuming this exists for real-time
import { cn } from '@/lib/utils'; // Added import for cn

interface DashboardData {
  nextClass?: ScheduleItem;
  recentAnnouncements?: Message[];
  // other data points
}

const fetchDashboardData = async (): Promise<DashboardData> => {
  // This is a mock. In a real app, you'd have a dedicated backend endpoint.
  // Or fetch schedules and messages separately.
  const [schedulesResponse, messagesResponse] = await Promise.all([
    apiClient.get<{ data: ScheduleItem[] }>('/schedules/my'),
    apiClient.get<{ data: Message[] }>('/messages/my?limit=3&type=Broadcast'), // Example query params
  ]);

  const schedules = schedulesResponse.data.data;
  const now = new Date();
  const nextClass = schedules
    .filter(s => new Date(s.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  const recentAnnouncements = messagesResponse.data.data
    .filter(m => m.type === 'Broadcast')
    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0,3);

  return { nextClass, recentAnnouncements };
};


const DashboardCard: React.FC<{title: string, description?: string, icon?: React.ElementType, children: React.ReactNode, footerLink?: string, footerText?: string, className?: string }> = 
  ({ title, description, icon: Icon, children, footerLink, footerText, className }) => (
  <Card className={cn("shadow-md hover:shadow-lg transition-shadow", className)}>
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="text-xl text-foreground">{title}</CardTitle>
        {Icon && <Icon className="h-6 w-6 text-primary" />}
      </div>
      {description && <CardDescription className="text-muted-foreground">{description}</CardDescription>}
    </CardHeader>
    <CardContent>
      {children}
    </CardContent>
    {footerLink && footerText && (
      <CardFooter>
        <Button variant="link" asChild className="p-0 text-primary hover:text-primary/80">
          <Link href={footerLink}>
            {footerText} <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    )}
  </Card>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery<DashboardData, Error>({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
    enabled: !!user, // Only fetch if user is loaded
  });

  if (isLoading) return <div className="flex justify-center items-center p-8"><p className="text-muted-foreground">Loading dashboard...</p></div>;
  if (error) return <div className="text-destructive p-4">Error loading dashboard data: {error.message}</div>;

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user?.username || 'User'}!
          </h1>
          <p className="text-sm text-muted-foreground">
            Role: <span className="font-medium text-primary">{user?.role}</span>
          </p>
        </div>
        
        {/* NotificationDisplay can be integrated here or in Layout for global notifications */}
        {/* <NotificationDisplay /> */}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Next Class Card */}
          {(user?.role === 'student' || user?.role === 'faculty') && (
            <DashboardCard title="Next Up" icon={CalendarClock} footerLink="/schedules" footerText="View Full Schedule">
              {data?.nextClass ? (
                <div className="space-y-1">
                  <p className="font-semibold text-lg text-primary">{data.nextClass.className}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(data.nextClass.startTime), "eeee, MMM d, p")} - {format(new Date(data.nextClass.endTime), "p")}
                  </p>
                  <p className="text-sm text-muted-foreground">Room: {data.nextClass.roomNumber || 'N/A'}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No upcoming classes found in your schedule.</p>
              )}
            </DashboardCard>
          )}

          {/* Announcements Card */}
          <DashboardCard title="Announcements" icon={Bell} footerLink="/messages?filter=broadcast" footerText="View All Announcements" className={user?.role === 'admin' ? 'lg:col-span-2' : ''}>
            {data?.recentAnnouncements && data.recentAnnouncements.length > 0 ? (
              <ul className="space-y-3">
                {data.recentAnnouncements.map((announcement) => (
                  <li key={announcement.id} className="border-l-4 border-primary pl-3 py-1 bg-muted/50 rounded-r-sm">
                    <h4 className="font-medium text-foreground text-sm">{announcement.subject}</h4>
                    <p className="text-xs text-muted-foreground truncate">{announcement.content}</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{format(new Date(announcement.timestamp), "MMM d, yyyy - p")}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No recent announcements.</p>
            )}
          </DashboardCard>

          {/* Quick Actions for Admin */}
          {user?.role === 'admin' && (
            <DashboardCard title="Admin Actions" icon={Users}>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/users"><Users className="mr-2 h-4 w-4" /> Manage Users</Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/schedules"><BookOpen className="mr-2 h-4 w-4" /> Manage Schedules</Link>
                </Button>
                 <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/messages?action=compose&type=broadcast"><Bell className="mr-2 h-4 w-4" /> Send Broadcast</Link>
                </Button>
              </div>
            </DashboardCard>
          )}
          
          {/* Profile Card (Generic) */}
           <DashboardCard title="My Profile" icon={User} footerLink="/profile" footerText="View/Edit Profile">
            <p className="text-sm text-muted-foreground">
                Keep your personal information up to date.
            </p>
            <div className="mt-2">
                <p className="text-sm"><span className="font-medium text-foreground">Email:</span> {user?.email}</p>
                <p className="text-sm"><span className="font-medium text-foreground">Role:</span> {user?.role}</p>
            </div>
          </DashboardCard>

        </div>
      </div>
    </ProtectedRoute>
  );
}
