"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, setDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { Store, Search, Filter, ShieldCheck, ShieldAlert, Edit, Eye, Plus, Calendar, Check, Lock, Unlock, X, Save } from "lucide-react";
import { db } from "@/lib/firebase";
import StoreDetailModal from "@/components/StoreDetailModal";
import { formatDate } from "@/lib/utils";

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedStore, setSelectedStore] = useState(null);
  const [editStore, setEditStore] = useState(null);
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit Plan Form State
  const [editPlan, setEditPlan] = useState("");
  const [saving, setSaving] = useState(false);

  // New Store Form State
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newGstin, setNewGstin] = useState("");
  const [newPlan, setNewPlan] = useState("MAX Pro");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "store"), (snapshot) => {
      setStores(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

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
  };

  const handleSaveStorePlan = async (e) => {
    e.preventDefault();
    if (!editStore) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "store", editStore.id), {
        plan: editPlan,
      });
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
    const statusMatch = filterStatus === "all" ||
                        (filterStatus === "active" && s.isActive !== false) ||
                        (filterStatus === "blocked" && s.isActive === false);
    return nameMatch && planMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Registered Stores Directory</h1>
          <p className="text-xs text-slate-500 font-medium">Manage POS store accounts, update plan subscriptions, and inspect live store data</p>
        </div>

        <button
          onClick={() => setIsCreatingStore(true)}
          className="px-5 py-2.5 bg-[#4455DF] hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center space-x-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Store</span>
        </button>
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
              <option value="blocked">Blocked Only</option>
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
        ) : filteredStores.length === 0 ? (
          <div className="py-16 text-center">
            <Store className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">No matching stores found in Firestore.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-extrabold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-4">Business Store Name</th>
                  <th className="p-4">Owner & Contact</th>
                  <th className="p-4">Plan & Expiry</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4 text-right">Super Admin Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredStores.map((store) => (
                  <tr key={store.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4455DF] to-[#F07C23] text-white flex items-center justify-center font-black text-sm shadow-md">
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
                      <div className="text-xs text-slate-500">{store.phone || store.mobile || "No phone"}</div>
                      <div className="text-[10px] text-slate-400">{store.email || "No email"}</div>
                    </td>

                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-[#4455DF] border border-indigo-100 block w-max">
                        {store.plan || "Free"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 block">Exp: {formatDate(store.planExpiryDate)}</span>
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

                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedStore(store)}
                        title="Inspect Store Data"
                        className="p-2 rounded-xl bg-indigo-50 hover:bg-[#4455DF] hover:text-white text-[#4455DF] transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(store)}
                        title="Edit Subscription Plan"
                        className="p-2 rounded-xl bg-amber-50 hover:bg-[#F07C23] hover:text-white text-[#F07C23] transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(store.id, store.isActive)}
                        title={store.isActive !== false ? "Block Store" : "Activate Store"}
                        className={`p-2 rounded-xl transition-colors ${
                          store.isActive !== false
                            ? "bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600"
                            : "bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600"
                        }`}
                      >
                        {store.isActive !== false ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
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
      {editStore && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
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
        </div>
      )}

      {/* Register New Store Modal */}
      {isCreatingStore && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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
        </div>
      )}
    </div>
  );
}
