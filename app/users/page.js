"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Users, Search, Filter, ShieldAlert, ShieldCheck, Lock, Unlock, Mail, Phone, Store, Edit, Trash2, X, Save } from "lucide-react";
import { db } from "@/lib/firebase";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  
  const { hasEditAccess } = useAuth();
  const [editRole, setEditRole] = useState("owner");
  const [editStoreId, setEditStoreId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleToggleBlockUser = async (userId, currentBlockedState) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        isBlocked: currentBlockedState ? false : true,
      });
    } catch (err) {
      console.error("Error toggling user block state:", err);
      alert("Failed to update user state: " + err.message);
    }
  };

  const handleOpenEditUser = (u) => {
    setEditUser(u);
    setEditRole(u.role || "owner");
    setEditStoreId(u.storeId || "");
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editUser) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", editUser.id), {
        role: editRole,
        storeId: editStoreId.trim(),
        updatedAt: serverTimestamp(),
      });
      setEditUser(null);
    } catch (err) {
      console.error("Error updating user profile:", err);
      alert("Failed to save user updates: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUserDoc = async (userId) => {
    if (!confirm("Are you sure you want to delete this user document from Firestore?")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
    } catch (err) {
      console.error("Error deleting user document:", err);
      alert("Failed to delete user document: " + err.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const searchMatch = (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
                        (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
                        (u.phone || "").includes(search) ||
                        (u.storeId || "").toLowerCase().includes(search.toLowerCase());
    const roleMatch = roleFilter === "all" || (u.role || "owner").toLowerCase() === roleFilter.toLowerCase();
    return searchMatch && roleMatch;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
    let dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
    
    if (sortOrder === "newest") return dateB - dateA;
    if (sortOrder === "oldest") return dateA - dateB;
    if (sortOrder === "name_asc") return (a.name || "").localeCompare(b.name || "");
    if (sortOrder === "name_desc") return (b.name || "").localeCompare(a.name || "");
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Platform Users & Store Accounts</h1>
          <p className="text-xs text-slate-500 font-medium">Manage store owners, cashier staff accounts, permissions, and security status</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or store ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4455DF]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-3 text-xs w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-500 uppercase">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4455DF]"
            >
              <option value="all">All Roles</option>
              <option value="owner">Store Owners</option>
              <option value="staff">Staff / Cashiers</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 text-xs w-full sm:w-auto">
            <span className="font-bold text-slate-500 uppercase">Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4455DF]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-[#4455DF] border-t-transparent rounded-full"></div>
            <p className="text-xs text-slate-500 font-semibold mt-3">Fetching user records from Firestore...</p>
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">No users found matching query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-extrabold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-4">User Details</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Store ID</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Registered Date</th>
                  {hasEditAccess && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sortedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-[#4455DF] flex items-center justify-center font-bold text-sm">
                          {user.name ? user.name[0].toUpperCase() : "U"}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900">{user.name || "Unnamed User"}</div>
                          <div className="text-[10px] text-slate-400 font-mono">UID: {user.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="text-xs text-slate-800 flex items-center space-x-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{user.email || "N/A"}</span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{user.phone || "N/A"}</span>
                      </div>
                    </td>

                    <td className="p-4 text-xs font-mono text-indigo-600 font-semibold">
                      {user.storeId ? (
                        <span className="flex items-center space-x-1">
                          <Store className="w-3 h-3 text-indigo-400" />
                          <span>{user.storeId}</span>
                        </span>
                      ) : (
                        "No Store Linked"
                      )}
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                        {user.role || "Owner"}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          user.isBlocked
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {user.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </td>

                    <td className="p-4 text-xs text-slate-500">{formatDate(user.createdAt)}</td>

                    {hasEditAccess && (
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditUser(user)}
                          title="Edit User Data"
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-[#4455DF] hover:text-white text-[#4455DF] transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleBlockUser(user.id, user.isBlocked)}
                          title={user.isBlocked ? "Unblock User" : "Block User"}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.isBlocked
                              ? "bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600"
                              : "bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-600"
                          }`}
                        >
                          {user.isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleDeleteUserDoc(user.id)}
                          title="Delete User Permanently"
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editUser && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Edit User Account</h3>
              <button onClick={() => setEditUser(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Account Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
                >
                  <option value="owner">Store Owner</option>
                  <option value="staff">Staff / Cashier</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Linked Store ID</label>
                <input
                  type="text"
                  value={editStoreId}
                  onChange={(e) => setEditStoreId(e.target.value)}
                  placeholder="Enter store doc ID"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
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
                  <span>{saving ? "Saving..." : "Save User Changes"}</span>
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
