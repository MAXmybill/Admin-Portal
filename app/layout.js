"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import "./globals.css";

function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.push("/login");
    }
  }, [user, loading, isLoginPage, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-[#4455DF] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (isLoginPage) {
    return <main className="min-h-screen bg-[#F4F7FA]">{children}</main>;
  }

  if (!user && !isLoginPage) {
    return null; // Prevent flash of dashboard content while redirecting
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] flex text-slate-800">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header setIsOpen={setSidebarOpen} title={getRouteTitle(pathname)} />
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

function getRouteTitle(pathname) {
  switch (pathname) {
    case "/":
      return "Executive Overview Dashboard";
    case "/stores":
      return "Stores Directory & Control Center";
    case "/users":
      return "User Management & Accounts";
    case "/support":
      return "Support Desk & Customer Tickets";
    case "/knowledge":
      return "Knowledge Base & FAQs CMS";
    case "/settings":
      return "System Maintenance & Global Settings";
    case "/broadcast":
      return "Broadcast Push Notifications";
    default:
      return "Super Admin Control Center";
  }
}

import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>MAXmybill - Company Super Admin Dashboard</title>
        <meta name="description" content="POS Company Owner Central Control & Store Management Dashboard" />
        <link rel="icon" href="/logo.png" type="image/png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
