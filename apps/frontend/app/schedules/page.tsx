
'use client';
import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { ScheduleItem } from '@college-erp/common';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { CalendarDays, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetchMySchedules = async (): Promise<ScheduleItem[]> => {
  const response = await apiClient.get<{ data: ScheduleItem[] }>('/schedules/my');
  return response.data.data;
};

export default function SchedulesPage() {
  const { data: schedules, isLoading, error } = useQuery<ScheduleItem[], Error>({
    queryKey: ['mySchedules'],
    queryFn: fetchMySchedules,
  });

  return (
    <ProtectedRoute allowedRoles={['student', 'faculty']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground flex items-center">
                <CalendarDays className="mr-3 h-8 w-8 text-primary" />
                My Academic Schedule
            </h1>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Your Classes and Events</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-muted-foreground py-4 text-center">Loading your schedule...</p>}
            {error && (
              <div className="text-destructive bg-destructive/10 p-4 rounded-md flex items-center">
                <AlertCircle className="h-5 w-5 mr-2"/> Error loading schedules: {error.message}
              </div>
            )}
            {!isLoading && !error && schedules && schedules.length === 0 && (
              <p className="text-muted-foreground py-4 text-center">You have no scheduled classes or events at this time.</p>
            )}
            {!isLoading && !error && schedules && schedules.length > 0 && (
              <Table>
                <TableCaption className="text-xs text-muted-foreground">A list of your registered classes and academic events.</TableCaption>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[250px] text-foreground font-semibold">Class Name</TableHead>
                    <TableHead className="text-foreground font-semibold">Day</TableHead>
                    <TableHead className="text-foreground font-semibold">Time</TableHead>
                    <TableHead className="text-foreground font-semibold">Room</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((item) => (
                    <TableRow key={item.id} className="border-b border-border hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">{item.className}</TableCell>
                      <TableCell className="text-muted-foreground">{item.dayOfWeek}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(item.startTime), 'p')} - {format(new Date(item.endTime), 'p')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.roomNumber || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
