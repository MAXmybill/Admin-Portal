"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { 
  CreditCard, 
  Save, 
  RefreshCw, 
  Rocket, 
  Briefcase, 
  BarChart3, 
  GraduationCap, 
  CheckCircle2, 
  Globe2, 
  Lock, 
  ShieldAlert,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function PricingManagementPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [prices, setPrices] = useState({
    maxOneMonthly: 199,
    maxOneYearly: 1910,
    maxPlusMonthly: 499,
    maxPlusYearly: 4790,
    maxProMonthly: 999,
    maxProYearly: 9590,
  });

  const [lastUpdated, setLastUpdated] = useState(null);
  const [updatedBy, setUpdatedBy] = useState(null);

  const { isSuperAdmin, user, userDoc, loading: authLoading } = useAuth();
  
  // STRICT PERMISSION RULE:
  // Only Superadmin OR staff with (accessLevel === "edit" AND permissions.canManagePricing === true)
  const isOwner = Boolean(isSuperAdmin);
  const isAuthorizedStaff = Boolean(
    userDoc?.accessLevel === "edit" && userDoc?.permissions?.canManagePricing === true
  );
  const canModifyPricing = isOwner || isAuthorizedStaff;

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "system_config", "subscription_plans");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const plans = data.plans || {};
        setPrices({
          maxOneMonthly: plans["MAX One"]?.priceMonthly ?? 199,
          maxOneYearly: plans["MAX One"]?.priceYearly ?? 1910,
          maxPlusMonthly: plans["MAX Plus"]?.priceMonthly ?? 499,
          maxPlusYearly: plans["MAX Plus"]?.priceYearly ?? 4790,
          maxProMonthly: plans["MAX Pro"]?.priceMonthly ?? 999,
          maxProYearly: plans["MAX Pro"]?.priceYearly ?? 9590,
        });
        if (data.updatedAt) {
          setLastUpdated(data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt));
        }
        setUpdatedBy(data.updatedBy || null);
      }
    } catch (err) {
      console.error("Error fetching pricing:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canModifyPricing) {
      alert("Access Denied: You do not have permission to modify subscription prices.");
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    try {
      const docRef = doc(db, "system_config", "subscription_plans");
      await setDoc(
        docRef,
        {
          baseCurrency: "INR",
          updatedAt: serverTimestamp(),
          updatedBy: user?.email || "superadmin",
          plans: {
            "Starter": {
              name: "Starter",
              priceMonthly: 0,
              priceYearly: 0,
            },
            "MAX One": {
              name: "MAX One",
              priceMonthly: Number(prices.maxOneMonthly),
              priceYearly: Number(prices.maxOneYearly),
            },
            "MAX Plus": {
              name: "MAX Plus",
              priceMonthly: Number(prices.maxPlusMonthly),
              priceYearly: Number(prices.maxPlusYearly),
            },
            "MAX Pro": {
              name: "MAX Pro",
              priceMonthly: Number(prices.maxProMonthly),
              priceYearly: Number(prices.maxProYearly),
            },
          },
        },
        { merge: true }
      );

      setSaveSuccess(true);
      setLastUpdated(new Date());
      setUpdatedBy(user?.email || "superadmin");
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err) {
      console.error("Error saving pricing:", err);
      alert("Failed to update pricing: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Helper to calculate approx USD for preview ($1 ≈ ₹86.5)
  const toUSD = (inr) => (Number(inr) * 0.0116).toFixed(2);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Subscription Plans & Pricing
            </h1>
            {canModifyPricing ? (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md text-[10px] uppercase font-extrabold flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Full Edit Access
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md text-[10px] uppercase font-extrabold flex items-center border border-amber-300">
                <Lock className="w-3 h-3 mr-1" /> View Only (Locked)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Global baseline subscription prices in INR (₹). Foreign stores automatically see local converted currencies.
          </p>
        </div>

        <button
          onClick={fetchPricing}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Reload</span>
        </button>
      </div>

      {/* Lock Notice for View-Only Staff */}
      {!canModifyPricing && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 text-amber-900">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-extrabold text-amber-950">You are in View-Only Mode</p>
            <p className="text-amber-800/80 mt-0.5">
              Your staff account does not have permission to modify pricing. All fields are locked. Only the Superadmin or staff with &quot;Can Manage Subscription Plans &amp; Pricing&quot; permission can edit.
            </p>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-3xl p-5 shadow-sm flex items-start space-x-4">
        <div className="w-10 h-10 rounded-2xl bg-[#4455DF] text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
          <Globe2 className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-extrabold text-indigo-950">Real-Time Mobile & Web Synchronization</h3>
          <p className="text-xs text-indigo-900/70 mt-0.5 leading-relaxed">
            When prices are published, all mobile apps and POS clients update live from Firestore.
          </p>
          {lastUpdated && (
            <p className="text-[11px] font-semibold text-indigo-600 mt-2">
              Last published: {lastUpdated.toLocaleString()} {updatedBy ? `by ${updatedBy}` : ""}
            </p>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center space-x-3 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Plan pricing updated and published successfully to Firestore! All mobile apps will now reflect these prices.</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Starter Plan (Free) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                    <Rocket className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Starter Plan</h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                      Free Tier
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500">Free forever for single admin users with basic POS billing and purchases.</p>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-xs font-bold text-slate-700">Fixed Cost: ₹0 (Free)</p>
                <p className="text-[11px] text-slate-400">Cannot be modified.</p>
              </div>
            </div>
          </div>

          {/* MAX One Plan */}
          <div className={`bg-white rounded-3xl p-6 border shadow-sm space-y-4 transition ${canModifyPricing ? "border-slate-200 hover:border-indigo-300" : "border-slate-100 opacity-90"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">MAX One Plan</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                    1 Admin Account
                  </span>
                </div>
              </div>
              {!canModifyPricing && <Lock className="w-4 h-4 text-slate-400" />}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Monthly Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={prices.maxOneMonthly}
                    onChange={(e) => setPrices({ ...prices, maxOneMonthly: e.target.value })}
                    disabled={!canModifyPricing}
                    readOnly={!canModifyPricing}
                    className={`w-full text-xs border rounded-xl py-2.5 pl-7 pr-3 font-bold text-slate-800 ${
                      canModifyPricing 
                        ? "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-[#4455DF]" 
                        : "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-500"
                    }`}
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">≈ ${toUSD(prices.maxOneMonthly)} USD</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Yearly Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={prices.maxOneYearly}
                    onChange={(e) => setPrices({ ...prices, maxOneYearly: e.target.value })}
                    disabled={!canModifyPricing}
                    readOnly={!canModifyPricing}
                    className={`w-full text-xs border rounded-xl py-2.5 pl-7 pr-3 font-bold text-slate-800 ${
                      canModifyPricing 
                        ? "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-[#4455DF]" 
                        : "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-500"
                    }`}
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">≈ ${toUSD(prices.maxOneYearly)} USD</span>
              </div>
            </div>
          </div>

          {/* MAX Plus Plan */}
          <div className={`bg-white rounded-3xl p-6 border shadow-sm space-y-4 relative transition ${canModifyPricing ? "border-2 border-purple-200 hover:border-purple-300" : "border-slate-100 opacity-90"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">MAX Plus Plan</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-200">
                    <Sparkles className="w-2.5 h-2.5 mr-1" /> Most Popular (Admin + 2 Staff)
                  </span>
                </div>
              </div>
              {!canModifyPricing && <Lock className="w-4 h-4 text-slate-400" />}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Monthly Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={prices.maxPlusMonthly}
                    onChange={(e) => setPrices({ ...prices, maxPlusMonthly: e.target.value })}
                    disabled={!canModifyPricing}
                    readOnly={!canModifyPricing}
                    className={`w-full text-xs border rounded-xl py-2.5 pl-7 pr-3 font-bold text-slate-800 ${
                      canModifyPricing 
                        ? "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-purple-600" 
                        : "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-500"
                    }`}
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">≈ ${toUSD(prices.maxPlusMonthly)} USD</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Yearly Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={prices.maxPlusYearly}
                    onChange={(e) => setPrices({ ...prices, maxPlusYearly: e.target.value })}
                    disabled={!canModifyPricing}
                    readOnly={!canModifyPricing}
                    className={`w-full text-xs border rounded-xl py-2.5 pl-7 pr-3 font-bold text-slate-800 ${
                      canModifyPricing 
                        ? "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-purple-600" 
                        : "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-500"
                    }`}
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">≈ ${toUSD(prices.maxPlusYearly)} USD</span>
              </div>
            </div>
          </div>

          {/* MAX Pro Plan */}
          <div className={`bg-white rounded-3xl p-6 border shadow-sm space-y-4 transition ${canModifyPricing ? "border-slate-200 hover:border-emerald-300" : "border-slate-100 opacity-90"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">MAX Pro Plan</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                    Admin + 9 Staff Users
                  </span>
                </div>
              </div>
              {!canModifyPricing && <Lock className="w-4 h-4 text-slate-400" />}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Monthly Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={prices.maxProMonthly}
                    onChange={(e) => setPrices({ ...prices, maxProMonthly: e.target.value })}
                    disabled={!canModifyPricing}
                    readOnly={!canModifyPricing}
                    className={`w-full text-xs border rounded-xl py-2.5 pl-7 pr-3 font-bold text-slate-800 ${
                      canModifyPricing 
                        ? "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-emerald-600" 
                        : "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-500"
                    }`}
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">≈ ${toUSD(prices.maxProMonthly)} USD</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Yearly Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={prices.maxProYearly}
                    onChange={(e) => setPrices({ ...prices, maxProYearly: e.target.value })}
                    disabled={!canModifyPricing}
                    readOnly={!canModifyPricing}
                    className={`w-full text-xs border rounded-xl py-2.5 pl-7 pr-3 font-bold text-slate-800 ${
                      canModifyPricing 
                        ? "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-emerald-600" 
                        : "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-500"
                    }`}
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">≈ ${toUSD(prices.maxProYearly)} USD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save and Publish Button: ONLY RENDER IF USER HAS PERMISSION */}
        {canModifyPricing ? (
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-4 bg-[#4455DF] hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-indigo-500/30 flex items-center space-x-2 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Publishing Changes to All Apps...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Publish Plan Prices</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="p-4 bg-slate-100 rounded-2xl text-center text-xs text-slate-500 font-bold flex items-center justify-center space-x-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Editing and publishing is disabled in View-Only mode. Contact Superadmin to request edit permissions.</span>
          </div>
        )}
      </form>
    </div>
  );
}
