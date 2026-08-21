"use client";

import { useEffect, useState } from "react";
import { Megaphone, Send, CheckCircle2, Trash2, Clock } from "lucide-react";
import { collection, addDoc, onSnapshot, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function BroadcastPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [broadcasts, setBroadcasts] = useState([]);
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const { hasEditAccess } = useAuth();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "broadcasts"), (snapshot) => {
      setBroadcasts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSending(true);
    setSentSuccess(false);
    try {
      await addDoc(collection(db, "broadcasts"), {
        title: title.trim(),
        message: message.trim(),
        targetAudience,
        createdAt: serverTimestamp(),
      });
      setTitle("");
      setMessage("");
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 4000);
    } catch (err) {
      console.error("Error sending broadcast:", err);
      alert("Failed to send broadcast announcement: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteBroadcast = async (id) => {
    if (!confirm("Are you sure you want to delete this broadcast log?")) return;
    try {
      await deleteDoc(doc(db, "broadcasts", id));
    } catch (err) {
      console.error("Error deleting broadcast:", err);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Broadcast Announcements</h1>
        <p className="text-xs text-slate-500 font-medium">Push global announcements, feature releases, and offer notifications to store owners</p>
      </div>

      {sentSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Broadcast announcement sent successfully to all target store owners!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Create Form */}
        {hasEditAccess && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-[#4455DF]"></div>
              
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center">
                <Bell className="w-4 h-4 mr-2 text-[#4455DF]" />
                Compose Notice
              </h2>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Audience</label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4455DF]/20 transition-all"
                  >
                    <option value="all">All Registered Store Owners</option>
                    <option value="active">Active Plan Subscribers Only</option>
                    <option value="trial">Free Trial Users</option>
                    <option value="expired">Expired Store Accounts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Announcement Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4455DF]/20 transition-all"
                    placeholder="e.g. 🎉 New Feature Alert!"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Message Content</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4455DF]/20 transition-all resize-none"
                    placeholder="Enter the broadcast message..."
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full py-3 bg-[#4455DF] hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sending ? "Sending..." : "Publish Broadcast"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Right Column: History */}
        <div className={hasEditAccess ? "lg:col-span-2 space-y-4" : "lg:col-span-3 space-y-4"}>
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Broadcast History Log</h3>

            {broadcasts.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No broadcast announcements sent yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {broadcasts.map((b) => (
                  <div key={b.id} className="py-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-[#4455DF]">
                          {b.targetAudience || "all"}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm">{b.title}</h4>
                      </div>
                      <p className="text-xs text-slate-600 whitespace-pre-wrap">{b.message}</p>
                      <span className="text-[10px] text-slate-400 block">{formatDate(b.createdAt)}</span>
                    </div>

                    {hasEditAccess && (
                      <button
                        onClick={() => handleDeleteBroadcast(b.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-4 flex-shrink-0"
                        title="Delete Broadcast"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
