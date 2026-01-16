'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Database, Search, Tag, Hash, TrendingUp, TrendingDown,
  Download, Plus, Edit3, Trash2, X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function MasterDataPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', category_id: '' });
  const masterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMasterData();
    fetchCategories();
  }, []);

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data || []);
  }

  async function fetchMasterData() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('transaction_items').select('*, categories(name, type, code_prefix)').order('code', { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setFormData({ name: item.name, code: item.code, category_id: item.category_id?.toString() || '' });
    setIsModalOpen(true);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { user_id: user.id, name: formData.name.trim(), code: formData.code.trim(), category_id: formData.category_id ? Number(formData.category_id) : null };
    const { error } = editingId ? await supabase.from('transaction_items').update(payload).eq('id', editingId) : await supabase.from('transaction_items').insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Master item saved"); setIsModalOpen(false); setEditingId(null); setFormData({ name: '', code: '', category_id: '' }); fetchMasterData(); }
  };

  const handleDeleteSingle = async (id: number) => {
    if (!confirm("Delete this master item?")) return;
    const { error } = await supabase.from('transaction_items').delete().eq('id', id);
    if (!error) { toast.success("Item removed"); fetchMasterData(); }
    else toast.error(error.message);
  };

  const handleDeleteBulk = async () => {
    if (!confirm(`Delete ${selectedIds.length} items?`)) return;
    const { error } = await supabase.from('transaction_items').delete().in('id', selectedIds);
    if (!error) { toast.success("Items deleted"); setSelectedIds([]); fetchMasterData(); }
    else toast.error(error.message);
  };

  const handleMasterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        if (!arrayBuffer) return;
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const wsname = wb.SheetNames.find(n => n.toLowerCase().includes('cat') || n.toLowerCase().includes('master')) || wb.SheetNames[0];
        const rawData: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);
        if (rawData.length === 0) { toast.error("Excel is empty"); return; }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const uniqueCats = Array.from(new Set(rawData.map(r => r['kategori']))).filter(Boolean);
        const catPayload = uniqueCats.map(catName => {
          const row = rawData.find(r => r['kategori'] === catName);
          return { user_id: user.id, name: String(catName).trim(), code_prefix: String(row['kode'] || '').trim(), type: String(row['sifat transaksi']).toLowerCase().includes('income') ? 'income' : 'expense' };
        });
        await supabase.from('categories').upsert(catPayload, { onConflict: 'user_id,name' });
        const { data: dbCats } = await supabase.from('categories').select('id, name');
        const catMap = new Map(dbCats?.map(c => [c.name, c.id]));
        const itemPayload = rawData.map(r => ({ user_id: user.id, name: String(r['nama transaksi'] || '').trim(), code: String(r['kode transaksi'] || '').trim(), category_id: catMap.get(String(r['kategori']).trim()) || null })).filter(i => i.name && i.code && i.category_id);
        if (itemPayload.length > 0) await supabase.from('transaction_items').upsert(itemPayload, { onConflict: 'user_id,code' });
        toast.success("Master data sync complete"); fetchMasterData(); fetchCategories(); if (masterInputRef.current) masterInputRef.current.value = "";
      } catch (err: any) { toast.error(err.message); if (masterInputRef.current) masterInputRef.current.value = ""; }
    };
    reader.readAsArrayBuffer(file);
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.code.toLowerCase().includes(searchTerm.toLowerCase()) || i.categories?.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto pb-10 text-black font-black">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-black tracking-tighter flex items-center gap-3">
            <Database className="text-blue-600 w-7 h-7" /> Master Data
          </h1>
          <p className="text-slate-700 text-[10px] mt-1 font-bold tracking-widest uppercase opacity-50">System mapping.</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ name: '', code: '', category_id: '' }); setIsModalOpen(true); }} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 rounded-xl text-[10px] font-black text-white hover:bg-blue-700 shadow-xl uppercase tracking-widest transition-all">
          <Plus size={14} /> New Item
        </button>
      </header>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 overflow-hidden text-black font-black max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8 text-black">
                <h2 className="text-xl font-black text-black uppercase tracking-tight">{editingId ? 'Edit Item' : 'New Item'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-black"><X size={18} /></button>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Item Name</label>
                  <input type="text" placeholder="e.g. Electricity Bill" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-3.5 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Item Code</label>
                  <input type="text" placeholder="e.g. ELEC-001" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-3.5 text-sm font-black shadow-sm outline-none uppercase focus:border-blue-500" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Category</label>
                  <select required className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-black uppercase shadow-sm outline-none focus:border-blue-500" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}>
                    <option value="">Select Category...</option>
                    {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name} ({cat.type})</option>))}
                  </select>
                </div>
                <button type="submit" className="w-full bg-black text-white font-black py-4 rounded-xl shadow-xl hover:bg-slate-800 transition-all mt-4 uppercase tracking-widest text-[10px]">Save Details</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] bg-black text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-6 border border-white/10 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-black"><span className="text-white">{selectedIds.length}</span> selected</div>
            <button onClick={handleDeleteBulk} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-black text-[10px] uppercase tracking-widest transition-colors"><Trash2 size={16} /> Delete</button>
            <button onClick={() => setSelectedIds([])} className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm mb-8 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-inner">
            <Download size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-black">Master Data Sync</h3>
            <p className="text-[10px] text-slate-600 font-bold tracking-tight uppercase">Bulk import transaction items.</p>
          </div>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <button onClick={() => window.open('/master_template.xlsx', '_blank')} className="flex-1 lg:flex-none px-5 py-2.5 bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black hover:bg-slate-100 border border-slate-200 uppercase tracking-widest transition-all">Template</button>
          <button onClick={() => masterInputRef.current?.click()} className="flex-1 lg:flex-none px-5 py-2.5 bg-black text-white rounded-xl text-[10px] font-black hover:bg-slate-800 transition-all shadow-lg uppercase tracking-widest">Upload File</button>
          <input type="file" ref={masterInputRef} onChange={handleMasterUpload} className="hidden" accept=".xlsx, .xls" />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatCard label="Total Items" val={items.length} icon={<Tag size={18} />} />
        <StatCard label="Income Type" val={items.filter(i => i.categories?.type === 'income').length} icon={<TrendingUp size={18} />} />
        <StatCard label="Expense Type" val={items.filter(i => i.categories?.type === 'expense').length} icon={<TrendingDown size={18} />} />
      </div>

      <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden mb-10">
        <div className="p-6 border-b-2 border-slate-50 bg-slate-50/20">
          <div className="relative w-full text-black">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search master data..." className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-black text-black focus:border-blue-500 outline-none transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                <th className="px-6 py-4 w-10 text-center">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" checked={selectedIds.length === items.length && items.length > 0} onChange={() => setSelectedIds(selectedIds.length === items.length ? [] : items.map(i => i.id))} />
                </th>
                <th className="px-6 py-4 tracking-widest">Code</th>
                <th className="px-6 py-4 tracking-widest">Item Detail</th>
                <th className="px-6 py-4 hidden sm:table-cell tracking-widest">Group</th>
                <th className="px-6 py-4 text-center tracking-widest">Type</th>
                <th className="px-6 py-4 text-center tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50 text-black">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-20 text-slate-400 font-black uppercase tracking-widest text-[10px] animate-pulse">Syncing Mapping...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-24 text-slate-400 font-black uppercase tracking-widest text-[10px]">No results found.</td></tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className={`hover:bg-slate-50/50 transition-all group ${selectedIds.includes(item.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-4 text-center">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds(selectedIds.includes(item.id) ? selectedIds.filter(i => i !== item.id) : [...selectedIds, item.id])} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-50 px-3 py-1.5 rounded-lg font-mono text-[9px] text-blue-600 font-black border border-blue-50">{item.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-black text-black text-sm tracking-tight uppercase">{item.name}</p>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-tight">{item.categories?.name}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${item.categories?.type === 'income' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {item.categories?.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-1.5 sm:opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => openEditModal(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-blue-50 rounded-lg"><Edit3 size={16} /></button>
                        <button onClick={() => handleDeleteSingle(item.id)} className="p-2 text-slate-400 hover:text-red-600 transition-all border border-transparent hover:border-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
      </div>
    </div>
  );
}

function StatCard({ label, val, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border-2 border-slate-50 shadow-sm flex items-center gap-5 transition-all hover:border-blue-50 group">
      <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-all">{icon}</div>
      <div>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-2xl font-black text-black tracking-tighter">{val}</p>
      </div>
    </div>
  );
}
