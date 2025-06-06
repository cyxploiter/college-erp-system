
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, UserCircle, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePathname } from 'next/navigation';
import React from 'react';

const CollegeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3.5a1 1 0 00.002 1.792l7 3.5a1 1 0 00.786 0l7-3.5a1 1 0 00.002-1.792l-7-3.5zM3 9V17a1 1 0 001 1h12a1 1 0 001-1V9l-7 3.5L3 9z"></path>
  </svg>
);

interface HeaderProps {
  onMobileMenuToggle: () => void;
  isMobileMenuOpen: boolean; 
}

export function Header({ onMobileMenuToggle, isMobileMenuOpen }: HeaderProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const pathname = usePathname();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    let initials = parts[0]?.[0] || '';
    if (parts.length > 1) {
      initials += parts[parts.length - 1]?.[0] || '';
    } else if (name.length > 1 && parts[0].length > 1) { // Changed from name.length > 1
      initials = name.substring(0, 2);
    } else if (initials === '') { 
        initials = name.substring(0,1) || 'U';
    }
    return initials.toUpperCase();
  };


  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 shadow-header">
      <div className="container flex h-16 items-center px-4 sm:px-6">
        {isAuthenticated() && user && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuToggle}
            className="md:hidden mr-2 shrink-0"
            aria-label="Toggle sidebar"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        )}
        
        <Link href={isAuthenticated() ? "/dashboard" : "/login"} className="mr-4 md:mr-6 flex items-center space-x-2 shrink-0">
          <CollegeIcon className="h-7 w-7 text-primary" />
          <span className="font-bold text-lg sm:text-xl text-foreground hover:text-primary transition-colors">CollegeERP</span>
        </Link>
        
        <div className="flex-1" /> 

        <div className="flex items-center space-x-2 sm:space-x-3">
          {isAuthenticated() && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-full w-full border border-transparent group-hover:border-primary transition-colors">
                    <AvatarImage 
                      src={user.profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=3B82F6&color=FFFFFF&bold=true&size=40`} 
                      alt={user.name} />
                    <AvatarFallback className="text-xs font-semibold bg-muted text-muted-foreground">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">{user.name}</p> {/* Changed from user.username */}
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/90 focus:text-destructive-foreground">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            pathname !== '/login' && (
              <Button asChild variant="default" size="sm">
                <Link href="/login">Login</Link>
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
