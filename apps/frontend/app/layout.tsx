
import type { Metadata } from "next";
import { Inter } from "@next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AppProviders } from "@/providers/AppProviders";
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Assuming Shadcn button is added
import { LogOut, Settings, UserCircle } from "lucide-react"; // Icons
import { Header } from "@/components/layout/Header"; // Create Header component

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "College ERP System",
  description: "Modern ERP for educational institutions - GitHub Theme",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        <AppProviders>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-6">
              {children}
            </main>
            <footer className="bg-muted text-muted-foreground text-center py-4 border-t border-border text-xs">
              © {new Date().getFullYear()} College ERP System. All rights reserved.
            </footer>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
