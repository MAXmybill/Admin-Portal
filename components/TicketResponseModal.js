"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Send, LifeBuoy, CheckCircle2, Clock } from "lucide-react";
import { doc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDate } from "@/lib/utils";

export default function TicketResponseModal({ ticket, onClose, onRefresh, hasEditAccess = true }) {
  const [replyText, setReplyText] = useState("");
  const [status, setStatus] = useState(ticket?.status || "open");
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!ticket || !mounted) return null;

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && status === ticket.status) return;

    setSending(true);
    try {
      const ticketRef = doc(db, "support_requests", ticket.id);
      const updateData = {
        status: status,
        updatedAt: serverTimestamp(),
      };

      if (replyText.trim()) {
        updateData.replies = arrayUnion({
          message: replyText.trim(),
          sender: "superadmin",
          createdAt: new Date().toISOString(),
        });
      }

      await updateDoc(ticketRef, updateData);
      setReplyText("");
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      console.error("Error updating support ticket:", err);
      alert("Failed to submit reply: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1E255E] text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#4455DF] flex items-center justify-center text-white font-bold">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Support Ticket Response</h3>
              <p className="text-xs text-indigo-200">Ticket ID: {ticket.id} • Store: {ticket.storeName || ticket.storeId || "N/A"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-slate-800 text-sm">{ticket.subject || "No Subject"}</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-[#4455DF] uppercase">
                {ticket.priority || "Medium"}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">{ticket.description || ticket.message || "No description provided."}</p>
            <div className="mt-3 text-[10px] text-slate-400 font-semibold flex items-center justify-between">
              <span>Submitted by: {ticket.userEmail || ticket.phone || "Store Owner"}</span>
              <span>{formatDate(ticket.createdAt)}</span>
            </div>
          </div>

          {/* Conversation History */}
          {ticket.replies && ticket.replies.length > 0 && (
            <div className="space-y-3 pt-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Previous Replies</h5>
              {ticket.replies.map((reply, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl text-xs ${
                    reply.sender === "superadmin"
                      ? "bg-indigo-50 border border-indigo-200 text-indigo-900 ml-6"
                      : "bg-slate-100 border border-slate-200 text-slate-800 mr-6"
                  }`}
                >
                  <div className="font-bold mb-1">{reply.sender === "superadmin" ? "Super Admin Response" : "Store Reply"}</div>
                  <p>{reply.message}</p>
                  <span className="block text-[9px] text-slate-400 mt-1">{formatDate(reply.createdAt)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Reply Form */}
          {hasEditAccess ? (
            <form onSubmit={handleSendReply} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Update Ticket Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4455DF]"
                >
                  <option value="open">Open (Unresolved)</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Send Admin Message</label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response to the store owner here..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4455DF]"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-[#4455DF] hover:bg-indigo-700 shadow-md shadow-indigo-500/30 flex items-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{sending ? "Updating..." : "Submit Response"}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors"
              >
                Close Ticket Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
