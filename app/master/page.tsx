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
    <div className="max-w-6xl mx-auto pb-20 text-black font-black text-black">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 md:mb-12">
        <div><h1 className="text-3xl md:text-4xl font-black text-black tracking-tighter flex items-center gap-3"><Database className="text-blue-600 w-8 h-8" /> Master Data</h1><p className="text-slate-700 text-sm mt-1 font-bold tracking-tight">System mapping.</p></div>
        <button onClick={() => { setEditingId(null); setFormData({name:'', code:'', category_id:''}); setIsModalOpen(true); }} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 rounded-2xl text-xs font-black text-white hover:bg-blue-700 shadow-xl uppercase tracking-widest transition-all"><Plus size={16} /> New Item</button>
      </header>

      <AnimatePresence>{isModalOpen && (<div className="fixed inset-0 z-[110] flex items-center justify-center p-4"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" /><motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 md:p-10 overflow-hidden text-black font-black max-h-[90vh] overflow-y-auto text-black"><div className="flex justify-between items-center mb-8 text-black"><h2 className="text-xl md:text-2xl font-black text-black">{editingId ? 'Edit Item' : 'New Item'}</h2><button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-black text-black"><X size={20} /></button></div><form onSubmit={handleManualSubmit} className="space-y-6 text-black"><div><label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Item Name</label><input type="text" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none shadow-sm" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div><div><label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block tracking-widest">Item Code</label><input type="text" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 outline-none uppercase shadow-sm" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} /></div><div><label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block tracking-widest">Category</label><select required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black shadow-sm" value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})}><option value="">Select Category...</option>{categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name} ({cat.type})</option>))}</select></div><button type="submit" className="w-full bg-black text-white font-black py-5 rounded-[1.5rem] shadow-lg hover:bg-slate-800 transition-all mt-4 uppercase tracking-widest text-[10px]">Save Item</button></form></motion.div></div>)}</AnimatePresence>

      <AnimatePresence>{selectedIds.length > 0 && (<motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-6 md:bottom-10 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-[110] bg-black text-white px-6 md:px-8 py-4 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl flex flex-col sm:flex-row items-center gap-4 border border-white/10 backdrop-blur-xl"><div className="text-xs font-black uppercase tracking-widest text-slate-400"><span className="text-white">{selectedIds.length}</span> selected</div><div className="flex gap-6 items-center"><button onClick={handleDeleteBulk} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-black text-xs uppercase tracking-widest transition-colors"><Trash2 size={16} /> Delete</button><button onClick={() => setSelectedIds([])} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest">Cancel</button></div></motion.div>)}</AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm mb-8 flex flex-col lg:flex-row items-center justify-between gap-6 text-black font-black"><div className="flex items-center gap-5 w-full"><div className="w-14 h-14 bg-blue-50 rounded-[1.2rem] flex items-center justify-center text-blue-600 shadow-inner"><Download size={24} /></div><div><h3 className="text-base font-black text-black">Master Data Sync</h3><p className="text-xs text-slate-600 font-bold tracking-tight">Sync categories from Excel.</p></div></div><div className="flex gap-3 w-full lg:w-auto"><button onClick={() => window.open('/master_template.xlsx', '_blank')} className="flex-1 lg:flex-none px-6 py-3 bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black hover:bg-slate-100 border border-slate-200 uppercase tracking-widest transition-all">Template</button><button onClick={() => masterInputRef.current?.click()} className="flex-1 lg:flex-none px-6 py-3 bg-black text-white rounded-2xl text-[10px] font-black hover:bg-slate-800 transition-all shadow-lg uppercase tracking-widest">Upload Data</button><input type="file" ref={masterInputRef} onChange={handleMasterUpload} className="hidden" accept=".xlsx, .xls" /></div></motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8 mb-8 text-black font-black">
        <StatCard label="Total Items" val={items.length} icon={<Tag size={20} />} />
        <StatCard label="Incomes" val={items.filter(i => i.categories?.type === 'income').length} icon={<TrendingUp size={20} />} />
        <StatCard label="Expenses" val={items.filter(i => i.categories?.type === 'expense').length} icon={<TrendingDown size={20} />} />
      </div>

      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden font-black text-black">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50"><div className="relative w-full text-black"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search master data..." className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-black focus:border-blue-500 outline-none transition-all shadow-sm font-black text-black" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
        <div className="overflow-x-auto text-black"><table className="w-full text-left text-sm text-black">
            <thead><tr className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest border-b border-slate-200"><th className="px-6 py-6 w-10"><input type="checkbox" className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500" checked={selectedIds.length === items.length && items.length > 0} onChange={() => setSelectedIds(selectedIds.length === items.length ? [] : items.map(i => i.id))} /></th><th className="px-6 py-6 text-black">Code</th><th className="px-6 py-6 text-black">Name</th><th className="px-6 py-6 hidden sm:table-cell text-black">Group</th><th className="px-6 py-6 text-center text-black">Type</th><th className="px-6 py-6 text-center text-black">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100 text-black">
              {loading ? (<tr><td colSpan={6} className="text-center py-20 text-slate-400 font-black uppercase tracking-widest text-[10px] animate-pulse">Syncing...</td></tr>) : filtered.length === 0 ? (<tr><td colSpan={6} className="text-center py-24 text-slate-400 font-bold uppercase tracking-widest text-[10px]">No results.</td></tr>) : (
                filtered.map((item) => (
                  <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.includes(item.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-7 text-black"><input type="checkbox" className="w-4 h-4 rounded-md border-slate-300 text-blue-600" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds(selectedIds.includes(item.id) ? selectedIds.filter(i => i !== item.id) : [...selectedIds, item.id])} /></td>
                    <td className="px-6 py-7 text-black"><span className="bg-slate-100 px-3 py-1.5 rounded-lg font-mono text-[10px] text-blue-700 font-black">{item.code}</span></td>
                    <td className="px-6 py-7 font-black text-black text-sm uppercase tracking-tight text-black">{item.name}</td>
                    <td className="px-6 py-7 hidden sm:table-cell text-slate-700 font-bold text-xs uppercase text-black">{item.categories?.name}</td>
                    <td className="px-6 py-7 text-center text-black"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${item.categories?.type === 'income' ? 'bg-green-50 text-emerald-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{item.categories?.type}</span></td>
                    <td className="px-6 py-7 text-center text-black"><div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all text-black"><button onClick={() => openEditModal(item)} className="p-2.5 text-slate-400 hover:text-blue-600 transition-all"><Edit3 size={16} /></button><button onClick={() => handleDeleteSingle(item.id)} className="p-2.5 text-slate-400 hover:text-red-600 transition-all"><Trash2 size={16} /></button></div></td>
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
        <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-5 text-black font-black">
            <div className="p-4 bg-slate-50 rounded-2xl text-black font-black">{icon}</div>
            <div className="text-black font-black"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-black font-black">{label}</p><p className="text-xl md:text-2xl font-black text-black font-black">{val}</p></div>
        </div>
    );
}
