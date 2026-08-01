"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Wrench, ShieldAlert, Save, RefreshCw, AlertTriangle, Smartphone, BellRing } from "lucide-react";
import { db } from "@/lib/firebase";

export default function SettingsPage() {
  const [maintenance, setMaintenance] = useState(false);
  const [minVersion, setMinVersion] = useState("1.1.0");
  const [alertMessage, setAlertMessage] = useState("");
  const [forceUpdate, setForceUpdate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const docRef = doc(db, "settings", "maintenance");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMaintenance(data.isUnderMaintenance || false);
          setMinVersion(data.minAppVersion || "1.1.0");
          setAlertMessage(data.message || "");
          setForceUpdate(data.forceUpdate || false);
        }
      } catch (err) {
        console.error("Error fetching maintenance settings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "maintenance"), {
        isUnderMaintenance: maintenance,
        minAppVersion: minVersion,
        message: alertMessage,
        forceUpdate: forceUpdate,
        updatedAt: serverTimestamp(),
      });
      alert("System Maintenance & Settings updated successfully!");
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Failed to update settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Maintenance & Global Settings</h1>
        <p className="text-xs text-slate-500 font-medium">Control system locks, minimum app version requirements, and global notice banners</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Maintenance Switch */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Emergency Maintenance Lock</h3>
                <p className="text-xs text-slate-500">Temporarily lock the mobile app for scheduled system upgrades</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={maintenance}
                onChange={(e) => setMaintenance(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          {maintenance && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>WARNING: System maintenance is ON. Mobile users will see a lock screen when opening POS app.</span>
            </div>
          )}
        </div>

        {/* App Version & Force Update */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-[#4455DF] flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Mobile App Version Control</h3>
              <p className="text-xs text-slate-500">Enforce minimum build version required to run POS client</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Minimum Required Version</label>
              <input
                type="text"
                value={minVersion}
                onChange={(e) => setMinVersion(e.target.value)}
                placeholder="1.1.0"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono font-bold text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="block text-xs font-bold text-slate-800">Force Update Modal</span>
                <span className="text-[10px] text-slate-500">Block older app builds until updated</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceUpdate}
                  onChange={(e) => setForceUpdate(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4455DF]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Global Notice Banner */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-[#F07C23] flex items-center justify-center font-bold">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Broadcast Notice Message</h3>
              <p className="text-xs text-slate-500">Banner announcement displayed on store owners' home dashboard</p>
            </div>
          </div>

          <div>
            <textarea
              rows={3}
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              placeholder="e.g. Scheduled server maintenance tonight from 2:00 AM to 3:00 AM IST."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
            ></textarea>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-[#4455DF] hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Updating System Settings..." : "Save System Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
