
'use client';
import React, { useEffect, useRef } from 'react';
import { useToast } from "@/components/hooks/use-toast";
import { connectSocket, getSocket } from '@/lib/websocket';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeMessagePayload } from '@college-erp/common';
import { Bell, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export function NotificationDisplay() {
  const { toast } = useToast();
  const { token, isAuthenticated, user } = useAuth();
  const isSocketInitialized = useRef(false); // To prevent multiple initializations in StrictMode

  useEffect(() => {
    if (isAuthenticated() && token && !isSocketInitialized.current) {
      console.log("NotificationDisplay: User authenticated, attempting to connect socket.");
      
      const handleMessageReceived = (message: RealtimeMessagePayload) => {
        console.log("NotificationDisplay: Handling received message:", message);
        let variant: "default" | "destructive" = "default";
        let icon: React.ReactNode = <Info className="h-5 w-5" />;
        let title = message.title || "Notification";
        let className = "bg-background text-foreground border-border";

        // Customize appearance based on message type/priority
        switch (message.type) {
          case 'SystemSuccess':
          case 'Broadcast': // Assuming general broadcasts are info/success
            if (message.priority === 'Critical' || message.priority === 'Urgent') {
                title = message.subject || "Important Announcement";
                icon = <Bell className="h-5 w-5 text-primary" />;
                className = "bg-primary/10 text-primary border-primary/30"
            } else {
                title = message.subject || "Announcement";
                icon = <Info className="h-5 w-5 text-primary" />;
                 className = "bg-primary/10 text-primary border-primary/30"
            }
            break;
          case 'Direct':
            title = `Message from ${message.sender || 'System'}`;
            icon = <Bell className="h-5 w-5 text-primary" />;
            className = "bg-primary/10 text-primary border-primary/30"
            break;
          case 'SystemError':
            variant = "destructive"; // Shadcn's destructive variant
            icon = <AlertTriangle className="h-5 w-5 text-destructive-foreground" />;
            title = message.title || "Error";
             // Destructive variant has its own styling by Shadcn
            className = ""; // Reset custom class if using Shadcn destructive variant
            break;
          case 'SystemInfo':
             icon = <Info className="h-5 w-5 text-primary" />;
             className = "bg-primary/10 text-primary border-primary/30"
            break;
          default:
            icon = <Info className="h-5 w-5 text-foreground" />;
        }
        
        if (message.priority === 'Critical' && message.type !== 'SystemError') {
            variant = "destructive"; // Use destructive for critical non-error messages too for high visibility
            className = ""; // Reset custom class if using Shadcn destructive variant
            icon = <AlertTriangle className="h-5 w-5 text-destructive-foreground" />;
        }


        toast({
          variant: variant,
          title: (
            <div className="flex items-center">
              {icon}
              <span className="ml-2 font-semibold">{title}</span>
            </div>
          ),
          description: <p className="text-sm ml-7">{message.content}</p>,
          duration: message.priority === 'Critical' || message.priority === 'Urgent' ? 10000 : 5000,
          className: className || undefined,
        });
      };
      
      connectSocket(token, {
        onMessageReceived: handleMessageReceived,
        onConnect: () => console.log("NotificationDisplay: Socket connected"),
        onDisconnect: (reason) => console.log("NotificationDisplay: Socket disconnected - ", reason),
        onConnectError: (err) => console.error("NotificationDisplay: Socket connection error - ", err.message),
      });
      isSocketInitialized.current = true;

      return () => {
        // Clean up on component unmount or if auth state changes drastically
        // The current getSocket().disconnect() might be too broad if other components use the same socket.
        // A more refined approach would use reference counting or context for the socket instance.
        // For now, this will disconnect when the component unmounts (e.g., logout)
        const socket = getSocket();
        if (socket) {
            console.log("NotificationDisplay: Cleaning up socket listeners.");
            socket.off('receive:message', handleMessageReceived);
            // Do not disconnect here if socket is shared globally. Disconnection should happen on logout.
        }
        isSocketInitialized.current = false; // Allow re-init if component remounts after being fully unmounted
      };
    } else if (!isAuthenticated() && isSocketInitialized.current) {
        // If user logs out, ensure socket is disconnected and listeners are cleaned.
        const socket = getSocket();
        if (socket && socket.connected) {
            console.log("NotificationDisplay: User logged out, disconnecting socket.");
            socket.disconnect();
        }
        isSocketInitialized.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, toast]); // user object might cause too many re-renders if its reference changes

  // This component doesn't render anything itself, it just hooks into the toast system.
  // It should be placed in your main layout so it's always active when a user is logged in.
  return null; 
}

// Make sure to include <NotificationDisplay /> in your main layout (e.g., app/layout.tsx)
// within the AuthProvider and QueryClientProvider context, but outside routes that don't need it.
// Ideally, within a component that only renders for authenticated users.
// For this setup, placing it in Header.tsx or a similar authenticated layout part would be good.
// Or, ensure it's only active when `isAuthenticated` is true.
// For this setup, since AppProviders wraps everything, and this component checks isAuthenticated,
// it can be placed in layout.tsx inside AppProviders.
