"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Package,
  ShoppingCart,
  Users,
  UserCheck,
  DollarSign,
  Building2,
  Calendar,
  ShieldCheck,
  Tag,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Wallet,
  Coins,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Receipt,
  Layers,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatCurrency, formatDate, isPlanExpired, isStoreActive } from "@/lib/utils";
import { fetchStoreDataParallel } from "@/lib/storeDataCache";

export default function StoreDetailModal({ store, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");

  // Pure Live Data State
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [staff, setStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sales Tab State
  const [salesSearch, setSalesSearch] = useState("");
  const [salesPaymentFilter, setSalesPaymentFilter] = useState("all");
  const [salesPage, setSalesPage] = useState(1);
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const salesPerPage = 20;

  // Products Tab State
  const [productsSearch, setProductsSearch] = useState("");
  const [productsCategoryFilter, setProductsCategoryFilter] = useState("all");
  const [productsPage, setProductsPage] = useState(1);
  const productsPerPage = 20;

  // Customers Tab State
  const [customersSearch, setCustomersSearch] = useState("");
  const [customersDueFilter, setCustomersDueFilter] = useState("all"); // 'all' | 'dueOnly'
  const [customersPage, setCustomersPage] = useState(1);
  const customersPerPage = 20;

  // Expenses Tab State
  const [expensesSearch, setExpensesSearch] = useState("");
  const [expensesCategoryFilter, setExpensesCategoryFilter] = useState("all");
  const [expensesPage, setExpensesPage] = useState(1);
  const expensesPerPage = 20;

  // Staff Tab State
  const [staffSearch, setStaffSearch] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const applyStoreData = (data) => {
    if (!data) return;
    setProducts(data.products || []);
    setSales(data.sales || []);
    setStaff(data.staff || []);
    setCustomers(data.customers || []);
    setExpenses(data.expenses || []);
  };

  async function loadStoreData() {
    if (!store?.id) return;
    const storeId = store.id.toString();

    setLoading(true);
    try {
      const fresh = await fetchStoreDataParallel(storeId);
      if (fresh) applyStoreData(fresh);
    } catch (err) {
      console.error("Error loading live store data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadStoreData(false);
  }, [store?.id]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadStoreData(true);
  };

  // Memoized Metrics Calculations for Overview Tab & Tab Header Stats
  const metrics = useMemo(() => {
    // Total Sales Value (using `sale.total` from MAXmybill, with fallbacks)
    const totalSales = sales.reduce((sum, s) => {
      const val = Number(s.total ?? s.totalAmount ?? s.grandTotal ?? s.subtotal ?? 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const salesCount = sales.length;
    const aov = salesCount > 0 ? totalSales / salesCount : 0;

    // Total Expenses Value (using `expense.amount` or `totalAmount`)
    const totalExpenses = expenses.reduce((sum, e) => {
      const val = Number(e.amount ?? e.totalAmount ?? e.paidAmount ?? 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const netMargin = totalSales - totalExpenses;

    // Customer Outstanding Dues (Receivables)
    const totalDue = customers.reduce((sum, c) => {
      const b = Number(c.balance ?? 0);
      return sum + (b > 0 ? b : 0);
    }, 0);
    const customersWithDue = customers.filter((c) => Number(c.balance ?? 0) > 0).length;

    // Total Customer Sales
    const totalCustomerSales = customers.reduce((sum, c) => sum + (Number(c.totalSales ?? 0) || 0), 0);

    // Catalog Valuation & Stock
    const inventoryValuation = products.reduce((sum, p) => {
      const stock = Number(p.currentStock ?? p.stock ?? p.quantity ?? 0);
      const price = Number(p.price ?? p.salePrice ?? p.salesPrice ?? 0);
      return sum + (stock > 0 && price > 0 ? stock * price : 0);
    }, 0);

    const totalStockQty = products.reduce((sum, p) => sum + (Number(p.currentStock ?? p.stock ?? 0) || 0), 0);

    const lowStockCount = products.filter((p) => {
      const stock = Number(p.currentStock ?? p.stock ?? 0);
      const alert = Number(p.lowStockAlert ?? 0);
      return p.stockEnabled && stock <= alert;
    }).length;

    // Payment Mode Breakdown
    const paymentModes = {
      Cash: { count: 0, amount: 0 },
      Online: { count: 0, amount: 0 },
      Credit: { count: 0, amount: 0 },
      Split: { count: 0, amount: 0 },
      Other: { count: 0, amount: 0 },
    };

    sales.forEach((s) => {
      const mode = (s.paymentMode || "").trim().toLowerCase();
      const amt = Number(s.total ?? s.totalAmount ?? s.grandTotal ?? 0) || 0;
      if (mode === "cash") {
        paymentModes.Cash.count += 1;
        paymentModes.Cash.amount += amt;
      } else if (mode === "online" || mode === "upi" || mode === "card" || mode === "bank") {
        paymentModes.Online.count += 1;
        paymentModes.Online.amount += amt;
      } else if (mode === "credit") {
        paymentModes.Credit.count += 1;
        paymentModes.Credit.amount += amt;
      } else if (mode === "split") {
        paymentModes.Split.count += 1;
        paymentModes.Split.amount += amt;
      } else {
        paymentModes.Other.count += 1;
        paymentModes.Other.amount += amt;
      }
    });

    return {
      totalSales,
      salesCount,
      aov,
      totalExpenses,
      netMargin,
      totalDue,
      customersWithDue,
      totalCustomerSales,
      inventoryValuation,
      totalStockQty,
      lowStockCount,
      paymentModes,
    };
  }, [sales, expenses, customers, products]);

  // Product Categories list for filter
  const productCategories = useMemo(() => {
    const cats = new Set();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  // Expense Categories list for filter
  const expenseCategories = useMemo(() => {
    const cats = new Set();
    expenses.forEach((e) => {
      const c = e.expenseType || e.category;
      if (c) cats.add(c);
    });
    return Array.from(cats);
  }, [expenses]);

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const inv = (s.invoiceNumber || s.billNo || s.invoiceNo || s.id || "").toLowerCase();
      const cust = (s.customerName || s.customer || s.customerPhone || "").toLowerCase();
      const q = salesSearch.toLowerCase();
      const matchSearch = !q || inv.includes(q) || cust.includes(q);

      const mode = (s.paymentMode || "").toLowerCase();
      let matchMode = true;
      if (salesPaymentFilter !== "all") {
        if (salesPaymentFilter === "online") {
          matchMode = mode === "online" || mode === "upi" || mode === "card";
        } else {
          matchMode = mode === salesPaymentFilter.toLowerCase();
        }
      }
      return matchSearch && matchMode;
    });
  }, [sales, salesSearch, salesPaymentFilter]);

  const paginatedSales = useMemo(() => {
    const start = (salesPage - 1) * salesPerPage;
    return filteredSales.slice(start, start + salesPerPage);
  }, [filteredSales, salesPage]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const name = (p.itemName || p.name || "").toLowerCase();
      const code = (p.productCode || p.barcode || p.id || "").toLowerCase();
      const q = productsSearch.toLowerCase();
      const matchSearch = !q || name.includes(q) || code.includes(q);

      const matchCat = productsCategoryFilter === "all" || p.category === productsCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, productsSearch, productsCategoryFilter]);

  const paginatedProducts = useMemo(() => {
    const start = (productsPage - 1) * productsPerPage;
    return filteredProducts.slice(start, start + productsPerPage);
  }, [filteredProducts, productsPage]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const name = (c.name || c.customerName || "").toLowerCase();
      const phone = (c.phone || c.customerId || c.id || "").toLowerCase();
      const q = customersSearch.toLowerCase();
      const matchSearch = !q || name.includes(q) || phone.includes(q);

      const matchDue = customersDueFilter === "all" || Number(c.balance ?? 0) > 0;
      return matchSearch && matchDue;
    });
  }, [customers, customersSearch, customersDueFilter]);

  const paginatedCustomers = useMemo(() => {
    const start = (customersPage - 1) * customersPerPage;
    return filteredCustomers.slice(start, start + customersPerPage);
  }, [filteredCustomers, customersPage]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const title = (e.expenseName || e.name || e.title || "").toLowerCase();
      const num = (e.expenseNumber || e.billNumber || e.referenceNumber || "").toLowerCase();
      const q = expensesSearch.toLowerCase();
      const matchSearch = !q || title.includes(q) || num.includes(q);

      const cat = e.expenseType || e.category;
      const matchCat = expensesCategoryFilter === "all" || cat === expensesCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [expenses, expensesSearch, expensesCategoryFilter]);

  const paginatedExpenses = useMemo(() => {
    const start = (expensesPage - 1) * expensesPerPage;
    return filteredExpenses.slice(start, start + expensesPerPage);
  }, [filteredExpenses, expensesPage]);

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      const name = (s.name || s.displayName || "").toLowerCase();
      const email = (s.email || "").toLowerCase();
      const phone = (s.phone || "").toLowerCase();
      const q = staffSearch.toLowerCase();
      return !q || name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [staff, staffSearch]);

  if (!store || !mounted) return null;

  // Helper for Payment badge colors
  const getPaymentBadge = (mode) => {
    const m = (mode || "cash").toLowerCase();
    if (m === "cash") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (m === "online" || m === "upi" || m === "card") return "bg-blue-50 text-blue-700 border-blue-200";
    if (m === "credit") return "bg-amber-50 text-amber-700 border-amber-200";
    if (m === "split") return "bg-purple-50 text-purple-700 border-purple-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        {/* MODAL HEADER WITH INTEGRATED TABS */}
        <div className="bg-[#1E255E] text-white border-b border-indigo-950/60 relative overflow-hidden flex-shrink-0 shadow-md">
          <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none"></div>

          {/* Top Row: Store Identity & Action Buttons */}
          <div className="px-5 sm:px-8 pt-5 pb-3.5 flex items-center justify-between relative">
            <div className="flex items-center space-x-4 min-w-0 pr-16 sm:pr-0">
              {store.logoUrl ? (
                <img
                  src={store.logoUrl}
                  alt={store.businessName || "Store Logo"}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-white/20 shadow-md bg-white flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#4455DF] to-indigo-400 flex items-center justify-center text-white font-extrabold text-xl sm:text-2xl shadow-lg border border-white/20 flex-shrink-0">
                  {store.businessName ? store.businessName[0].toUpperCase() : "S"}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate max-w-[220px] sm:max-w-md">
                    {store.businessName || "Unnamed Store"}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                    {store.plan || "Free"}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center ${
                      isStoreActive(store)
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        isStoreActive(store) ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                      }`}
                    ></span>
                    {isStoreActive(store) ? "Active" : "Inactive"}
                    {isPlanExpired(store) && <span className="ml-1 text-[9px] font-black uppercase text-rose-300">(Expired)</span>}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-indigo-200/90 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-medium">
                  <span>
                    Store ID: <strong className="text-white font-mono">{store.id}</strong>
                  </span>
                  <span className="text-indigo-400/60">•</span>
                  <span>Registered: {formatDate(store.createdAt)}</span>
                  {store.subscriptionExpiryDate && (
                    <>
                      <span className="text-indigo-400/60">•</span>
                      <span className={isPlanExpired(store) ? "text-rose-300 font-bold" : ""}>
                        Plan Expiry: {formatDate(store.subscriptionExpiryDate)}
                        {isPlanExpired(store) && " (Expired)"}
                      </span>
                    </>
                  )}
                  {store.businessPhone && (
                    <>
                      <span className="text-indigo-400/60 hidden sm:inline">•</span>
                      <span className="hidden sm:inline">Phone: {store.businessPhone}</span>
                    </>
                  )}
                  {store.businessLocation && (
                    <>
                      <span className="text-indigo-400/60 hidden sm:inline">•</span>
                      <span className="hidden sm:inline">Location: {store.businessLocation}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="absolute right-4 top-1/2 -translate-y-1/2 sm:static sm:translate-y-0 flex items-center space-x-2 z-20">
              <button
                onClick={handleManualRefresh}
                disabled={loading || refreshing}
                title="Refresh Data from Firestore"
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all disabled:opacity-50 border border-white/10 backdrop-blur-xs flex items-center justify-center"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing || loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={onClose}
                title="Close Modal"
                className="p-2.5 rounded-xl bg-white/10 hover:bg-rose-500 text-white transition-all border border-white/10 backdrop-blur-xs flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Row: Seamless Navigation Tabs Bar */}
          <div className="px-5 sm:px-8 flex items-center justify-between border-t border-indigo-900/60 bg-[#151A44] overflow-x-auto">
            <div className="flex items-center space-x-1 sm:space-x-2 py-2.5">
              {[
                { id: "overview", label: "Overview", icon: Building2, count: null },
                { id: "products", label: "Products", icon: Package, count: products.length },
                { id: "sales", label: "Sales", icon: ShoppingCart, count: sales.length },
                { id: "staff", label: "Staff", icon: Users, count: staff.length },
                { id: "customers", label: "Customers", icon: UserCheck, count: customers.length },
                { id: "expenses", label: "Expenses", icon: DollarSign, count: expenses.length },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-[#4455DF] text-white shadow-md shadow-indigo-600/40"
                        : "text-indigo-200 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-indigo-300"}`} />
                    <span>{tab.label}</span>
                    {tab.count !== null && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                          isActive
                            ? "bg-white text-[#4455DF]"
                            : "bg-indigo-950/80 text-indigo-300 border border-indigo-800/60"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="hidden lg:flex items-center space-x-2 pl-4 text-xs">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Firestore Sync</span>
              </span>
            </div>
          </div>
        </div>

        {/* TAB CONTENTS CONTAINER */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#F4F7FA]">
          {loading ? (
            <div className="py-20 text-center space-y-4">
              <div className="inline-block animate-spin w-10 h-10 border-4 border-[#4455DF] border-t-transparent rounded-full"></div>
              <p className="text-sm text-slate-600 font-bold">Loading full store records from MAXmybill database...</p>
              <p className="text-xs text-slate-400">Fetching products, sales history, customer dues, expenses, and staff...</p>
            </div>
          ) : (
            <>
              {/* ========================================================= */}
              {/* 1. OVERVIEW TAB: FULL TOTALS & ANALYTICS DASHBOARD       */}
              {/* ========================================================= */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Financial KPI Cards Grid */}
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                      <span>Financial Performance & Totals</span>
                      <span className="text-[11px] font-normal text-slate-400 normal-case">
                        Calculated from live transactions in Firestore
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Total Sales */}
                      <div className="bg-gradient-to-br from-indigo-500 to-[#3b49c7] text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-medium text-indigo-100">Total Sales Value</p>
                            <h4 className="text-2xl font-black mt-1">{formatCurrency(metrics.totalSales)}</h4>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-indigo-100">
                          <span>{metrics.salesCount} Completed Orders</span>
                          <span>AOV: {formatCurrency(metrics.aov)}</span>
                        </div>
                      </div>

                      {/* Total Expenses */}
                      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Expenses</p>
                            <h4 className="text-2xl font-black text-rose-600 mt-1">
                              {formatCurrency(metrics.totalExpenses)}
                            </h4>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-rose-600" />
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span>{expenses.length} Expense Records</span>
                          <span className="font-semibold text-slate-700">Outflows</span>
                        </div>
                      </div>

                      {/* Net Flow / Margin */}
                      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Margin / Flow</p>
                            <h4
                              className={`text-2xl font-black mt-1 ${
                                metrics.netMargin >= 0 ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {formatCurrency(metrics.netMargin)}
                            </h4>
                          </div>
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              metrics.netMargin >= 0 ? "bg-emerald-50" : "bg-rose-50"
                            }`}
                          >
                            <Coins
                              className={`w-5 h-5 ${metrics.netMargin >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                            />
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Sales minus Expenses</span>
                          <span
                            className={`font-extrabold px-2 py-0.5 rounded text-[10px] uppercase ${
                              metrics.netMargin >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {metrics.netMargin >= 0 ? "Profitable" : "Negative Flow"}
                          </span>
                        </div>
                      </div>

                      {/* Outstanding Customer Dues */}
                      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Due (Credit)</p>
                            <h4 className="text-2xl font-black text-amber-600 mt-1">
                              {formatCurrency(metrics.totalDue)}
                            </h4>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-amber-600" />
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span>{metrics.customersWithDue} Customers with Due</span>
                          <span className="font-semibold text-amber-700">Receivables</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Mode Breakdown & Catalog Quick Stats */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Payment Modes Card */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-2">
                          <Wallet className="w-4 h-4 text-[#4455DF]" />
                          <span>Sales by Payment Mode</span>
                        </h4>
                        <span className="text-xs text-slate-400">Total: {formatCurrency(metrics.totalSales)}</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* Cash */}
                        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                          <p className="text-[11px] font-bold text-emerald-800 uppercase">Cash</p>
                          <p className="text-base font-extrabold text-slate-900 mt-1">
                            {formatCurrency(metrics.paymentModes.Cash.amount)}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                            {metrics.paymentModes.Cash.count} Bills (
                            {metrics.totalSales > 0
                              ? Math.round((metrics.paymentModes.Cash.amount / metrics.totalSales) * 100)
                              : 0}
                            %)
                          </p>
                        </div>

                        {/* Online / UPI */}
                        <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                          <p className="text-[11px] font-bold text-blue-800 uppercase">Online / UPI</p>
                          <p className="text-base font-extrabold text-slate-900 mt-1">
                            {formatCurrency(metrics.paymentModes.Online.amount)}
                          </p>
                          <p className="text-[10px] text-blue-600 font-semibold mt-0.5">
                            {metrics.paymentModes.Online.count} Bills (
                            {metrics.totalSales > 0
                              ? Math.round((metrics.paymentModes.Online.amount / metrics.totalSales) * 100)
                              : 0}
                            %)
                          </p>
                        </div>

                        {/* Credit */}
                        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                          <p className="text-[11px] font-bold text-amber-800 uppercase">Credit</p>
                          <p className="text-base font-extrabold text-slate-900 mt-1">
                            {formatCurrency(metrics.paymentModes.Credit.amount)}
                          </p>
                          <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                            {metrics.paymentModes.Credit.count} Bills (
                            {metrics.totalSales > 0
                              ? Math.round((metrics.paymentModes.Credit.amount / metrics.totalSales) * 100)
                              : 0}
                            %)
                          </p>
                        </div>

                        {/* Split */}
                        <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100">
                          <p className="text-[11px] font-bold text-purple-800 uppercase">Split</p>
                          <p className="text-base font-extrabold text-slate-900 mt-1">
                            {formatCurrency(metrics.paymentModes.Split.amount)}
                          </p>
                          <p className="text-[10px] text-purple-600 font-semibold mt-0.5">
                            {metrics.paymentModes.Split.count} Bills (
                            {metrics.totalSales > 0
                              ? Math.round((metrics.paymentModes.Split.amount / metrics.totalSales) * 100)
                              : 0}
                            %)
                          </p>
                        </div>
                      </div>

                      {/* Visual Mode Progress Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-3 flex overflow-hidden">
                        <div
                          style={{
                            width: `${
                              metrics.totalSales > 0
                                ? (metrics.paymentModes.Cash.amount / metrics.totalSales) * 100
                                : 0
                            }%`,
                          }}
                          className="bg-emerald-500 h-full"
                          title={`Cash: ${formatCurrency(metrics.paymentModes.Cash.amount)}`}
                        ></div>
                        <div
                          style={{
                            width: `${
                              metrics.totalSales > 0
                                ? (metrics.paymentModes.Online.amount / metrics.totalSales) * 100
                                : 0
                            }%`,
                          }}
                          className="bg-blue-500 h-full"
                          title={`Online: ${formatCurrency(metrics.paymentModes.Online.amount)}`}
                        ></div>
                        <div
                          style={{
                            width: `${
                              metrics.totalSales > 0
                                ? (metrics.paymentModes.Credit.amount / metrics.totalSales) * 100
                                : 0
                            }%`,
                          }}
                          className="bg-amber-500 h-full"
                          title={`Credit: ${formatCurrency(metrics.paymentModes.Credit.amount)}`}
                        ></div>
                        <div
                          style={{
                            width: `${
                              metrics.totalSales > 0
                                ? (metrics.paymentModes.Split.amount / metrics.totalSales) * 100
                                : 0
                            }%`,
                          }}
                          className="bg-purple-500 h-full"
                          title={`Split: ${formatCurrency(metrics.paymentModes.Split.amount)}`}
                        ></div>
                      </div>
                    </div>

                    {/* Operations & Inventory Summary Card */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-2 border-b border-slate-100 pb-3">
                        <Layers className="w-4 h-4 text-[#4455DF]" />
                        <span>Inventory & Operations</span>
                      </h4>

                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-xs">Total Products:</span>
                          <span className="font-extrabold text-slate-800">{products.length} Items</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-xs">Stock Units In Hand:</span>
                          <span className="font-bold text-slate-800">{metrics.totalStockQty.toLocaleString()} units</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-xs">Catalog Valuation:</span>
                          <span className="font-bold text-emerald-600">
                            {formatCurrency(metrics.inventoryValuation)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-xs">Total Customers:</span>
                          <span className="font-bold text-slate-800">{customers.length} Accounts</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-xs">Active Staff:</span>
                          <span className="font-bold text-indigo-600">{staff.length} Members</span>
                        </div>
                        {metrics.lowStockCount > 0 && (
                          <div className="p-2 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center space-x-2 font-semibold">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{metrics.lowStockCount} item(s) below low stock alert!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Transactions Quick Preview */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 sm:px-6 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-800">Recent Sales Transactions</h4>
                        <p className="text-xs text-slate-500">Latest 5 sales logged by this store</p>
                      </div>
                      <button
                        onClick={() => setActiveTab("sales")}
                        className="text-xs font-bold text-[#4455DF] hover:underline flex items-center space-x-1"
                      >
                        <span>View All {sales.length} Sales</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[560px]">
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                          <tr>
                            <th className="p-3">Bill No</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Payment Mode</th>
                            <th className="p-3 text-right">Total Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sales.slice(0, 5).map((sale) => {
                            const invoiceDisplay =
                              sale.invoiceNumber || sale.billNo || sale.invoiceNo || sale.id.slice(0, 6);
                            const amount = Number(sale.total ?? sale.totalAmount ?? sale.grandTotal ?? 0);
                            return (
                              <tr key={sale.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono font-bold text-slate-800">
                                  #{invoiceDisplay}
                                </td>
                                <td className="p-3 text-slate-500">
                                  {formatDate(sale.createdAt || sale.timestamp || sale.date)}
                                </td>
                                <td className="p-3 text-slate-700 font-medium">
                                  {sale.customerName || (sale.customerPhone ? sale.customerPhone : "Walk-in")}
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPaymentBadge(
                                      sale.paymentMode
                                    )}`}
                                  >
                                    {sale.paymentMode || "Cash"}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-black text-slate-900">
                                  {formatCurrency(amount)}
                                </td>
                              </tr>
                            );
                          })}
                          {sales.length === 0 && (
                            <tr>
                              <td colSpan="5" className="p-4 text-center text-slate-400">
                                No sales transactions found yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Store Details & Subscription Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Business Profile</h4>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100/70">
                          <span className="text-slate-500 text-xs flex-shrink-0">Business Name:</span>
                          <span className="font-bold text-slate-800 text-xs sm:text-sm text-right break-words">{store.businessName || "N/A"}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100/70">
                          <span className="text-slate-500 text-xs flex-shrink-0">Owner Name:</span>
                          <span className="font-semibold text-slate-800 text-xs sm:text-sm text-right">{store.ownerName || "N/A"}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100/70">
                          <span className="text-slate-500 text-xs flex-shrink-0">Phone:</span>
                          <span className="font-semibold text-slate-800 text-xs sm:text-sm text-right font-mono">
                            {store.businessPhone || store.personalPhone || store.phone || store.mobile || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100/70">
                          <span className="text-slate-500 text-xs flex-shrink-0">Email:</span>
                          <span className="font-semibold text-slate-800 text-xs sm:text-sm text-right break-all">{store.ownerEmail || store.email || "N/A"}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100/70">
                          <span className="text-slate-500 text-xs flex-shrink-0">GST Number:</span>
                          <span className="font-mono text-slate-800 text-xs sm:text-sm text-right">{store.gstin || store.gstNumber || "N/A"}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100/70">
                          <span className="text-slate-500 text-xs flex-shrink-0">Tax Setting:</span>
                          <span className="font-semibold text-slate-800 text-xs sm:text-sm text-right">{store.taxType || "Standard"}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 py-1.5">
                          <span className="text-slate-500 text-xs flex-shrink-0">Location:</span>
                          <span className="font-semibold text-slate-800 text-right text-xs sm:text-sm break-words max-w-[65%]">
                            {store.businessLocation || store.address || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Subscription & Limits</h4>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100/70">
                          <span className="text-slate-500 text-xs flex-shrink-0">Plan Tier:</span>
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-[#4455DF] border border-indigo-100">
                            {store.plan || "Free"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100/70">
                          <span className="text-slate-500 text-xs flex-shrink-0">Account Status:</span>
                          {isStoreActive(store) ? (
                            <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              Active Store
                            </span>
                          ) : (
                            <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                              {store.isActive === false ? "Blocked / Inactive" : "Inactive (Plan Expired)"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100/70">
                          <span className="text-slate-500 text-xs flex-shrink-0">Expiry Date:</span>
                          <span className={`font-semibold text-xs sm:text-sm text-right ${isPlanExpired(store) ? "text-rose-600 font-bold" : "text-slate-800"}`}>
                            {formatDate(store.subscriptionExpiryDate || store.planExpiryDate || store.expiryDate)}
                            {isPlanExpired(store) && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider">
                                Expired
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100/70">
                          <span className="text-slate-500 text-xs flex-shrink-0">Invoice Prefix:</span>
                          <span className="font-mono font-bold text-indigo-700 text-xs sm:text-sm text-right">
                            {store.invoicePrefix || "N/A"} (Next: {store.nextInvoiceNumber || "N/A"})
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 py-1.5">
                          <span className="text-slate-500 text-xs flex-shrink-0">Expense Prefix:</span>
                          <span className="font-mono text-slate-800 text-xs sm:text-sm text-right">
                            {store.expensePrefix || "N/A"} (Next: {store.nextExpenseNumber || "N/A"})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* 2. PRODUCTS TAB                                          */}
              {/* ========================================================= */}
              {activeTab === "products" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  {/* Integrated Header Toolbar */}
                  <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search product name, code, barcode..."
                          value={productsSearch}
                          onChange={(e) => {
                            setProductsSearch(e.target.value);
                            setProductsPage(1);
                          }}
                          className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4455DF] focus:bg-white text-slate-800 placeholder-slate-400 font-medium transition-all"
                        />
                        {productsSearch && (
                          <button
                            onClick={() => {
                              setProductsSearch("");
                              setProductsPage(1);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {productCategories.length > 0 && (
                        <select
                          value={productsCategoryFilter}
                          onChange={(e) => {
                            setProductsCategoryFilter(e.target.value);
                            setProductsPage(1);
                          }}
                          className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                        >
                          <option value="all">All Categories ({products.length})</option>
                          {productCategories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                      <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200/60">
                        <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">Catalog Value:</span>
                        <span className="text-xs sm:text-sm font-black font-mono text-[#4455DF]">
                          {formatCurrency(metrics.inventoryValuation)}
                        </span>
                      </div>
                      <span className="text-slate-400 text-xs hidden sm:inline">
                        {filteredProducts.length} of {products.length} Items
                      </span>
                    </div>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-16">
                      <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-600">No items found matching your filter.</p>
                      <p className="text-xs text-slate-400 mt-1">Try clearing search keywords or selecting all categories.</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[700px] table-fixed">
                          <thead className="bg-slate-50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                            <tr>
                              <th className="py-3 px-4 w-[34%]">Product Details</th>
                              <th className="py-3 px-4 w-[16%]">Category</th>
                              <th className="py-3 px-4 w-[16%]">Code / Barcode</th>
                              <th className="py-3 px-4 w-[17%] text-right">Cost Price</th>
                              <th className="py-3 px-4 w-[17%] text-right">Sales Price & Stock</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {paginatedProducts.map((item) => {
                              const stockVal = Number(item.currentStock ?? item.stock ?? item.quantity ?? 0);
                              const isLow = item.stockEnabled && stockVal <= (Number(item.lowStockAlert) || 0);
                              const salesPrice = Number(item.price ?? item.salePrice ?? item.salesPrice ?? 0);
                              const costPrice = Number(item.costPrice ?? item.purchasePrice ?? 0);

                              return (
                                <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
                                  <td className="py-3.5 px-4">
                                    <div className="font-bold text-slate-900 text-sm">
                                      {item.itemName || item.name || "Unnamed Product"}
                                    </div>
                                    {item.mrp > salesPrice && (
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        MRP: {formatCurrency(item.mrp)}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className="px-2.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-semibold">
                                      {item.category || "General"}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                                    {item.productCode || item.barcode || item.id}
                                  </td>
                                  <td className="py-3.5 px-4 text-right text-slate-500 text-xs font-mono">
                                    {costPrice > 0 ? formatCurrency(costPrice) : "-"}
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <div className="font-extrabold text-[#4455DF] text-sm font-mono">
                                      {formatCurrency(salesPrice)}
                                    </div>
                                    <div className="mt-1">
                                      <span
                                        className={`inline-block font-extrabold text-[11px] px-2 py-0.5 rounded-full ${
                                          isLow
                                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                                            : stockVal > 0
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-slate-100 text-slate-500"
                                        }`}
                                      >
                                        {stockVal} {item.stockUnit || ""} {isLow && "⚠️ Low"}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      {filteredProducts.length > productsPerPage && (
                        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                          <span>
                            Showing Page <strong className="text-slate-800">{productsPage}</strong> of{" "}
                            <strong className="text-slate-800">
                              {Math.ceil(filteredProducts.length / productsPerPage)}
                            </strong>{" "}
                            ({filteredProducts.length} Total Items)
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              disabled={productsPage === 1}
                              onClick={() => setProductsPage((p) => Math.max(1, p - 1))}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition shadow-2xs"
                            >
                              Previous
                            </button>
                            <button
                              disabled={productsPage >= Math.ceil(filteredProducts.length / productsPerPage)}
                              onClick={() => setProductsPage((p) => p + 1)}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition shadow-2xs"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* 3. SALES TAB (WITH CART ITEMS EXPANSION)                 */}
              {/* ========================================================= */}
              {activeTab === "sales" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  {/* Integrated Header Toolbar */}
                  <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search bill no, customer..."
                          value={salesSearch}
                          onChange={(e) => {
                            setSalesSearch(e.target.value);
                            setSalesPage(1);
                          }}
                          className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4455DF] focus:bg-white text-slate-800 placeholder-slate-400 font-medium transition-all"
                        />
                        {salesSearch && (
                          <button
                            onClick={() => {
                              setSalesSearch("");
                              setSalesPage(1);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <select
                        value={salesPaymentFilter}
                        onChange={(e) => {
                          setSalesPaymentFilter(e.target.value);
                          setSalesPage(1);
                        }}
                        className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                      >
                        <option value="all">All Payment Modes ({sales.length})</option>
                        <option value="cash">Cash ({sales.filter((s) => (s.paymentMode || "cash").toLowerCase() === "cash").length})</option>
                        <option value="online">Online / UPI ({sales.filter((s) => ["online", "upi", "card"].includes((s.paymentMode || "").toLowerCase())).length})</option>
                        <option value="credit">Credit ({sales.filter((s) => (s.paymentMode || "").toLowerCase() === "credit").length})</option>
                        <option value="split">Split ({sales.filter((s) => (s.paymentMode || "").toLowerCase() === "split").length})</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                      <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80">
                        <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Filtered Sales:</span>
                        <span className="text-xs sm:text-sm font-black font-mono text-emerald-700">
                          {formatCurrency(
                            filteredSales.reduce((acc, s) => acc + (Number(s.total ?? s.totalAmount ?? 0) || 0), 0)
                          )}
                        </span>
                      </div>
                      <span className="text-slate-400 text-xs hidden sm:inline">
                        {filteredSales.length} of {sales.length} Bills
                      </span>
                    </div>
                  </div>

                  {filteredSales.length === 0 ? (
                    <div className="text-center py-16">
                      <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-600">No sales match your search or filter.</p>
                      <p className="text-xs text-slate-400 mt-1">Try clearing filters or search terms.</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[720px] table-fixed">
                          <thead className="bg-slate-50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                            <tr>
                              <th className="py-3 px-4 w-[18%]">Bill / Invoice</th>
                              <th className="py-3 px-4 w-[20%]">Date & Time</th>
                              <th className="py-3 px-4 w-[22%]">Customer</th>
                              <th className="py-3 px-4 w-[11%] text-center">Items</th>
                              <th className="py-3 px-4 w-[13%]">Mode</th>
                              <th className="py-3 px-4 w-[16%] text-right">Total Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {paginatedSales.map((sale) => {
                              const billNumber =
                                sale.invoiceNumber || sale.billNo || sale.invoiceNo || sale.id.slice(0, 6);
                              const isExpanded = expandedSaleId === sale.id;
                              const totalAmt = Number(sale.total ?? sale.totalAmount ?? sale.grandTotal ?? 0);
                              const itemsCount = sale.items?.length || 0;

                              return (
                                <>
                                  <tr
                                    key={sale.id}
                                    onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                                    className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                                  >
                                    <td className="py-3.5 px-4 font-mono font-black text-slate-900 flex items-center space-x-2">
                                      <button className="p-0.5 rounded text-slate-400 hover:text-[#4455DF]">
                                        {isExpanded ? (
                                          <ChevronUp className="w-3.5 h-3.5 text-[#4455DF]" />
                                        ) : (
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      <span>#{billNumber}</span>
                                    </td>
                                    <td className="py-3.5 px-4 text-xs text-slate-500">
                                      {formatDate(sale.createdAt || sale.timestamp || sale.date)}
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-700">
                                      <div className="font-semibold text-slate-900 text-xs truncate">
                                        {sale.customerName || (sale.customerPhone ? sale.customerPhone : "Walk-in")}
                                      </div>
                                      {sale.customerPhone && sale.customerName && (
                                        <div className="text-[10px] text-slate-400 font-mono">
                                          {sale.customerPhone}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                        {itemsCount} {itemsCount === 1 ? "item" : "items"}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span
                                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getPaymentBadge(
                                          sale.paymentMode
                                        )}`}
                                      >
                                        {sale.paymentMode || "Cash"}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-right font-black text-emerald-600 text-sm font-mono">
                                      {formatCurrency(totalAmt)}
                                    </td>
                                  </tr>

                                  {/* Expanded Itemized Breakdown */}
                                  {isExpanded && (
                                    <tr key={`${sale.id}-exp`} className="bg-slate-50/90">
                                      <td colSpan="6" className="p-4 border-t border-slate-200/80">
                                        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
                                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center space-x-2">
                                              <Receipt className="w-4 h-4 text-[#4455DF]" />
                                              <span>Invoice Itemized Breakdown (#{billNumber})</span>
                                            </h5>
                                            <span className="text-xs font-bold text-slate-700">
                                              Invoice Total: <strong className="text-emerald-600 font-mono">{formatCurrency(totalAmt)}</strong>
                                            </span>
                                          </div>

                                          {/* Items Table */}
                                          {sale.items && sale.items.length > 0 ? (
                                            <div className="overflow-x-auto">
                                              <table className="w-full text-xs text-left min-w-[420px]">
                                                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                                                  <tr>
                                                    <th className="p-2">Item Name</th>
                                                    <th className="p-2 text-center">Qty</th>
                                                    <th className="p-2 text-right">Price</th>
                                                    <th className="p-2 text-right">Tax</th>
                                                    <th className="p-2 text-right">Total</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                  {sale.items.map((it, idx) => (
                                                    <tr key={idx}>
                                                      <td className="p-2 font-bold text-slate-800">
                                                        {it.name || "Item"}
                                                      </td>
                                                      <td className="p-2 text-center text-slate-600 font-semibold">
                                                        {it.quantity}
                                                      </td>
                                                      <td className="p-2 text-right text-slate-600 font-mono">
                                                        {formatCurrency(it.price || 0)}
                                                      </td>
                                                      <td className="p-2 text-right text-slate-500 font-mono">
                                                        {it.taxAmount ? formatCurrency(it.taxAmount) : "-"}
                                                      </td>
                                                      <td className="p-2 text-right font-bold text-slate-900 font-mono">
                                                        {formatCurrency(it.total || 0)}
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          ) : (
                                            <p className="text-xs text-slate-400 italic">
                                              No individual item records attached to this invoice.
                                            </p>
                                          )}

                                          {/* Summary Footer */}
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                                            <div>Subtotal: <strong className="font-mono">{formatCurrency(sale.subtotal || totalAmt)}</strong></div>
                                            <div>Discount: <strong className="font-mono">{formatCurrency(sale.discount || 0)}</strong></div>
                                            <div>Total Tax: <strong className="font-mono">{formatCurrency(sale.totalTax || 0)}</strong></div>
                                            <div>Payment Mode: <strong className="capitalize">{sale.paymentMode || "Cash"}</strong></div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {filteredSales.length > salesPerPage && (
                        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                          <span>
                            Showing Page <strong className="text-slate-800">{salesPage}</strong> of{" "}
                            <strong className="text-slate-800">
                              {Math.ceil(filteredSales.length / salesPerPage)}
                            </strong>{" "}
                            ({filteredSales.length} Total Bills)
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              disabled={salesPage === 1}
                              onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition shadow-2xs"
                            >
                              Previous
                            </button>
                            <button
                              disabled={salesPage >= Math.ceil(filteredSales.length / salesPerPage)}
                              onClick={() => setSalesPage((p) => p + 1)}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition shadow-2xs"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* 4. STAFF TAB                                             */}
              {/* ========================================================= */}
              {activeTab === "staff" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search staff by name, email, phone..."
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4455DF]"
                      />
                    </div>
                    <span className="text-xs text-slate-500 text-right sm:text-left">
                      Total Staff: <strong className="text-slate-900">{filteredStaff.length}</strong>
                    </span>
                  </div>

                  {filteredStaff.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-600">No staff members found.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {filteredStaff.map((s) => (
                        <div
                          key={s.id}
                          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-200 transition-colors"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4455DF] to-indigo-400 text-white flex items-center justify-center font-black text-lg shadow-md flex-shrink-0">
                              {s.name ? s.name[0].toUpperCase() : "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-extrabold text-slate-900 text-sm truncate">
                                {s.name || "Staff Member"}
                              </h5>
                              <p className="text-xs text-slate-500 truncate">{s.email || "No email"}</p>
                              {s.phone && (
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{s.phone}</p>
                              )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                (s.role || "").toLowerCase() === "admin"
                                  ? "bg-indigo-100 text-[#4455DF]"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {s.role || "Staff"}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                s.isActive !== false ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {s.isActive !== false ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* 5. CUSTOMERS TAB                                         */}
              {/* ========================================================= */}
              {activeTab === "customers" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  {/* Integrated Header Toolbar */}
                  <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                      {/* Search input with clear button */}
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search customer name, phone..."
                          value={customersSearch}
                          onChange={(e) => {
                            setCustomersSearch(e.target.value);
                            setCustomersPage(1);
                          }}
                          className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4455DF] focus:bg-white text-slate-800 placeholder-slate-400 font-medium transition-all"
                        />
                        {customersSearch && (
                          <button
                            onClick={() => {
                              setCustomersSearch("");
                              setCustomersPage(1);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Segmented Filter Pills */}
                      <div className="flex items-center p-1 bg-slate-100/90 rounded-xl text-xs font-bold self-start sm:self-auto border border-slate-200/60">
                        <button
                          onClick={() => {
                            setCustomersDueFilter("all");
                            setCustomersPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-lg transition-all ${
                            customersDueFilter === "all"
                              ? "bg-white text-slate-900 shadow-2xs"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          All ({customers.length})
                        </button>
                        <button
                          onClick={() => {
                            setCustomersDueFilter("dueOnly");
                            setCustomersPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                            customersDueFilter === "dueOnly"
                              ? "bg-amber-500 text-white shadow-2xs"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          <span>Has Due</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                              customersDueFilter === "dueOnly"
                                ? "bg-white/25 text-white"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {customers.filter((c) => Number(c.balance || 0) > 0).length}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Right Side Stats */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                      <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80">
                        <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Due:</span>
                        <span className="text-xs sm:text-sm font-black font-mono text-amber-700">
                          {formatCurrency(metrics.totalDue)}
                        </span>
                      </div>
                      <span className="text-slate-400 text-xs hidden sm:inline">
                        {filteredCustomers.length} of {customers.length} Customers
                      </span>
                    </div>
                  </div>

                  {filteredCustomers.length === 0 ? (
                    <div className="text-center py-16">
                      <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-600">No matching customer records found.</p>
                      <p className="text-xs text-slate-400 mt-1">Try clearing search filters.</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[700px] table-fixed">
                          <thead className="bg-slate-50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                            <tr>
                              <th className="py-3 px-4 w-[32%]">Customer Details</th>
                              <th className="py-3 px-4 w-[20%]">Contact Phone</th>
                              <th className="py-3 px-4 w-[14%] text-center">Orders</th>
                              <th className="py-3 px-4 w-[17%] text-right">Lifetime Sales</th>
                              <th className="py-3 px-4 w-[17%] text-right">Outstanding Due</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {paginatedCustomers.map((c) => {
                              const balance = Number(c.balance || 0);
                              const totalSales = Number(c.totalSales || 0);
                              const purchaseCount = Number(c.purchaseCount || 0);
                              const custName = c.name || c.customerName || "Customer";
                              const initials = custName.slice(0, 2).toUpperCase();

                              return (
                                <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors">
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-100 to-indigo-50 text-[#4455DF] border border-indigo-200/60 flex items-center justify-center font-black text-xs shadow-2xs flex-shrink-0">
                                        {initials}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-bold text-slate-900 text-sm truncate leading-tight">
                                          {custName}
                                        </div>
                                        <div className="mt-0.5 flex items-center space-x-1.5">
                                          {c.rating ? (
                                            <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                                              ★ {c.rating} / 5
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-slate-400 font-medium">Customer</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className="font-mono text-xs text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60 inline-flex items-center gap-1.5">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      {c.phone || c.customerId || c.id || "N/A"}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                                      {purchaseCount} {purchaseCount === 1 ? "order" : "orders"}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-extrabold text-slate-800 text-sm font-mono">
                                    {formatCurrency(totalSales)}
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    {balance > 0 ? (
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black font-mono bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs">
                                        {formatCurrency(balance)}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60">
                                        ₹0.00
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {filteredCustomers.length > customersPerPage && (
                        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                          <span>
                            Showing Page <strong className="text-slate-800">{customersPage}</strong> of{" "}
                            <strong className="text-slate-800">
                              {Math.ceil(filteredCustomers.length / customersPerPage)}
                            </strong>{" "}
                            ({filteredCustomers.length} Total Customers)
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              disabled={customersPage === 1}
                              onClick={() => setCustomersPage((p) => Math.max(1, p - 1))}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition shadow-2xs"
                            >
                              Previous
                            </button>
                            <button
                              disabled={customersPage >= Math.ceil(filteredCustomers.length / customersPerPage)}
                              onClick={() => setCustomersPage((p) => p + 1)}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition shadow-2xs"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* 6. EXPENSES TAB                                          */}
              {/* ========================================================= */}
              {activeTab === "expenses" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  {/* Integrated Header Toolbar */}
                  <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search expense title, number..."
                          value={expensesSearch}
                          onChange={(e) => {
                            setExpensesSearch(e.target.value);
                            setExpensesPage(1);
                          }}
                          className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4455DF] focus:bg-white text-slate-800 placeholder-slate-400 font-medium transition-all"
                        />
                        {expensesSearch && (
                          <button
                            onClick={() => {
                              setExpensesSearch("");
                              setExpensesPage(1);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {expenseCategories.length > 0 && (
                        <select
                          value={expensesCategoryFilter}
                          onChange={(e) => {
                            setExpensesCategoryFilter(e.target.value);
                            setExpensesPage(1);
                          }}
                          className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                        >
                          <option value="all">All Categories ({expenses.length})</option>
                          {expenseCategories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                      <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200/80">
                        <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">Total Outflow:</span>
                        <span className="text-xs sm:text-sm font-black font-mono text-rose-700">
                          {formatCurrency(metrics.totalExpenses)}
                        </span>
                      </div>
                      <span className="text-slate-400 text-xs hidden sm:inline">
                        {filteredExpenses.length} of {expenses.length} Records
                      </span>
                    </div>
                  </div>

                  {filteredExpenses.length === 0 ? (
                    <div className="text-center py-16">
                      <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-600">No expenses found.</p>
                      <p className="text-xs text-slate-400 mt-1">Try clearing search filters.</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[700px] table-fixed">
                          <thead className="bg-slate-50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                            <tr>
                              <th className="py-3 px-4 w-[30%]">Expense Title / Description</th>
                              <th className="py-3 px-4 w-[18%]">Category</th>
                              <th className="py-3 px-4 w-[16%]">Expense No</th>
                              <th className="py-3 px-4 w-[18%]">Date</th>
                              <th className="py-3 px-4 w-[18%] text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {paginatedExpenses.map((e) => {
                              const amount = Number(e.amount ?? e.totalAmount ?? e.paidAmount ?? 0);
                              return (
                                <tr key={e.id} className="hover:bg-indigo-50/30 transition-colors">
                                  <td className="py-3.5 px-4">
                                    <div className="font-bold text-slate-900 text-sm">
                                      {e.expenseName || e.name || e.title || "Expense"}
                                    </div>
                                    {e.advanceNotes && (
                                      <div className="text-[10px] text-slate-400 italic mt-0.5">
                                        {e.advanceNotes}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className="px-2.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-semibold">
                                      {e.expenseType || e.category || "General"}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                                    #{e.expenseNumber || e.billNumber || e.referenceNumber || e.id.slice(0, 6)}
                                  </td>
                                  <td className="py-3.5 px-4 text-xs text-slate-500">
                                    {formatDate(e.timestamp || e.date || e.createdAt)}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-black text-rose-600 text-sm font-mono">
                                    {formatCurrency(amount)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {filteredExpenses.length > expensesPerPage && (
                        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                          <span>
                            Showing Page <strong className="text-slate-800">{expensesPage}</strong> of{" "}
                            <strong className="text-slate-800">
                              {Math.ceil(filteredExpenses.length / expensesPerPage)}
                            </strong>{" "}
                            ({filteredExpenses.length} Total Expenses)
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              disabled={expensesPage === 1}
                              onClick={() => setExpensesPage((p) => Math.max(1, p - 1))}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition shadow-2xs"
                            >
                              Previous
                            </button>
                            <button
                              disabled={expensesPage >= Math.ceil(filteredExpenses.length / expensesPerPage)}
                              onClick={() => setExpensesPage((p) => p + 1)}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition shadow-2xs"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
