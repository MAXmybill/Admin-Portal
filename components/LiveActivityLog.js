"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  collectionGroup, 
  onSnapshot, 
  query, 
  limit, 
  orderBy 
} from "firebase/firestore";
import { 
  Activity, 
  Receipt, 
  Store, 
  Users, 
  LifeBuoy, 
  TrendingUp, 
  ArrowUpRight, 
  Clock, 
  Eye, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  CreditCard,
  Sparkles
} from "lucide-react";
import { db } from "@/lib/firebase";
import { formatCurrency, formatDate, parseDate } from "@/lib/utils";

function getRelativeTime(timestamp) {
  if (!timestamp) return "Recently";
  const date = parseDate(timestamp);
  if (!date) return "Recently";

  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return "Just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 172800) return "Yesterday";
  return formatDate(date);
}

function parseSaleDate(t) {
  if (!t) return new Date();
  if (t.toDate && typeof t.toDate === "function") return t.toDate();
  if (t.seconds) return new Date(t.seconds * 1000);
  const parsed = new Date(t);
  if (!isNaN(parsed.getTime())) return parsed;
  return new Date();
}

export default function LiveActivityLog({ stores = [], onInspectStore }) {
  const [salesEvents, setSalesEvents] = useState([]);
  const [userEvents, setUserEvents] = useState([]);
  const [ticketEvents, setTicketEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create store lookup map for instantaneous businessName & plan resolution
  const storeMap = useMemo(() => {
    const map = new Map();
    stores.forEach((s) => {
      map.set(s.id?.toString(), s);
    });
    return map;
  }, [stores]);

  useEffect(() => {
    // 1. Live stream sales across stores (zero cache, direct subcollection listeners)
    const storeSalesMap = new Map();
    const unsubSalesList = [];

    if (stores && stores.length > 0) {
      stores.forEach((s) => {
        try {
          const unsub = onSnapshot(
            collection(db, "store", s.id.toString(), "sales"),
            (snap) => {
              const list = snap.docs.map((d) => {
                const data = d.data();
                const rawTime = data.timestamp || data.date || data.createdAt;
                const parsedTime = parseSaleDate(rawTime);
                const amount = Number(data.total ?? data.grandTotal ?? data.subtotal ?? data.totalAmount ?? 0);

                return {
                  id: `sale_${d.id}`,
                  type: "sale",
                  storeId: s.id.toString(),
                  storeName: data.businessName || s.businessName || `Store #${s.id}`,
                  title: `Invoice #${data.invoiceNumber || data.billNumber || d.id.slice(0, 6)} Generated`,
                  description: `${formatCurrency(amount)} • ${data.paymentMode || (data.onlineReceived_split ? "UPI/Online" : "Cash")} • Customer: ${data.customerName || "Walk-in Customer"}`,
                  amount: amount,
                  badge: "Sale Billed",
                  timestamp: parsedTime,
                  rawTime: rawTime,
                };
              });

              storeSalesMap.set(s.id.toString(), list);

              // Flatten and sort chronologically newest first
              const allSales = Array.from(storeSalesMap.values())
                .flat()
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

              setSalesEvents(allSales.slice(0, 60));
              setLoading(false);
            },
            (err) => {
              console.error(`Sales stream error for store ${s.id}:`, err);
            }
          );
          unsubSalesList.push(unsub);
        } catch (_) {}
      });
    } else {
      setLoading(false);
    }

    // 2. Live stream users / staff activity
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const events = snapshot.docs.map((d) => {
        const data = d.data();
        const rawTime = data.lastLogin || data.verifiedAt || data.createdAt || data.updatedAt || data.activeSessionUpdatedAt;
        const parsedTime = parseDate(rawTime) || new Date();
        const storeId = data.storeId?.toString() || "";

        const isSuperAdmin = 
          data.activeDeviceLabel === "maxmybillapp@gmail.com" || 
          data.email === "maxmybillapp@gmail.com" || 
          d.id === "uAPlgmuO2IaeSN4AvFGFLYvRuP53";

        const displayName = isSuperAdmin
          ? "Platform Super Admin"
          : (data.name || data.displayName || data.activeDeviceLabel || data.email || "Staff Member");

        const role = isSuperAdmin ? "Super Admin" : (data.role || "Staff");

        return {
          id: `user_${d.id}`,
          type: "staff",
          storeId: storeId,
          storeName: isSuperAdmin 
            ? "MAXmybill Central Control" 
            : (storeMap.get(storeId)?.businessName || (storeId ? `Store #${storeId}` : "Platform Account")),
          title: isSuperAdmin 
            ? `Super Admin (maxmybillapp@gmail.com) Active` 
            : `${displayName} (${role}) Active`,
          description: isSuperAdmin
            ? `Active device session • maxmybillapp@gmail.com • Central Admin Control`
            : `Access verified • ${data.email || data.phone || data.activeDeviceLabel || "No contact"} • Store ID: ${storeId || "N/A"}`,
          badge: isSuperAdmin ? "Super Admin" : (data.role === "owner" ? "Store Owner" : "Staff Access"),
          timestamp: parsedTime,
          rawTime: rawTime,
        };
      });
      setUserEvents(events);
    });

    // 3. Live stream support tickets
    const unsubTickets = onSnapshot(collection(db, "support_requests"), (snapshot) => {
      const events = snapshot.docs.map((d) => {
        const data = d.data();
        const rawTime = data.createdAt || data.updatedAt;
        const parsedTime = parseDate(rawTime) || new Date();
        const storeId = data.storeId?.toString() || "";

        return {
          id: `ticket_${d.id}`,
          type: "ticket",
          storeId: storeId,
          storeName: storeMap.get(storeId)?.businessName || (storeId ? `Store #${storeId}` : "Platform Client"),
          title: `Support: ${data.subject || "Customer Inquiry"}`,
          description: `Status: ${data.status || "open"} • Priority: ${data.priority || "normal"} • Store #${storeId}`,
          badge: data.status === "resolved" ? "Ticket Resolved" : "Support Ticket",
          timestamp: parsedTime,
          rawTime: rawTime,
        };
      });
      setTicketEvents(events);
    });

    return () => {
      unsubSalesList.forEach((unsub) => unsub());
      unsubUsers();
      unsubTickets();
    };
  }, [stores, storeMap]);

  // 4. Store Registration and Plan events from stores prop
  const storeLifecycleEvents = useMemo(() => {
    return stores.map((s) => {
      const rawTime = s.createdAt || s.updatedAt || s.planUpdatedAt;
      const parsedTime = parseDate(rawTime) || new Date();

      return {
        id: `store_${s.id}`,
        type: "store",
        storeId: s.id?.toString(),
        storeName: s.businessName || `Store #${s.id}`,
        title: `Store Onboarded: ${s.businessName || "New Store"}`,
        description: `Plan: ${s.plan || "Free"} • Owner: ${s.ownerName || "N/A"} • ID: ${s.id}`,
        badge: `${s.plan || "Active"} Store`,
        timestamp: parsedTime,
        rawTime: rawTime,
      };
    });
  }, [stores]);

  // Combine and sort all events chronologically (newest first)
  const combinedEvents = useMemo(() => {
    const all = [...salesEvents, ...storeLifecycleEvents, ...userEvents, ...ticketEvents];
    return all.sort((a, b) => {
      const tA = a.timestamp?.getTime ? a.timestamp.getTime() : 0;
      const tB = b.timestamp?.getTime ? b.timestamp.getTime() : 0;
      return tB - tA;
    });
  }, [salesEvents, storeLifecycleEvents, userEvents, ticketEvents]);

  // Filtered and Searched events
  const filteredEvents = useMemo(() => {
    return combinedEvents.filter((ev) => {
      // Type Filter
      if (activeFilter === "sales" && ev.type !== "sale") return false;
      if (activeFilter === "stores" && ev.type !== "store") return false;
      if (activeFilter === "staff" && ev.type !== "staff") return false;
      if (activeFilter === "tickets" && ev.type !== "ticket") return false;

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (ev.title || "").toLowerCase().includes(q);
        const matchDesc = (ev.description || "").toLowerCase().includes(q);
        const matchStore = (ev.storeName || "").toLowerCase().includes(q);
        const matchId = (ev.storeId || "").toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchStore && !matchId) return false;
      }

      return true;
    });
  }, [combinedEvents, activeFilter, searchQuery]);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
      {/* Header with Live Sync Indicator & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4455DF]">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-slate-800">Live Store Activity Stream</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span>
                  Real-Time Live Feed
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Real-time log of customer transactions, store registrations, staff logins, and ticket updates</p>
            </div>
          </div>
        </div>

        {/* Search bar inside feed */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search live activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4455DF]"
          />
        </div>
      </div>

      {/* Filter Category Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            activeFilter === "all"
              ? "bg-[#4455DF] text-white shadow-sm"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          All Activity ({combinedEvents.length})
        </button>
        <button
          onClick={() => setActiveFilter("sales")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 ${
            activeFilter === "sales"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Receipt className="w-3 h-3" />
          <span>Sales & Bills ({salesEvents.length})</span>
        </button>
        <button
          onClick={() => setActiveFilter("stores")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 ${
            activeFilter === "stores"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Store className="w-3 h-3" />
          <span>Store Onboarding ({storeLifecycleEvents.length})</span>
        </button>
        <button
          onClick={() => setActiveFilter("staff")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 ${
            activeFilter === "staff"
              ? "bg-violet-600 text-white shadow-sm"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users className="w-3 h-3" />
          <span>Staff & Access ({userEvents.length})</span>
        </button>
        <button
          onClick={() => setActiveFilter("tickets")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 ${
            activeFilter === "tickets"
              ? "bg-rose-600 text-white shadow-sm"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <LifeBuoy className="w-3 h-3" />
          <span>Support Tickets ({ticketEvents.length})</span>
        </button>
      </div>

      {/* Activity Items List */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block animate-spin w-7 h-7 border-3 border-[#4455DF] border-t-transparent rounded-full"></div>
          <p className="text-xs text-slate-500 font-semibold mt-2.5">Streaming live activity directly from Firestore...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-600">No activity events found matching your filter.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto pr-1">
          {filteredEvents.slice(0, 25).map((ev) => {
            const targetStore = storeMap.get(ev.storeId);

            return (
              <div
                key={ev.id}
                className="py-3.5 px-3 flex items-start justify-between gap-4 hover:bg-slate-50/80 rounded-2xl transition-colors group"
              >
                <div className="flex items-start space-x-3 min-w-0">
                  {/* Type Icon Avatar */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      ev.type === "sale"
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : ev.type === "store"
                        ? "bg-indigo-50 text-[#4455DF] border border-indigo-100"
                        : ev.type === "staff"
                        ? "bg-violet-50 text-violet-600 border border-violet-100"
                        : "bg-rose-50 text-rose-600 border border-rose-100"
                    }`}
                  >
                    {ev.type === "sale" && <Receipt className="w-4 h-4" />}
                    {ev.type === "store" && <Store className="w-4 h-4" />}
                    {ev.type === "staff" && <Users className="w-4 h-4" />}
                    {ev.type === "ticket" && <LifeBuoy className="w-4 h-4" />}
                  </div>

                  {/* Text Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-extrabold text-xs text-slate-900">{ev.title}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          ev.type === "sale"
                            ? "bg-emerald-100 text-emerald-800"
                            : ev.type === "store"
                            ? "bg-indigo-100 text-indigo-800"
                            : ev.type === "staff"
                            ? "bg-violet-100 text-violet-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {ev.badge}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium mt-0.5 truncate">{ev.description}</p>

                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {ev.storeName}
                      </span>
                      {ev.storeId && (
                        <span className="text-[10px] text-slate-400 font-mono">ID: {ev.storeId}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Time & Inspect Action */}
                <div className="flex flex-col items-end flex-shrink-0 space-y-1">
                  <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-medium whitespace-nowrap">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{getRelativeTime(ev.timestamp)}</span>
                  </div>

                  {targetStore && onInspectStore && (
                    <button
                      onClick={() => onInspectStore(targetStore)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-lg bg-indigo-50 hover:bg-[#4455DF] hover:text-white text-[#4455DF] text-[10px] font-bold flex items-center space-x-1"
                      title="Inspect this store"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
