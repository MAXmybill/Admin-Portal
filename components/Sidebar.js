"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  LifeBuoy, 
  BookOpen, 
  CreditCard, 
  Wrench, 
  Megaphone, 
  LogOut,
  ChevronRight,
  ShieldAlert,
  X
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Stores Directory", href: "/stores", icon: Store },
  { name: "User Management", href: "/users", icon: Users },
  { name: "Support Desk", href: "/support", icon: LifeBuoy },
  { name: "Knowledge Base", href: "/knowledge", icon: BookOpen },
  { name: "System Settings", href: "/settings", icon: Wrench },
  { name: "Broadcast Notice", href: "/broadcast", icon: Megaphone },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#1E255E] text-white flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-indigo-900/60 bg-[#171D4B]">
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="MAXmybill Logo" className="h-14 object-contain" />
          <div>
            <p className="text-[10px] text-indigo-300 tracking-widest font-semibold uppercase mt-1">Company Owner Admin</p>
          </div>
        </div>
        <button className="lg:hidden text-indigo-300 hover:text-white" onClick={() => setIsOpen(false)}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-[#4455DF] text-white shadow-md shadow-indigo-600/40"
                  : "text-indigo-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-indigo-300"}`} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4 text-white/80" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-indigo-900/60 bg-[#171D4B]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.email ? user.email[0].toUpperCase() : "A"}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{user?.email || "Super Admin"}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldAlert className="w-2.5 h-2.5 mr-1" /> Owner Admin
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 rounded-lg text-indigo-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
