"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { Store, Users, LifeBuoy, TrendingUp, Sparkles, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/firebase";
import StatCard from "@/components/StatCard";
import { StoreGrowthChart, PlanDistributionChart } from "@/components/Charts";
import StoreDetailModal from "@/components/StoreDetailModal";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);

  useEffect(() => {
    // Stream Stores
    const unsubStores = onSnapshot(collection(db, "store"), (snapshot) => {
      const storeList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setStores(storeList);
      setLoading(false);
    });

    // Stream Users
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    // Stream Support Tickets
    const unsubTickets = onSnapshot(collection(db, "support_requests"), (snapshot) => {
      setTickets(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubStores();
      unsubUsers();
      unsubTickets();
    };
  }, []);

  const activeStores = stores.filter((s) => s.isActive !== false).length;
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;

  // Real stats calculation
  const newStoresThisMonth = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return stores.filter((s) => {
      let d;
      if (s.createdAt?.toDate) d = s.createdAt.toDate();
      else if (s.createdAt?.seconds) d = new Date(s.createdAt.seconds * 1000);
      else if (s.createdAt) d = new Date(s.createdAt);
      return d && d >= thirtyDaysAgo;
    }).length;
  }, [stores]);

  const activeStoresPercent = stores.length > 0 ? Math.round((activeStores / stores.length) * 100) : 0;
  const ownerCount = users.filter((u) => u.role === "owner" || !u.role).length;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#1E255E] via-[#4455DF] to-[#F07C23] rounded-3xl p-6 lg:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-extrabold backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>POS Central Command Hub</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight">System Overview & Registered Stores Control</h1>
          <p className="text-xs lg:text-sm text-indigo-100 max-w-xl">
            Real-time live synchronization with mobile Flutter POS clients across all store locations.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Link
            href="/stores"
            className="px-5 py-2.5 rounded-2xl bg-white text-[#4455DF] font-black text-xs shadow-lg hover:bg-slate-100 transition-all flex items-center space-x-2"
          >
            <Store className="w-4 h-4" />
            <span>Manage All Stores</span>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards (100% Real Dynamic Calculations) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Registered Stores"
          value={stores.length.toString()}
          icon={Store}
          change={newStoresThisMonth > 0 ? `+${newStoresThisMonth} new` : "Live database"}
          changeType="increase"
          subtext="registered in last 30 days"
          color="indigo"
        />
        <StatCard
          title="Active Store Subscriptions"
          value={activeStores.toString()}
          icon={TrendingUp}
          change={`${activeStoresPercent}%`}
          changeType="increase"
          subtext="of total stores operational"
          color="orange"
        />
        <StatCard
          title="Total Platform Users"
          value={users.length.toString()}
          icon={Users}
          change={`${ownerCount} owners`}
          changeType="neutral"
          subtext="across all store accounts"
          color="emerald"
        />
        <StatCard
          title="Open Support Tickets"
          value={openTickets.toString()}
          icon={LifeBuoy}
          change={openTickets > 0 ? `${openTickets} pending` : "All clear"}
          changeType={openTickets > 0 ? "decrease" : "increase"}
          subtext={openTickets > 0 ? "requiring admin reply" : "no open issues"}
          color="rose"
        />
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Store Growth & Onboarding Trend</h3>
              <p className="text-xs text-slate-500">Monthly new store registrations from Firestore</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-[#4455DF] font-extrabold text-xs">
              Live Firestore Data
            </span>
          </div>
          <StoreGrowthChart stores={stores} />
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Subscription Tier Share</h3>
              <p className="text-xs text-slate-500">Active pricing plans breakdown</p>
            </div>
          </div>
          <PlanDistributionChart stores={stores} />
        </div>
      </div>

      {/* Recent Stores Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Recently Registered Stores</h3>
            <p className="text-xs text-slate-500">Inspect store catalog, sales, staff, and subscription status</p>
          </div>
          <Link
            href="/stores"
            className="text-xs font-extrabold text-[#4455DF] hover:underline flex items-center space-x-1"
          >
            <span>View All Stores ({stores.length})</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-[#4455DF] border-t-transparent rounded-full"></div>
            <p className="text-xs text-slate-500 font-semibold mt-3">Streaming store records from Firestore...</p>
          </div>
        ) : stores.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Store className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">No stores registered in Firestore database yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-extrabold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-4">Store Name</th>
                  <th className="p-4">Owner Name</th>
                  <th className="p-4">Phone / Contact</th>
                  <th className="p-4">Plan Tier</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Registered Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stores.slice(0, 5).map((store) => (
                  <tr key={store.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-[#4455DF] flex items-center justify-center font-bold text-sm">
                          {store.businessName ? store.businessName[0].toUpperCase() : "S"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{store.businessName || "Unnamed Store"}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {store.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700 font-semibold">{store.ownerName || "N/A"}</td>
                    <td className="p-4 text-slate-600">{store.phone || store.mobile || "N/A"}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-[#4455DF] border border-indigo-100">
                        {store.plan || "Free"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          store.isActive !== false
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            store.isActive !== false ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        ></span>
                        {store.isActive !== false ? "Active" : "Blocked"}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500">{formatDate(store.createdAt)}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedStore(store)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#4455DF] hover:text-white text-[#4455DF] font-bold text-xs transition-colors"
                      >
                        Inspect Store
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Store Detail Inspector Modal */}
      {selectedStore && (
        <StoreDetailModal store={selectedStore} onClose={() => setSelectedStore(null)} />
      )}
    </div>
  );
}
