
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, UserCircle, LayoutDashboard, CalendarDays, MessageSquare, Users, BookOpen } from 'lucide-react';
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
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['student', 'faculty', 'admin'] },
  { href: '/schedules', label: 'My Schedule', icon: CalendarDays, roles: ['student', 'faculty'] },
  { href: '/messages', label: 'Messages', icon: MessageSquare, roles: ['student', 'faculty', 'admin'] },
  // Admin specific links
  { href: '/admin/users', label: 'Manage Users', icon: Users, roles: ['admin'] },
  { href: '/admin/schedules', label: 'Manage Schedules', icon: BookOpen, roles: ['admin'] },
];

export function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const pathname = usePathname();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href={isAuthenticated() ? "/dashboard" : "/login"} className="mr-6 flex items-center space-x-2">
          {/* <CollegeIcon className="h-6 w-6 text-primary" /> */}
          <span className="font-bold text-lg text-foreground hover:text-primary transition-colors">CollegeERP</span>
        </Link>
        
        {isAuthenticated() && user && (
          <nav className="flex items-center space-x-1 lg:space-x-2 flex-1">
            {navItems.filter(item => item.roles.includes(user.role)).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === item.href
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="inline-block h-4 w-4 mr-1.5 relative -top-px" />
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex flex-1 items-center justify-end space-x-4">
          {isAuthenticated() && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://avatars.githubusercontent.com/${user.username}?size=32`} alt={user.username} />
                    <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">{user.username}</p>
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
                <DropdownMenuItem onClick={logout}>
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

// Placeholder for CollegeIcon if you have one
// const CollegeIcon = (props: React.SVGProps<SVGSVGElement>) => (
//   <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
//     <path d="M12 2L1 9l11 7 11-7L12 2zm0 10.84L3.16 9 12 4.16 20.84 9 12 12.84zM5 11.18V17h14v-5.82l-7 4.45-7-4.45z"/>
//   </svg>
// );
