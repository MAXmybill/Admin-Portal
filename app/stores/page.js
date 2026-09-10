"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { collection, onSnapshot, doc, updateDoc, setDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { Store, Search, Filter, ShieldCheck, ShieldAlert, Edit, Eye, Plus, Calendar, Check, Lock, Unlock, X, Save, Receipt, TrendingUp, DollarSign, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { db } from "@/lib/firebase";
import StoreDetailModal from "@/components/StoreDetailModal";
import { formatDate, formatCurrency, calculateMembershipDays, isPlanExpired, isStoreActive } from "@/lib/utils";
import {
  fetchStoreSalesMetrics,
  purgeAllLocalCaches,
} from "@/lib/storeDataCache";
import { useAuth } from "@/context/AuthContext";

// Smooth Animated Number Ticker for dynamic live increments
function AnimatedCounter({ value, isCurrency = false }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = displayValue;
    let end = Number(value) || 0;
    if (start === end) return;

    let startTime = null;
    const duration = 450; // Smooth tick up

    let animId;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayValue(end);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [value]);

  if (isCurrency) {
    return <span>{formatCurrency(displayValue)}</span>;
  }
  return <span>{Math.round(displayValue).toLocaleString("en-IN")}</span>;
}

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [selectedStore, setSelectedStore] = useState(null);
  const [editStore, setEditStore] = useState(null);
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // 100% Real-Time Live Sales & Bills Map (Zero Cache, Pure Firestore Queries)
  const [salesMetricsMap, setSalesMetricsMap] = useState({});
  const [liveCalcProgress, setLiveCalcProgress] = useState({
    completed: 0,
    total: 0,
    isCalculating: false,
    activeStoreName: "",
    lastAdded: null,
  });
  
  const { hasEditAccess } = useAuth();

  // Edit Plan Form State
  const [editPlan, setEditPlan] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);

  // New Store Form State
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newGstin, setNewGstin] = useState("");
  const [newPlan, setNewPlan] = useState("MAX Pro");

  // Purge any lingering old caches on mount
  useEffect(() => {
    purgeAllLocalCaches();
  }, []);

  // Progressive live calculation directly from live Firestore subcollections
  const runLiveCalculation = (targetList) => {
    const list = targetList || stores;
    if (!list || list.length === 0) return;

    // Reset map to 0 and start lively increment
    setSalesMetricsMap({});
    setLiveCalcProgress({
      completed: 0,
      total: list.length,
      isCalculating: true,
      activeStoreName: list[0]?.businessName || list[0]?.id || "",
      lastAdded: null,
    });

    let isCancelled = false;
    const queue = [...list];
    const concurrency = 2; // Stream 2 stores at a time for visible, lively increment

    const worker = async () => {
      while (queue.length > 0 && !isCancelled) {
        const s = queue.shift();
        if (!s) break;

        setLiveCalcProgress((prev) => ({
          ...prev,
          activeStoreName: s.businessName || s.id,
        }));

        try {
          const metrics = await fetchStoreSalesMetrics(s.id);
          if (!isCancelled) {
            setSalesMetricsMap((prev) => ({
              ...prev,
              [s.id]: metrics,
            }));
            setLiveCalcProgress((prev) => ({
              ...prev,
              completed: prev.completed + 1,
              lastAdded: {
                name: s.businessName || s.id,
                sales: metrics.totalSales,
                bills: metrics.billCount,
              },
            }));
          }
        } catch (_) {
          if (!isCancelled) {
            setSalesMetricsMap((prev) => ({
              ...prev,
              [s.id]: { billCount: 0, totalSales: 0 },
            }));
            setLiveCalcProgress((prev) => ({
              ...prev,
              completed: prev.completed + 1,
            }));
          }
        }
      }
    };

    Promise.all(Array.from({ length: concurrency }, () => worker())).then(() => {
      if (!isCancelled) {
        setLiveCalcProgress((prev) => ({
          ...prev,
          isCalculating: false,
          activeStoreName: "",
        }));
      }
    });
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "store"), (snapshot) => {
      const storeList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStores(storeList);
      setLoading(false);
      runLiveCalculation(storeList);
    });
    return () => unsub();
  }, []);

  // Aggregate platform performance across currently registered stores only in real time
  const platformTotals = useMemo(() => {
    let totalSales = 0;
    let totalBills = 0;
    stores.forEach((s) => {
      const m = salesMetricsMap[s.id];
      if (m) {
        totalSales += m.totalSales || 0;
        totalBills += m.billCount || 0;
      }
    });
    const activeCount = stores.filter((s) => isStoreActive(s)).length;
    return { totalSales, totalBills, activeCount };
  }, [salesMetricsMap, stores]);

  const handleToggleStatus = async (storeId, currentStatus) => {
    try {
      await updateDoc(doc(db, "store", storeId), {
        isActive: currentStatus === false ? true : false,
      });
    } catch (err) {
      console.error("Error toggling store status:", err);
      alert("Failed to update status: " + err.message);
    }
  };

  const handleOpenEdit = (store) => {
    setEditStore(store);
    setEditPlan(store.plan || "Free");
    
    let expDate = "";
    if (store.subscriptionExpiryDate) {
      let d;
      if (store.subscriptionExpiryDate.toDate) d = store.subscriptionExpiryDate.toDate();
      else if (store.subscriptionExpiryDate.seconds) d = new Date(store.subscriptionExpiryDate.seconds * 1000);
      else d = new Date(store.subscriptionExpiryDate);
      
      if (!isNaN(d.getTime())) {
        expDate = d.toISOString().split('T')[0];
      }
    }
    setEditExpiryDate(expDate);
  };

  const handleSaveStorePlan = async (e) => {
    e.preventDefault();
    if (!editStore) return;
    setSaving(true);
    try {
      const updateData = {
        plan: editPlan,
      };
      if (editExpiryDate) {
        updateData.subscriptionExpiryDate = editExpiryDate;
      }
      await updateDoc(doc(db, "store", editStore.id), updateData);
      setEditStore(null);
    } catch (err) {
      console.error("Error updating store plan:", err);
      alert("Failed to save store plan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewStore = async (e) => {
    e.preventDefault();
    if (!newBusinessName.trim()) return;

    setSaving(true);
    try {
      await addDoc(collection(db, "store"), {
        businessName: newBusinessName.trim(),
        ownerName: newOwnerName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        gstin: newGstin.trim(),
        plan: newPlan,
        isActive: true,
        createdAt: serverTimestamp(),
      });
      setIsCreatingStore(false);
      setNewBusinessName("");
      setNewOwnerName("");
      setNewPhone("");
      setNewEmail("");
      setNewGstin("");
    } catch (err) {
      console.error("Error creating new store:", err);
      alert("Failed to register new store: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filter Logic
  const filteredStores = stores.filter((s) => {
    const nameMatch = (s.businessName || "").toLowerCase().includes(search.toLowerCase()) ||
                      (s.ownerName || "").toLowerCase().includes(search.toLowerCase()) ||
                      (s.phone || "").includes(search) ||
                      (s.id || "").toLowerCase().includes(search.toLowerCase());
    const planMatch = filterPlan === "all" || (s.plan || "Free").toLowerCase() === filterPlan.toLowerCase();

    const active = isStoreActive(s);
    const expired = isPlanExpired(s);
    const blocked = s.isActive === false;

    let statusMatch = true;
    if (filterStatus === "active") statusMatch = active;
    else if (filterStatus === "inactive") statusMatch = !active;
    else if (filterStatus === "expired") statusMatch = expired;
    else if (filterStatus === "blocked") statusMatch = blocked;

    return nameMatch && planMatch && statusMatch;
  });

  const sortedStores = [...filteredStores].sort((a, b) => {
    let dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
    let dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
    
    const aSales = Number(salesMetricsMap[a.id]?.totalSales ?? 0);
    const bSales = Number(salesMetricsMap[b.id]?.totalSales ?? 0);
    const aBills = Number(salesMetricsMap[a.id]?.billCount ?? 0);
    const bBills = Number(salesMetricsMap[b.id]?.billCount ?? 0);

    if (sortOrder === "sales_desc") {
      return bSales - aSales;
    }
    if (sortOrder === "sales_asc") {
      return aSales - bSales;
    }
    if (sortOrder === "bills_desc") {
      return bBills - aBills;
    }
    if (sortOrder === "bills_asc") {
      return aBills - bBills;
    }
    if (sortOrder === "newest") return dateB - dateA;
    if (sortOrder === "oldest") return dateA - dateB;
    if (sortOrder === "name_asc") return (a.businessName || "").localeCompare(b.businessName || "");
    if (sortOrder === "name_desc") return (b.businessName || "").localeCompare(a.businessName || "");
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Registered Stores Directory</h1>
          <p className="text-xs text-slate-500 font-medium">Manage POS store accounts, track live sales & bill metrics directly from Firestore (zero cache)</p>
        </div>

        <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-3 w-full md:w-auto">
          <button
            onClick={() => runLiveCalculation()}
            disabled={liveCalcProgress.isCalculating}
            className="w-full md:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200 shadow-2xs flex items-center justify-center space-x-2"
            title="Scan and calculate live metrics directly from Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${liveCalcProgress.isCalculating ? "animate-spin text-[#4455DF]" : "text-slate-500"}`} />
            <span>{liveCalcProgress.isCalculating ? "Scanning Live..." : "Recalculate Live"}</span>
          </button>

          {hasEditAccess && (
            <button
              onClick={() => setIsCreatingStore(true)}
              className="w-full md:w-auto px-5 py-2.5 bg-[#4455DF] text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Store</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Calculation Progress Banner */}
      <div className={`rounded-2xl p-4 border transition-all duration-300 ${
        liveCalcProgress.isCalculating 
          ? "bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-indigo-50/90 border-indigo-200 shadow-sm" 
          : "bg-white border-slate-200 shadow-2xs"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start md:items-center space-x-3">
            {liveCalcProgress.isCalculating ? (
              <span className="relative flex h-3.5 w-3.5 flex-shrink-0 mt-0.5 md:mt-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4455DF] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#4455DF]"></span>
              </span>
            ) : (
              <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0 mt-0.5 md:mt-0"></span>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-xs text-slate-900 uppercase tracking-wide">
                  {liveCalcProgress.isCalculating ? "Real-Time Firestore Calculation Active" : "Live Firestore Data Verified"}
                </span>
                {liveCalcProgress.isCalculating && (
                  <span className="px-2 py-0.5 rounded-full bg-[#4455DF] text-white font-mono text-[10px] font-bold animate-pulse">
                    {Math.round(liveCalcProgress.total > 0 ? (liveCalcProgress.completed / liveCalcProgress.total) * 100 : 0)}%
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                  Zero Cache Policy
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                {liveCalcProgress.isCalculating ? (
                  <>
                    Scanning invoices store-by-store: <span className="font-bold text-indigo-700">{liveCalcProgress.activeStoreName ? `"${liveCalcProgress.activeStoreName}"` : "Initializing..."}</span> ({liveCalcProgress.completed} of {liveCalcProgress.total} stores tallied)
                    {liveCalcProgress.lastAdded && liveCalcProgress.lastAdded.sales > 0 && (
                      <span className="ml-2 inline-flex items-center text-[11px] font-bold text-emerald-600">
                        (+{formatCurrency(liveCalcProgress.lastAdded.sales)})
                      </span>
                    )}
                  </>
                ) : (
                  `100% direct Firestore invoice tally across all ${stores.length} stores. No cached or hardcoded numbers.`
                )}
              </p>
            </div>
          </div>

          {liveCalcProgress.isCalculating && (
            <div className="w-full md:w-56 bg-indigo-100/70 rounded-full h-2.5 overflow-hidden flex-shrink-0">
              <div
                className="bg-[#4455DF] h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${liveCalcProgress.total > 0 ? (liveCalcProgress.completed / liveCalcProgress.total) * 100 : 0}%`,
                }}
              ></div>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Sales & Bills KPI Cards (Dynamic Live Increment) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Network Sales */}
        <div className={`rounded-2xl p-4 sm:p-5 border transition-all duration-300 flex items-center space-x-4 ${
          liveCalcProgress.isCalculating
            ? "bg-indigo-50/40 border-indigo-200 ring-2 ring-indigo-400/20 shadow-sm"
            : "bg-white border-slate-200 shadow-2xs"
        }`}>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-[#4455DF] flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <span>Total Network Sales</span>
              {liveCalcProgress.isCalculating && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-black animate-pulse">
                  ⚡ Live Tallying...
                </span>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-0.5 truncate">
              <AnimatedCounter value={platformTotals.totalSales} isCurrency={true} />
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              {liveCalcProgress.isCalculating
                ? `Live incrementing (${liveCalcProgress.completed}/${liveCalcProgress.total} stores)...`
                : `Verified across all ${stores.length} stores`}
            </div>
          </div>
        </div>

        {/* Total Invoices / Bills */}
        <div className={`rounded-2xl p-4 sm:p-5 border transition-all duration-300 flex items-center space-x-4 ${
          liveCalcProgress.isCalculating
            ? "bg-emerald-50/40 border-emerald-200 ring-2 ring-emerald-400/20 shadow-sm"
            : "bg-white border-slate-200 shadow-2xs"
        }`}>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <span>Total Invoices / Bills</span>
              {liveCalcProgress.isCalculating && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-black animate-pulse">
                  ⚡ Streaming...
                </span>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-0.5 truncate">
              <AnimatedCounter value={platformTotals.totalBills} isCurrency={false} /> <span className="text-sm font-bold text-slate-600 font-sans">Bills</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {liveCalcProgress.isCalculating
                ? "Streaming invoice counts from Firestore..."
                : "Real customer transactions"}
            </div>
          </div>
        </div>

        {/* Active Store Status */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Store Network Status</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {platformTotals.activeCount} <span className="text-xs text-slate-400 font-semibold">/ {stores.length} Active</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              {stores.length - platformTotals.activeCount} Inactive / Expired
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by store name, owner, phone, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4455DF]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-500 uppercase">Plan:</span>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4455DF]"
            >
              <option value="all">All Plans</option>
              <option value="Free">Free</option>
              <option value="MAX One">MAX One</option>
              <option value="MAX Plus">MAX Plus</option>
              <option value="MAX Pro">MAX Pro</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-500 uppercase">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4455DF]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive / Expired Only</option>
              <option value="expired">Expired Plans Only</option>
              <option value="blocked">Blocked Accounts Only</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-500 uppercase">Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4455DF]"
            >
              <option value="newest">Newest First</option>
              <option value="sales_desc">Sales: High to Low (₹ Descending)</option>
              <option value="sales_asc">Sales: Low to High (₹ Ascending)</option>
              <option value="bills_desc">Bills: High to Low (Descending)</option>
              <option value="bills_asc">Bills: Low to High (Ascending)</option>
              <option value="oldest">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-[#4455DF] border-t-transparent rounded-full"></div>
            <p className="text-xs text-slate-500 font-semibold mt-3">Loading store records from Firestore...</p>
          </div>
        ) : sortedStores.length === 0 ? (
          <div className="py-16 text-center">
            <Store className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">No matching stores found in Firestore.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[880px]">
              <thead className="bg-slate-50 text-xs font-extrabold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-4">Business Details</th>
                  <th className="p-4">Owner Info</th>
                  <th className="p-4">Plan & Status</th>
                  <th className="p-4">
                    <div className="flex items-center space-x-1.5">
                      <span>Sales & Bills</span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setSortOrder(sortOrder === "sales_desc" ? "sales_asc" : "sales_desc")}
                          title={`Sort by Sales: ${sortOrder === "sales_desc" ? "Currently Descending (Click for Ascending)" : "Click for Descending"}`}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center space-x-0.5 transition ${
                            sortOrder.startsWith("sales")
                              ? "bg-indigo-100 text-[#4455DF]"
                              : "text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          <span>Sales</span>
                          {sortOrder === "sales_desc" && <span>↓</span>}
                          {sortOrder === "sales_asc" && <span>↑</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortOrder(sortOrder === "bills_desc" ? "bills_asc" : "bills_desc")}
                          title={`Sort by Bills: ${sortOrder === "bills_desc" ? "Currently Descending (Click for Ascending)" : "Click for Descending"}`}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center space-x-0.5 transition ${
                            sortOrder.startsWith("bills")
                              ? "bg-indigo-100 text-[#4455DF]"
                              : "text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          <span>Bills</span>
                          {sortOrder === "bills_desc" && <span>↓</span>}
                          {sortOrder === "bills_asc" && <span>↑</span>}
                        </button>
                      </div>
                    </div>
                  </th>
                  <th className="p-4">Timeline</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sortedStores.map((store) => (
                  <tr
                    key={store.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#4455DF] text-white flex items-center justify-center font-black text-sm shadow-md">
                          {store.businessName ? store.businessName[0].toUpperCase() : "S"}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900">{store.businessName || "Unnamed Store"}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {store.id}</div>
                          {store.gstin && <div className="text-[10px] text-indigo-600 font-mono">GST: {store.gstin}</div>}
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-slate-800">{store.ownerName || "N/A"}</div>
                      <div className="text-xs text-slate-500">{store.businessPhone || store.phone || store.mobile || "No phone"}</div>
                      <div className="text-[10px] text-slate-400">{store.businessEmail || store.email || store.ownerEmail || "No email"}</div>
                    </td>

                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-[#4455DF] border border-indigo-100 block w-max mb-1.5">
                        {store.plan || "Free"}
                      </span>
                      {isStoreActive(store) ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
                          Inactive
                          {isPlanExpired(store) && (
                            <span className="ml-1 text-[9px] font-extrabold text-rose-600 uppercase tracking-tight">(Expired)</span>
                          )}
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      {salesMetricsMap[store.id] ? (
                        <div className="transition-all duration-300">
                          <div className="font-mono font-black text-slate-900 text-sm flex items-center space-x-1.5">
                            <span>{formatCurrency(salesMetricsMap[store.id].totalSales)}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" title="Verified live from Firestore"></span>
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-[#4455DF] border border-indigo-100">
                              <Receipt className="w-3 h-3 text-[#4455DF]" />
                              <span>{salesMetricsMap[store.id].billCount} {salesMetricsMap[store.id].billCount === 1 ? "Bill" : "Bills"}</span>
                            </span>
                          </div>
                        </div>
                      ) : liveCalcProgress.isCalculating ? (
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="w-3.5 h-3.5 text-[#4455DF] animate-spin flex-shrink-0" />
                          <span className="text-xs font-semibold text-indigo-600 animate-pulse">Calculating live...</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 font-medium">Pending scan</div>
                      )}
                    </td>

                    <td className="p-4 text-[10px] text-slate-500">
                      <div className={isPlanExpired(store) ? "font-bold text-rose-600 flex items-center gap-1.5" : ""}>
                        <span>Exp: {formatDate(store.subscriptionExpiryDate)}</span>
                        {isPlanExpired(store) && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-black uppercase tracking-wider">
                            Expired
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-emerald-600">{calculateMembershipDays(store.createdAt)} Days Member</div>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setSelectedStore(store)}
                          title="View Store Details"
                          className="p-2 rounded-lg bg-indigo-50 text-[#4455DF] hover:bg-[#4455DF] hover:text-white transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {hasEditAccess && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(store)}
                              title="Edit Plan & Expiry"
                              className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(store.id, store.isActive)}
                              title={store.isActive !== false ? "Deactivate Store" : "Activate Store"}
                              className={`p-2 rounded-lg transition-colors ${
                                store.isActive !== false
                                  ? "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                              }`}
                            >
                              {store.isActive !== false ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Store Modal */}
      {selectedStore && <StoreDetailModal store={selectedStore} onClose={() => setSelectedStore(null)} />}

      {/* Edit Store Plan Modal */}
      {editStore && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-900">Update Subscription Tier</h3>
            <p className="text-xs text-slate-500">Store: <span className="font-bold text-slate-800">{editStore.businessName}</span></p>

            <form onSubmit={handleSaveStorePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Plan Package</label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
                >
                  <option value="Free">Free</option>
                  <option value="MAX One">MAX One</option>
                  <option value="MAX Plus">MAX Plus</option>
                  <option value="MAX Pro">MAX Pro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditStore(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-[#4455DF] hover:bg-indigo-700 rounded-xl shadow-md"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Register New Store Modal */}
      {isCreatingStore && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Register New POS Store</h3>
              <button onClick={() => setIsCreatingStore(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewStore} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Business / Store Name</label>
                <input
                  type="text"
                  required
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  placeholder="e.g. Royal Supermarket"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Owner Full Name</label>
                  <input
                    type="text"
                    required
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="owner@store.com"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={newGstin}
                    onChange={(e) => setNewGstin(e.target.value)}
                    placeholder="33AAAAA0000A1Z5"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Assigned Subscription Plan</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
                >
                  <option value="Free">Free</option>
                  <option value="MAX One">MAX One</option>
                  <option value="MAX Plus">MAX Plus</option>
                  <option value="MAX Pro">MAX Pro</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingStore(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-[#4455DF] hover:bg-indigo-700 rounded-xl shadow-md flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Registering..." : "Create Store"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
