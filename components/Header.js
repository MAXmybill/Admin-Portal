"use client";

import { useState } from "react";
import { Menu, Search, Bell, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Header({ setIsOpen, title = "Dashboard Overview" }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">{title}</h2>
          <p className="text-xs text-slate-500 font-medium">Real-time POS Platform Central Control</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Quick Search */}
        <div className="hidden md:flex items-center relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Search stores, users, tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 w-64 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4455DF] focus:border-transparent transition-all"
          />
        </div>

        {/* Status Indicator */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Sync Active</span>
        </div>

        {/* Live Admin Badge */}
        <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-800">{user?.email?.split("@")[0] || "Super Admin"}</div>
            <div className="text-[10px] font-semibold text-[#F07C23] flex items-center justify-end">
              <Sparkles className="w-3 h-3 mr-0.5" /> Company Control
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4455DF] to-[#F07C23] text-white flex items-center justify-center font-black text-sm shadow-md">
            SA
          </div>
        </div>
      </div>
    </header>
  );
}
