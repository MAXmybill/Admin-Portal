"use client";

import { useEffect, useState } from "react";
import { X, Package, ShoppingCart, Users, UserCheck, DollarSign, Building2, Calendar, ShieldCheck, Tag } from "lucide-react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function StoreDetailModal({ store, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [staff, setStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!store?.id) return;

    async function fetchSubcollections() {
      setLoading(true);
      try {
        // 1. Fetch Items / Products (check both subcollection names)
        let itemsList = [];
        try {
          const itemsSnap = await getDocs(query(collection(db, "store", store.id, "items"), limit(30)));
          itemsList = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch (_) {}

        if (itemsList.length === 0) {
          try {
            const prodSnap = await getDocs(query(collection(db, "store", store.id, "products"), limit(30)));
            itemsList = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          } catch (_) {}
        }
        setProducts(itemsList);

        // 2. Fetch Sales / Bills
        let salesList = [];
        try {
          const salesSnap = await getDocs(query(collection(db, "store", store.id, "sales"), limit(30)));
          salesList = salesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch (_) {}

        if (salesList.length === 0) {
          try {
            const billsSnap = await getDocs(query(collection(db, "store", store.id, "bills"), limit(30)));
            salesList = billsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          } catch (_) {}
        }
        setSales(salesList);

        // 3. Fetch Staff (from top-level users collection where storeId matches OR subcollection)
        let staffList = [];
        try {
          const usersSnap = await getDocs(query(collection(db, "users"), where("storeId", "==", store.id)));
          staffList = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch (_) {}

        if (staffList.length === 0) {
          try {
            const staffSnap = await getDocs(collection(db, "store", store.id, "staff"));
            staffList = staffSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          } catch (_) {}
        }
        setStaff(staffList);

        // 4. Fetch Customers
        try {
          const custSnap = await getDocs(query(collection(db, "store", store.id, "customers"), limit(30)));
          setCustomers(custSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (_) {}

        // 5. Fetch Expenses
        try {
          const expSnap = await getDocs(query(collection(db, "store", store.id, "expenses"), limit(30)));
          setExpenses(expSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (_) {}
      } catch (err) {
        console.error("Error fetching store data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSubcollections();
  }, [store?.id]);

  if (!store) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1E255E] text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4455DF] to-[#F07C23] flex items-center justify-center text-white font-extrabold text-xl shadow-lg">
              {store.businessName ? store.businessName[0].toUpperCase() : "S"}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">{store.businessName || "Unnamed Store"}</h2>
              <p className="text-xs text-indigo-200">Store ID: {store.id} • Registered {formatDate(store.createdAt)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex space-x-2 overflow-x-auto">
          {[
            { id: "overview", label: "Overview", icon: Building2 },
            { id: "products", label: `Products (${products.length})`, icon: Package },
            { id: "sales", label: `Sales (${sales.length})`, icon: ShoppingCart },
            { id: "staff", label: `Staff (${staff.length})`, icon: Users },
            { id: "customers", label: `Customers (${customers.length})`, icon: UserCheck },
            { id: "expenses", label: `Expenses (${expenses.length})`, icon: DollarSign },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#4455DF] text-white shadow-md shadow-indigo-500/30"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin w-8 h-8 border-4 border-[#4455DF] border-t-transparent rounded-full"></div>
              <p className="text-xs text-slate-500 font-semibold mt-3">Fetching live store data from Firestore...</p>
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Store Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Business Name:</span> <span className="font-bold text-slate-800">{store.businessName || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Owner Name:</span> <span className="font-semibold text-slate-800">{store.ownerName || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Phone:</span> <span className="font-semibold text-slate-800">{store.phone || store.mobile || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Email:</span> <span className="font-semibold text-slate-800">{store.email || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">GST Number:</span> <span className="font-mono text-slate-800">{store.gstin || store.gstNumber || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Address:</span> <span className="font-semibold text-slate-800">{store.address || "N/A"}</span></div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Subscription</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center"><span className="text-slate-500">Plan Tier:</span> <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-100 text-[#4455DF]">{store.plan || "Free"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Account Status:</span> <span className={`font-bold ${store.isActive !== false ? "text-emerald-600" : "text-rose-600"}`}>{store.isActive !== false ? "Active" : "Blocked/Inactive"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Expiry Date:</span> <span className="font-semibold text-slate-800">{formatDate(store.planExpiryDate)}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* PRODUCTS TAB */}
              {activeTab === "products" && (
                <div>
                  {products.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-sm">No items found in this store catalog.</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-xs font-bold text-slate-600 uppercase border-b border-slate-200">
                          <tr>
                            <th className="p-3">Product Name</th>
                            <th className="p-3">Code / Barcode</th>
                            <th className="p-3">Sales Price</th>
                            <th className="p-3">Purchase Price</th>
                            <th className="p-3">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {products.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="p-3 font-semibold text-slate-800">{item.name || item.itemName || "Unnamed Item"}</td>
                              <td className="p-3 font-mono text-xs text-slate-500">{item.code || item.barcode || item.id}</td>
                              <td className="p-3 font-bold text-[#4455DF]">{formatCurrency(item.salesPrice || item.price || 0)}</td>
                              <td className="p-3 text-slate-500">{formatCurrency(item.purchasePrice || 0)}</td>
                              <td className="p-3 font-semibold text-emerald-600">{item.stock ?? item.quantity ?? "N/A"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SALES TAB */}
              {activeTab === "sales" && (
                <div>
                  {sales.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-sm">No sale records available for this store.</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-xs font-bold text-slate-600 uppercase border-b border-slate-200">
                          <tr>
                            <th className="p-3">Bill No</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Payment Mode</th>
                            <th className="p-3">Total Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-slate-50">
                              <td className="p-3 font-mono font-bold text-slate-800">#{sale.billNo || sale.invoiceNo || sale.id.slice(0, 6)}</td>
                              <td className="p-3 text-xs text-slate-500">{formatDate(sale.createdAt || sale.date)}</td>
                              <td className="p-3 text-slate-700">{sale.customerName || sale.customer || "Walk-in"}</td>
                              <td className="p-3 font-semibold text-slate-600">{sale.paymentMode || "Cash"}</td>
                              <td className="p-3 font-extrabold text-emerald-600">{formatCurrency(sale.totalAmount || sale.grandTotal || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* STAFF TAB */}
              {activeTab === "staff" && (
                <div>
                  {staff.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-sm">No staff members registered under this store.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {staff.map((s) => (
                        <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-[#4455DF] flex items-center justify-center font-bold">
                            {s.name ? s.name[0].toUpperCase() : "U"}
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-800 text-sm">{s.name || "Unnamed Staff"}</h5>
                            <p className="text-xs text-slate-500">{s.phone || s.email || "No contact info"}</p>
                            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {s.role || "Staff"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CUSTOMERS TAB */}
              {activeTab === "customers" && (
                <div>
                  {customers.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-sm">No customer contacts saved for this store.</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-xs font-bold text-slate-600 uppercase border-b border-slate-200">
                          <tr>
                            <th className="p-3">Customer Name</th>
                            <th className="p-3">Phone</th>
                            <th className="p-3">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {customers.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50">
                              <td className="p-3 font-semibold text-slate-800">{c.name || c.customerName}</td>
                              <td className="p-3 text-slate-600">{c.phone || "N/A"}</td>
                              <td className="p-3 font-bold text-slate-700">{formatCurrency(c.balance || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* EXPENSES TAB */}
              {activeTab === "expenses" && (
                <div>
                  {expenses.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-sm">No expenses recorded for this store.</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-xs font-bold text-slate-600 uppercase border-b border-slate-200">
                          <tr>
                            <th className="p-3">Title / Description</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {expenses.map((e) => (
                            <tr key={e.id} className="hover:bg-slate-50">
                              <td className="p-3 font-semibold text-slate-800">{e.title || e.name || "Expense"}</td>
                              <td className="p-3 text-slate-600">{e.category || "General"}</td>
                              <td className="p-3 text-xs text-slate-500">{formatDate(e.date || e.createdAt)}</td>
                              <td className="p-3 font-bold text-rose-600">{formatCurrency(e.amount || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
