
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { NotificationDisplay } from "../NotificationDisplay";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // This state now refers to the "pinned" collapsed state for desktop
  // Default to true to have the sidebar collapsed by default on desktop
  const [isDesktopSidebarPinnedCollapsed, setIsDesktopSidebarPinnedCollapsed] = useState(true);

  const showAppLayout = isAuthenticated() && pathname !== '/login';

  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto'; 
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    if (isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  if (!showAppLayout) {
    return <>{children}</>;
  }
  
  return (
    <div className="flex min-h-screen bg-muted/40 dark:bg-zinc-900">
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        isDesktopSidebarPinnedCollapsed={isDesktopSidebarPinnedCollapsed}
        onDesktopTogglePinnedState={() => setIsDesktopSidebarPinnedCollapsed(prev => !prev)}
      />
      <div className={cn(
        "flex flex-col flex-grow min-w-0", 
        "transition-spacing duration-200 ease-in-out", // Matched duration with sidebar
        // Padding left is based on the PINNED state of the desktop sidebar
        isDesktopSidebarPinnedCollapsed ? "md:pl-20" : "md:pl-64"
      )}>
        <Header
          onMobileMenuToggle={() => setIsMobileSidebarOpen(prev => !prev)}
          isMobileMenuOpen={isMobileSidebarOpen}
        />
        <main className="flex flex-col flex-grow p-4 sm:p-6 lg:p-8 overflow-x-hidden"> {/* Added flex flex-col */}
           <div className="container mx-auto max-w-full sm:max-w-7xl flex flex-col flex-grow"> {/* Added flex flex-col flex-grow */}
            {children}
           </div>
        </main>
        <NotificationDisplay />
        <footer className="bg-background border-t border-border text-muted-foreground text-center py-3 text-xs print:hidden">
          © {new Date().getFullYear()} College ERP System. All rights reserved.
        </footer>
      </div>
    </div>
  );
}