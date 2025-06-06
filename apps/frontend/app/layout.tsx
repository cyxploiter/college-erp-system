
import type { Metadata } from "next"; // Keep for static metadata
import { Inter } from "@next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AppProviders } from "@/providers/AppProviders";
import { AppShell } from "@/components/layout/AppShell"; // Import the new AppShell

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Static metadata for the site
export const metadata: Metadata = {
  title: "College ERP System",
  description: "Modern ERP for educational institutions.",
  icons: {
    icon: '/favicon.ico', // Example, ensure favicon exists in /public
  },
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
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
