'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Database, Search, Tag, TrendingUp, TrendingDown,
  Download, Plus, Edit3, Trash2, X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';
import type { TransactionItem, Category } from '@/contexts/GlobalDataContext';

export default function MasterDataPage() {
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', category_id: '' });
  const masterInputRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(isModalOpen);

  useEffect(() => {
    fetchMasterData();
    fetchCategories();
  }, []);

  async function fetchCategories() {
    // CRITICAL: Get user first and filter by user_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCategories([]);
      return;
    }
    const { data } = await supabase.from('categories').select('*').eq('user_id', user.id).order('name');
    setCategories(data || []);
  }

  async function fetchMasterData() {
    try {
      setLoading(true);
      // CRITICAL: Get user first and filter by user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.from('transaction_items').select('*, categories!fk_transaction_items_category(name, type)').eq('user_id', user.id).order('code', { ascending: true });
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
          return { user_id: user.id, name: String(catName).trim(), type: String(row['sifat transaksi']).toLowerCase().includes('income') ? 'income' : 'expense' };
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

  const filtered = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.categories?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Master Data</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">Configure transaction mapping</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ name: '', code: '', category_id: '' }); setIsModalOpen(true); }} className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-lg flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest">
          <Plus size={16} /> New Mapping
        </button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
        <StatCard label="Total Items" val={items.length} icon={<Tag size={16} className="text-blue-500" />} />
        <StatCard label="Inbound" val={items.filter(i => i.categories?.type === 'income').length} icon={<TrendingUp size={16} className="text-emerald-500" />} />
        <div className="hidden md:flex">
            <StatCard label="Outbound" val={items.filter(i => i.categories?.type === 'expense').length} icon={<TrendingDown size={16} className="text-red-500" />} />
        </div>
      </div>

      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm shrink-0">
            <Download size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">Data Synchronization</h3>
            <p className="text-[10px] md:text-xs text-slate-500 font-medium">Bulk import your master mappings</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => window.open('/master_template.xlsx', '_blank')} className="flex-1 md:flex-none px-4 py-2 bg-white text-slate-600 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-slate-50 border border-slate-200 transition-all">Template</button>
          <button onClick={() => masterInputRef.current?.click()} className="flex-1 md:flex-none px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95">Upload</button>
          <input type="file" ref={masterInputRef} onChange={handleMasterUpload} className="hidden" accept=".xlsx, .xls" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" placeholder="Search items or codes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Showing {filtered.length} entries</p>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-3 w-10 text-center">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0" checked={selectedIds.length === items.length && items.length > 0} onChange={() => setSelectedIds(selectedIds.length === items.length ? [] : items.map(i => i.id))} />
                </th>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Item Name</th>
                <th className="px-6 py-3 hidden sm:table-cell">Category</th>
                <th className="px-6 py-3 text-center">Type</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing master data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No records found</td></tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className={`group hover:bg-slate-50 transition-colors ${selectedIds.includes(item.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-3 text-center">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds(selectedIds.includes(item.id) ? selectedIds.filter(i => i !== item.id) : [...selectedIds, item.id])} />
                    </td>
                    <td className="px-6 py-3">
                      <span className="font-mono text-[9px] text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 font-bold">{item.code}</span>
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-slate-900 truncate max-w-[150px]">{item.name}</td>
                    <td className="px-6 py-3 hidden sm:table-cell text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.categories?.name}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-tighter ${item.categories?.type === 'income' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {item.categories?.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex justify-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 size={14} /></button>
                        <button onClick={() => handleDeleteSingle(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-2xl shadow-xl p-5 md:p-6 text-black">
              <h2 className="text-lg font-bold mb-6 text-slate-900">{editingId ? 'Edit Mapping' : 'New Mapping'}</h2>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Item Name</label>
                  <input type="text" placeholder="e.g. Monthly Salary" required className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Internal Code</label>
                  <input type="text" placeholder="e.g. INC-001" required className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none uppercase focus:ring-2 focus:ring-blue-100 font-bold text-slate-900" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Category Link</label>
                  <select required className="w-full text-sm p-2.5 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-bold" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}>
                    <option value="">Select Category...</option>
                    {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name} ({cat.type})</option>))}
                  </select>
                </div>
                <button type="submit" className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors mt-2 uppercase tracking-widest active:scale-[0.98] shadow-lg">Save Mapping Record</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedIds.length} selected</span>
            <button onClick={handleDeleteBulk} className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 uppercase tracking-widest"><Trash2 size={12} /> Delete</button>
            <button onClick={() => setSelectedIds([])} className="text-slate-500 hover:text-white"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, val, icon }: any) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center md:items-center gap-3 md:gap-4 transition-all hover:border-blue-100 group">
      <div className="p-2 bg-slate-50 rounded-lg group-hover:scale-110 transition-transform">{icon}</div>
      <div className="text-center md:text-left">
        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-base md:text-xl font-bold text-slate-900 leading-none">{val}</p>
      </div>
    </div>
  );
}
