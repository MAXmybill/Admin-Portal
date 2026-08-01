"use client";

import { useEffect, useState } from "react";
import { Megaphone, Send, CheckCircle2, Trash2, Clock } from "lucide-react";
import { collection, addDoc, onSnapshot, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDate } from "@/lib/utils";

export default function BroadcastPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [broadcasts, setBroadcasts] = useState([]);
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

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
    <div className="space-y-8 max-w-4xl">
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

      {/* Compose Form */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4455DF] to-[#F07C23] text-white flex items-center justify-center font-bold shadow-lg">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Compose Broadcast Message</h3>
            <p className="text-xs text-slate-500">Delivered directly to mobile POS app notifications center</p>
          </div>
        </div>

        <form onSubmit={handleSendBroadcast} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Target Audience</label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
            >
              <option value="all">All Registered Store Owners</option>
              <option value="active">Active Plan Subscribers Only</option>
              <option value="trial">Free Trial Users</option>
              <option value="expired">Expired Store Accounts</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Announcement Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 🎉 New Feature Alert: Automatic WhatsApp Invoicing is Live!"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Message Body</label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your announcement details for store owners..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
            ></textarea>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={sending}
              className="px-6 py-3 bg-[#4455DF] hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? "Sending Broadcast..." : "Send Broadcast Now"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Sent Broadcast History */}
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

                <button
                  onClick={() => handleDeleteBroadcast(b.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
