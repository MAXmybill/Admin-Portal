"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { BookOpen, Plus, Trash2, Edit, Search, Save, X, Sparkles } from "lucide-react";
import { db } from "@/lib/firebase";
import { formatDate } from "@/lib/utils";

export default function KnowledgePage() {
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "knowledge"), (snapshot) => {
      setArticles(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleOpenCreate = () => {
    setEditDoc(null);
    setTitle("");
    setCategory("Billing & Sales");
    setContent("");
    setIsCreating(true);
  };

  const handleOpenEdit = (docData) => {
    setEditDoc(docData);
    setTitle(docData.title || "");
    setCategory(docData.category || "General");
    setContent(docData.body || docData.content || "");
    setIsCreating(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      if (editDoc) {
        await updateDoc(doc(db, "knowledge", editDoc.id), {
          title,
          category,
          body: content,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "knowledge"), {
          title,
          category,
          body: content,
          createdAt: serverTimestamp(),
        });
      }
      setIsCreating(false);
      setEditDoc(null);
    } catch (err) {
      console.error("Error saving article:", err);
      alert("Failed to save article: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this help article?")) return;
    try {
      await deleteDoc(doc(db, "knowledge", id));
    } catch (err) {
      console.error("Error deleting article:", err);
      alert("Failed to delete article: " + err.message);
    }
  };

  const filteredArticles = articles.filter((a) => {
    return (a.title || "").toLowerCase().includes(search.toLowerCase()) ||
           (a.category || "").toLowerCase().includes(search.toLowerCase()) ||
           (a.body || "").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Knowledge Base & Guides CMS</h1>
          <p className="text-xs text-slate-500 font-medium">Publish user guides, video walkthroughs, and FAQ articles for store owners</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-[#4455DF] hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center space-x-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Publish New Article</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-7 top-7" />
        <input
          type="text"
          placeholder="Search articles by title, category, or keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4455DF]"
        />
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-[#4455DF] border-t-transparent rounded-full"></div>
          <p className="text-xs text-slate-500 font-semibold mt-3">Loading knowledge base content...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-600">No knowledge base articles published yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredArticles.map((article) => (
            <div key={article.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-[#4455DF] border border-indigo-100">
                    {article.category || "General"}
                  </span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleOpenEdit(article)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#4455DF] hover:bg-slate-100"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(article.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base mt-3">{article.title}</h3>
                <p className="text-xs text-slate-600 mt-2 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                  {article.body || article.content}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-semibold flex justify-between">
                <span>Published Article</span>
                <span>{formatDate(article.createdAt || article.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Article Create/Edit Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">{editDoc ? "Edit Help Article" : "Publish New Help Article"}</h3>
              <button onClick={() => setIsCreating(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Article Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. How to set up Bluetooth Thermal Printer"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
                >
                  <option value="Billing & Sales">Billing & Sales</option>
                  <option value="Stock & Inventory">Stock & Inventory</option>
                  <option value="Printers & Hardware">Printers & Hardware</option>
                  <option value="Reports & Analytics">Reports & Analytics</option>
                  <option value="Account & Plan">Account & Plan</option>
                  <option value="General FAQ">General FAQ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Article Content / Body</label>
                <textarea
                  rows={6}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Provide step-by-step instructions for store owners..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-[#4455DF]"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
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
                  <span>{saving ? "Publishing..." : "Save Article"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
