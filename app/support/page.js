"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { LifeBuoy, Search, Filter, MessageSquare, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import TicketResponseModal from "@/components/TicketResponseModal";
import { formatDate } from "@/lib/utils";

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "support_requests"), (snapshot) => {
      setTickets(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDeleteTicket = async (id) => {
    if (!confirm("Are you sure you want to delete this support ticket from Firestore?")) return;
    try {
      await deleteDoc(doc(db, "support_requests", id));
    } catch (err) {
      console.error("Error deleting ticket:", err);
      alert("Failed to delete ticket: " + err.message);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const queryMatch = (t.subject || "").toLowerCase().includes(search.toLowerCase()) ||
                       (t.storeName || "").toLowerCase().includes(search.toLowerCase()) ||
                       (t.userEmail || "").toLowerCase().includes(search.toLowerCase()) ||
                       (t.id || "").toLowerCase().includes(search.toLowerCase());
    const statusMatch = statusFilter === "all" || (t.status || "open").toLowerCase() === statusFilter.toLowerCase();
    return queryMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Support Ticket Desk</h1>
          <p className="text-xs text-slate-500 font-medium">Respond to store owners' support requests and troubleshoot POS issues in real-time</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search tickets by subject, store, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4455DF]"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-500 uppercase">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4455DF]"
          >
            <option value="all">All Tickets</option>
            <option value="open">Open (Unresolved)</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-[#4455DF] border-t-transparent rounded-full"></div>
            <p className="text-xs text-slate-500 font-semibold mt-3">Fetching support tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-16 text-center">
            <LifeBuoy className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">No support tickets found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        ticket.status === "resolved"
                          ? "bg-emerald-100 text-emerald-700"
                          : ticket.status === "in_progress"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700 animate-pulse"
                      }`}
                    >
                      {ticket.status || "open"}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-sm">{ticket.subject || "No Subject"}</h3>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {ticket.description || ticket.message || "No description provided."}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-medium pt-1">
                    <span>Store: <strong className="text-slate-700">{ticket.storeName || ticket.storeId || "N/A"}</strong></span>
                    <span>User: <strong className="text-slate-700">{ticket.userEmail || ticket.phone || "Owner"}</strong></span>
                    <span>Created: {formatDate(ticket.createdAt)}</span>
                    {ticket.replies && <span className="text-[#4455DF] font-bold">{ticket.replies.length} replies</span>}
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end md:self-center">
                  <button
                    onClick={() => setSelectedTicket(ticket)}
                    className="px-4 py-2 rounded-xl bg-[#4455DF] hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-500/20 flex items-center space-x-1.5 transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{ticket.replies?.length > 0 ? "View & Reply" : "Respond"}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteTicket(ticket.id)}
                    title="Delete Ticket"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Response Modal */}
      {selectedTicket && (
        <TicketResponseModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
}
