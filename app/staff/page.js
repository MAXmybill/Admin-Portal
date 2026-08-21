"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, deleteDoc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Users, Search, Filter, Shield, Edit, X, Save, Lock, Unlock, Mail, Phone, Store, Settings, LifeBuoy, BookOpen, Megaphone, Trash2 } from "lucide-react";
import { db, secondaryAuth } from "@/lib/firebase";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function StaffPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  
  const { isSuperAdmin, loading: authLoading } = useAuth();
  
  // IAM specific state
  const [accessLevel, setAccessLevel] = useState("view");
  const [permissions, setPermissions] = useState({
    canManageStores: false,
    canManageUsers: false,
    canManageSupport: false,
    canManageKnowledge: false,
    canModifySettings: false,
    canSendBroadcasts: false,
  });
  
  const [saving, setSaving] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '' });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "companystaff"), (snapshot) => {
      setUsers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleOpenEditUser = (u) => {
    setEditUser(u);
    setAccessLevel(u.accessLevel || "view");
    setPermissions({
      canManageStores: u.permissions?.canManageStores || false,
      canManageUsers: u.permissions?.canManageUsers || false,
      canManageSupport: u.permissions?.canManageSupport || false,
      canManageKnowledge: u.permissions?.canManageKnowledge || false,
      canModifySettings: u.permissions?.canModifySettings || false,
      canSendBroadcasts: u.permissions?.canSendBroadcasts || false,
    });
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editUser) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "companystaff", editUser.id), {
        accessLevel,
        permissions: accessLevel === "edit" ? permissions : {
          canManageStores: false,
          canManageUsers: false,
          canManageSupport: false,
          canManageKnowledge: false,
          canModifySettings: false,
          canSendBroadcasts: false,
        },
        updatedAt: serverTimestamp(),
      });
      setEditUser(null);
    } catch (err) {
      console.error("Error updating user permissions:", err);
      alert("Failed to save permissions: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePermission = (field) => {
    setPermissions(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const docRef = await collection(db, "companystaff");
      import("firebase/firestore").then(async ({ addDoc }) => {
          await addDoc(docRef, {
            name: newStaff.name,
            email: newStaff.email.trim().toLowerCase(),
            role: "companystaff",
            accessLevel: "view",
            permissions: {
                canManageStores: false,
                canManageUsers: false,
                canManageSupport: false,
                canManageKnowledge: false,
                canModifySettings: false,
                canSendBroadcasts: false,
            },
            isBlocked: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setIsAddModalOpen(false);
          setNewStaff({ name: '', email: '' });
          setSaving(false);
      });
    } catch (err) {
      console.error("Error adding staff:", err);
      alert("Failed to add staff: " + err.message);
      setSaving(false);
    }
  };

  const handleToggleBlockStaff = async (userId, currentBlockedState) => {
    try {
      await updateDoc(doc(db, "companystaff", userId), {
        isBlocked: !currentBlockedState,
      });
    } catch (err) {
      console.error("Error toggling staff status:", err);
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDeleteStaff = async (userId) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;
    try {
      await deleteDoc(doc(db, "companystaff", userId));
    } catch (err) {
      console.error("Error deleting staff:", err);
      alert("Failed to delete staff: " + err.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const searchMatch = (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
                        (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
                        (u.phone || "").includes(search) ||
                        (u.storeId || "").toLowerCase().includes(search.toLowerCase());
    
    return searchMatch;
  });

  if (!authLoading && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Shield className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Access Denied</h2>
        <p className="text-sm text-slate-500 mt-2">Only Super Admins can access the Company Staff directory.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Company Staff & IAM Controls</h1>
          <p className="text-xs text-slate-500 font-medium">Manage staff access levels and granular permissions</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search staff by name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4455DF]"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs w-full md:w-auto">
          {isSuperAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full md:w-auto justify-center px-4 py-2 bg-[#4455DF] text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md flex items-center space-x-1"
            >
              <span>+ Add Staff</span>
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-[#4455DF] border-t-transparent rounded-full"></div>
            <p className="text-xs text-slate-500 font-semibold mt-3">Loading staff records...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">No staff found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-extrabold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-4">Staff Details</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Access Level</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Permissions</th>
                  {isSuperAdmin && <th className="p-4 text-right">IAM Settings</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-[#4455DF] flex items-center justify-center font-bold text-sm">
                          {user.name ? user.name[0].toUpperCase() : "U"}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900">{user.name || "Unnamed Staff"}</div>
                          <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span>{user.email || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                        {user.role || "Owner"}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          user.accessLevel === "edit"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {user.accessLevel === "edit" ? "Full Edit" : "View Only"}
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
                        {user.isBlocked ? "Deactivated" : "Active"}
                      </span>
                    </td>
                    
                    <td className="p-4">
                       {user.accessLevel === "edit" && user.permissions ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {user.permissions?.canManageStores && <div title="Stores" className="p-1 bg-slate-100 rounded text-slate-500"><Store className="w-3.5 h-3.5"/></div>}
                            {user.permissions?.canManageUsers && <div title="Users" className="p-1 bg-slate-100 rounded text-slate-500"><Users className="w-3.5 h-3.5"/></div>}
                            {user.permissions?.canManageSupport && <div title="Support" className="p-1 bg-slate-100 rounded text-slate-500"><LifeBuoy className="w-3.5 h-3.5"/></div>}
                            {user.permissions?.canManageKnowledge && <div title="Knowledge Base" className="p-1 bg-slate-100 rounded text-slate-500"><BookOpen className="w-3.5 h-3.5"/></div>}
                            {user.permissions?.canModifySettings && <div title="Settings" className="p-1 bg-slate-100 rounded text-slate-500"><Settings className="w-3.5 h-3.5"/></div>}
                            {user.permissions?.canSendBroadcasts && <div title="Broadcasts" className="p-1 bg-slate-100 rounded text-slate-500"><Megaphone className="w-3.5 h-3.5"/></div>}
                          </div>
                       ) : (
                          <span className="text-xs text-slate-400 italic">Restricted</span>
                       )}
                    </td>
                    
                    {isSuperAdmin && (
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditUser(user)}
                          title="Manage IAM Permissions"
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-[#4455DF] hover:text-white text-[#4455DF] transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleBlockStaff(user.id, user.isBlocked)}
                          title={user.isBlocked ? "Activate Staff" : "Deactivate Staff"}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.isBlocked
                              ? "bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600"
                              : "bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-600"
                          }`}
                        >
                          {user.isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(user.id)}
                          title="Delete Staff Permanently"
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

      {/* IAM Modal */}
      {editUser && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">IAM Permissions</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Manage access for {editUser.name}</p>
              </div>
              <button onClick={() => setEditUser(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-6">
              
              {/* Access Level Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-3">Master Access Level</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAccessLevel("view")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${accessLevel === "view" ? "bg-white text-[#4455DF] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    View Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccessLevel("edit")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${accessLevel === "edit" ? "bg-white text-[#4455DF] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Full Edit
                  </button>
                </div>
              </div>

              {/* Granular Permissions (Only show if Edit is selected) */}
              <div className={`space-y-3 transition-opacity ${accessLevel === "view" ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                <label className="block text-xs font-bold text-slate-600 uppercase">Specific Features</label>
                
                <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                  <input type="checkbox" checked={permissions.canManageStores} onChange={() => handleTogglePermission("canManageStores")} className="w-4 h-4 text-[#4455DF] rounded border-slate-300 focus:ring-[#4455DF]" />
                  <span className="text-sm font-semibold text-slate-700">Can Manage Stores</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                  <input type="checkbox" checked={permissions.canManageUsers} onChange={() => handleTogglePermission("canManageUsers")} className="w-4 h-4 text-[#4455DF] rounded border-slate-300 focus:ring-[#4455DF]" />
                  <span className="text-sm font-semibold text-slate-700">Can Manage Users</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                  <input type="checkbox" checked={permissions.canManageSupport} onChange={() => handleTogglePermission("canManageSupport")} className="w-4 h-4 text-[#4455DF] rounded border-slate-300 focus:ring-[#4455DF]" />
                  <span className="text-sm font-semibold text-slate-700">Can Manage Support Tickets</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                  <input type="checkbox" checked={permissions.canManageKnowledge} onChange={() => handleTogglePermission("canManageKnowledge")} className="w-4 h-4 text-[#4455DF] rounded border-slate-300 focus:ring-[#4455DF]" />
                  <span className="text-sm font-semibold text-slate-700">Can Manage Knowledge Base</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                  <input type="checkbox" checked={permissions.canModifySettings} onChange={() => handleTogglePermission("canModifySettings")} className="w-4 h-4 text-[#4455DF] rounded border-slate-300 focus:ring-[#4455DF]" />
                  <span className="text-sm font-semibold text-slate-700">Can Modify Settings</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                  <input type="checkbox" checked={permissions.canSendBroadcasts} onChange={() => handleTogglePermission("canSendBroadcasts")} className="w-4 h-4 text-[#4455DF] rounded border-slate-300 focus:ring-[#4455DF]" />
                  <span className="text-sm font-semibold text-slate-700">Can Send Broadcasts</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
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
                  <span>{saving ? "Saving..." : "Save Permissions"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Staff Modal */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Add New Staff</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Create a new staff member account</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-[#4455DF] hover:bg-indigo-700 rounded-xl shadow-md"
                >
                  {saving ? "Adding..." : "Add Staff Member"}
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
