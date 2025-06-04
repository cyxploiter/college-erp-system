
'use client';
import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { BookOpen, CalendarPlus } from 'lucide-react';

export default function AdminSchedulesPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground flex items-center">
                <BookOpen className="mr-3 h-8 w-8 text-primary" />
                Schedule Management
            </h1>
            <Button disabled>
                <CalendarPlus className="mr-2 h-4 w-4" /> Create New Schedule/Event (Soon)
            </Button>
        </div>
        
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Manage Academic Schedules</CardTitle>
            <CardDescription>Create, update, and assign class schedules and academic events.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This section will allow administrators to manage the master schedule for the institution. 
              Features will include:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1 pl-4">
              <li>Viewing all schedules by department, faculty, or course.</li>
              <li>Adding new classes, labs, or other academic events.</li>
              <li>Modifying existing schedule entries (time, room, instructor).</li>
              <li>Assigning schedules to students or student groups.</li>
              <li>Checking for scheduling conflicts.</li>
            </ul>
            <p className="mt-4 text-sm text-primary font-semibold">
              Development in progress. Please check back later for full functionality.
            </p>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
