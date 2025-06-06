
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, CalendarDays, MessageSquare, Users, BookOpen,
  ChevronLeft, ChevronRight, X
} from 'lucide-react';
import React, { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: ('student' | 'faculty' | 'admin')[];
  disabled?: boolean;
}

const navItemsBase: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['student', 'faculty', 'admin'] },
  { href: '/schedules', label: 'My Schedule', icon: CalendarDays, roles: ['student', 'faculty'] },
  // My Classes link removed, functionality merged into /schedules for faculty
  { href: '/messages', label: 'Messages', icon: MessageSquare, roles: ['student', 'faculty', 'admin'] },
];

const adminNavItems: NavItem[] = [
  { href: '/admin/users', label: 'User Management', icon: Users, roles: ['admin'] },
  { href: '/admin/schedules', label: 'Schedule Mgmt', icon: BookOpen, roles: ['admin'], disabled: true },
];

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isDesktopSidebarPinnedCollapsed: boolean;
  onDesktopTogglePinnedState: () => void;
}

export function Sidebar({
  isMobileOpen,
  onMobileClose,
  isDesktopSidebarPinnedCollapsed,
  onDesktopTogglePinnedState,
}: SidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isDesktopHoverExpanded, setIsDesktopHoverExpanded] = useState(false);

  if (!user) return null;

  const visibleNavItems = navItemsBase.filter(item => item.roles.includes(user.role));
  const visibleAdminNavItems = user.role === 'admin' ? adminNavItems : [];
  const allVisibleNavItems = [...visibleNavItems, ...visibleAdminNavItems];
  
  allVisibleNavItems.sort((a,b) => {
    const order = ['/dashboard', '/schedules', '/messages', '/admin/users', '/admin/schedules'];
    return order.indexOf(a.href) - order.indexOf(b.href);
  });


  const isEffectivelyCollapsedForDesktopDisplay = isDesktopSidebarPinnedCollapsed && !isDesktopHoverExpanded;
  
  const getSidebarWidthClass = (isMobileContext: boolean) => {
    if (isMobileContext) return "w-64"; 
    if (!isDesktopSidebarPinnedCollapsed) return "w-64"; 
    return isDesktopHoverExpanded ? "w-64" : "w-20"; 
  };


  const NavLink: React.FC<{ item: NavItem; displayCollapsed: boolean; onClick?: () => void }> = ({ item, displayCollapsed, onClick }) => (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center rounded-md text-sm font-medium transition-colors duration-150 ease-in-out group",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard' && item.href.length > '/dashboard'.length)
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent",
        displayCollapsed ? "justify-center h-10 w-10" : "px-3 py-2.5 h-10",
        item.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
      )}
      aria-disabled={item.disabled}
      tabIndex={item.disabled ? -1 : undefined}
      title={displayCollapsed ? item.label : undefined}
    >
      <item.icon className={cn("h-5 w-5", displayCollapsed ? "" : "mr-3 shrink-0")} />
      {!displayCollapsed && <span className="truncate">{item.label}</span>}
      {displayCollapsed && <span className="sr-only">{item.label}</span>}
    </Link>
  );

  const sidebarContent = (isMobileContext: boolean) => {
    const currentSidebarWidthClass = getSidebarWidthClass(isMobileContext);
    const displayLinksAsCollapsed = isMobileContext ? false : isEffectivelyCollapsedForDesktopDisplay;

    return (
        <div
            className={cn(
                "flex flex-col h-full bg-card text-foreground border-r border-border shadow-md",
                currentSidebarWidthClass,
                "transition-width duration-200 ease-in-out"
            )}
            onMouseEnter={!isMobileContext && isDesktopSidebarPinnedCollapsed ? () => setIsDesktopHoverExpanded(true) : undefined}
            onMouseLeave={!isMobileContext && isDesktopSidebarPinnedCollapsed ? () => setIsDesktopHoverExpanded(false) : undefined}
        >
        {isMobileContext && (
            <div className={cn(
            "flex items-center border-b border-border h-16 shrink-0 px-4 justify-end"
            )}>
            <Button variant="ghost" size="icon" onClick={onMobileClose} className="md:hidden">
                <X className="h-6 w-6" />
            </Button>
            </div>
        )}
        {!isMobileContext && <div className="h-16 border-b border-transparent shrink-0"></div>}


        <nav className="flex-grow space-y-1.5 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {allVisibleNavItems.map((item) => (
            <NavLink 
                key={item.href} 
                item={item} 
                displayCollapsed={displayLinksAsCollapsed} 
                onClick={isMobileContext ? onMobileClose : undefined}
            />
            ))}
        </nav>

        {!isMobileContext && (
            <div className={cn(
                "mt-auto border-t border-border p-3 shrink-0 flex",
                (isDesktopSidebarPinnedCollapsed && !isDesktopHoverExpanded) ? "justify-center" : "justify-end pr-4"
              )}>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onDesktopTogglePinnedState}
                    aria-label={isDesktopSidebarPinnedCollapsed ? 'Pin sidebar open' : 'Collapse sidebar to icons'}
                >
                    {isDesktopSidebarPinnedCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                </Button>
            </div>
        )}
        </div>
    );
  };


  if (isMobileOpen) {
    return (
      <>
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          aria-hidden="true"
        />
        <aside 
          className="fixed inset-y-0 left-0 z-50 md:hidden transform transition-transform duration-300 ease-in-out"
          style={{ transform: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        >
          {sidebarContent(true)}
        </aside>
      </>
    );
  }

  return (
    <aside className={cn(
        "hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex flex-col",
      )}>
      {sidebarContent(false)}
    </aside>
  );
}
