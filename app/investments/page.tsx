'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, Coins, Plus, RefreshCcw, ArrowUpRight, ArrowDownRight, Download, Trash2, X, Edit3
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6'];

export default function InvestmentsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState({ type: 'Stock', symbol: '', quantity: '', avg_buy_price: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchAssets(); }, []);

  const formatDisplayAmount = (val: string) => {
    if (!val) return "";
    const num = val.toString().replace(/\D/g, "");
    return new Intl.NumberFormat('id-ID').format(Number(num));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, avg_buy_price: rawVal });
  };

  async function fetchAssets() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('assets').select('*').order('type', { ascending: true }).order('symbol', { ascending: true });
      if (error) throw error;
      setAssets(data || []);
    } catch (err: any) { toast.error("Failed to load assets"); }
    finally { setLoading(false); }
  }

  const handleDeleteSingle = async (id: number) => {
    if (!confirm("Delete position?")) return;
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (!error) { toast.success("Asset deleted"); fetchAssets(); }
    else toast.error(error.message);
  };

  const handleDeleteBulk = async () => {
    if (!confirm(`Delete ${selectedIds.length} assets?`)) return;
    const { error } = await supabase.from('assets').delete().in('id', selectedIds);
    if (!error) { toast.success(`${selectedIds.length} assets removed`); setSelectedIds([]); fetchAssets(); }
    else toast.error(error.message);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === assets.length) setSelectedIds([]);
    else setSelectedIds(assets.map(a => a.id));
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const openEditModal = (asset: any) => {
    setEditingId(asset.id);
    setFormData({ type: asset.type, symbol: asset.symbol, quantity: asset.quantity.toString(), avg_buy_price: asset.avg_buy_price.toString() });
    setIsModalOpen(true);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
        setSyncing(true);
        const response = await fetch('/api/sync-prices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assets: [{ type: formData.type, symbol: formData.symbol.toUpperCase() }] }) });
        const result = await response.json();
        const marketPrice = result.updatedAssets?.[0]?.current_price || 0;
        const payload = { user_id: user.id, type: formData.type, symbol: formData.symbol.toUpperCase().trim(), quantity: Number(formData.quantity), avg_buy_price: Number(formData.avg_buy_price), current_price: marketPrice, last_updated: new Date().toISOString() };
        if (editingId) await supabase.from('assets').update(payload).eq('id', editingId);
        else await supabase.from('assets').upsert(payload, { onConflict: 'user_id,symbol' });
        toast.success("Portfolio updated");
        setIsModalOpen(false); setEditingId(null); setFormData({ type: 'Stock', symbol: '', quantity: '', avg_buy_price: '' }); fetchAssets();
    } catch (err: any) { toast.error(err.message); }
    finally { setSyncing(false); }
  };

  async function syncMarketPrices() {
    try {
      setSyncing(true);
      const { data: currentAssets } = await supabase.from('assets').select('*');
      if (!currentAssets || currentAssets.length === 0) return;
      const response = await fetch('/api/sync-prices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assets: currentAssets }) });
      const result = await response.json();
      for (const update of result.updatedAssets) { await supabase.from('assets').update({ current_price: update.current_price, last_updated: new Date().toISOString() }).eq('id', update.id); }
      toast.success("Market prices updated"); fetchAssets();
    } catch (err: any) { toast.error("Sync Failed: " + err.message); }
    finally { setSyncing(false); }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        if (!arrayBuffer) return;
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const payload = data.map(row => ({ user_id: user.id, type: String(row['Type']).trim(), symbol: String(row['Symbol']).trim().toUpperCase(), quantity: Number(row['Quantity'] || 0), avg_buy_price: Number(row['Avg Buy Price'] || 0), last_updated: new Date().toISOString() })).filter(a => a.symbol && a.quantity > 0);
        await supabase.from('assets').upsert(payload, { onConflict: 'user_id,symbol' });
        toast.success("Assets imported");
        fetchAssets(); if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err: any) { toast.error(err.message); if (fileInputRef.current) fileInputRef.current.value = ""; }
    };
    reader.readAsArrayBuffer(file);
  };

  const totalValue = assets.reduce((acc, curr) => acc + (curr.quantity * curr.current_price), 0);
  const totalCost = assets.reduce((acc, curr) => acc + (curr.quantity * curr.avg_buy_price), 0);
  const totalProfit = totalValue - totalCost;
  const profitPercentage = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  const chartData = assets.map(asset => ({ name: asset.symbol, value: asset.quantity * asset.current_price }));

  return (
    <div className="max-w-6xl mx-auto pb-20 text-black font-black">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 md:mb-12">
        <div><h1 className="text-3xl md:text-4xl font-black tracking-tighter">Investments</h1><p className="text-slate-700 text-sm mt-1 font-bold">Real-time wealth tracking.</p></div>
        <div className="flex gap-2 w-full sm:w-auto"><button onClick={syncMarketPrices} disabled={syncing} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all uppercase tracking-widest"><RefreshCcw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Sync</button><button onClick={() => { setEditingId(null); setFormData({type:'Stock', symbol:'', quantity:'', avg_buy_price:''}); setIsModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 rounded-2xl text-xs font-black text-white hover:bg-blue-700 shadow-xl transition-all uppercase tracking-widest"><Plus className="w-4 h-4" /> Add Asset</button></div>
      </header>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[2rem] md:rounded-[2.5rem] shadow-2xl p-6 md:p-10 overflow-hidden text-black font-black max-h-[90vh] overflow-y-auto text-black">
              <div className="flex justify-between items-center mb-8"><h2 className="text-xl md:text-2xl font-black">{editingId ? 'Edit Asset' : 'New Position'}</h2><button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-black"><X size={20} /></button></div>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Type</label><select className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}><option value="Stock">Stock</option><option value="Gold">Gold</option></select></div>
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Symbol</label><input type="text" placeholder="TLKM" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black uppercase shadow-sm" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value})} disabled={!!editingId} /></div>
                </div>
                <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Quantity</label><input type="number" step="any" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black shadow-sm" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Buy Price (Avg)</label><input type="text" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black shadow-sm" value={formatDisplayAmount(formData.avg_buy_price)} onChange={handlePriceChange} /></div>
                <button type="submit" disabled={syncing} className="w-full bg-black text-white font-black py-5 rounded-[1.5rem] shadow-lg hover:bg-slate-800 transition-all mt-4 uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">{syncing && <RefreshCcw size={16} className="animate-spin" />} Save Changes</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>{selectedIds.length > 0 && (<motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-6 md:bottom-10 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-[110] bg-black text-white px-6 md:px-8 py-4 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl flex flex-col sm:flex-row items-center gap-4 border border-white/10 backdrop-blur-xl"><div className="text-xs font-black uppercase tracking-widest text-slate-400"><span className="text-white">{selectedIds.length}</span> selected</div><div className="flex gap-6 items-center"><button onClick={handleDeleteBulk} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-black text-xs uppercase tracking-widest transition-colors"><Trash2 size={16} /> Delete</button><button onClick={() => setSelectedIds([])} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest">Cancel</button></div></motion.div>)}</AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm mb-10 flex flex-col lg:flex-row items-center justify-between gap-6 text-black"><div className="flex items-center gap-5 w-full"><div className="w-14 h-14 bg-amber-50 rounded-[1.5rem] flex items-center justify-center text-amber-600 shadow-inner"><Download size={24} /></div><div><h3 className="text-base font-black text-black">Portfolio Sync</h3><p className="text-xs text-slate-600 font-bold tracking-tight">Bulk update via Excel.</p></div></div><div className="flex gap-3 w-full lg:w-auto"><button onClick={() => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Type: 'Gold', Symbol: 'Gold', Quantity: 10, 'Avg Buy Price': 1100000 }]), 'Assets'); XLSX.writeFile(wb, 'MyLedger_assets_template.xlsx'); }} className="flex-1 lg:flex-none px-6 py-3 bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black hover:bg-slate-100 border border-slate-200 uppercase tracking-widest transition-all">Template</button><button onClick={() => fileInputRef.current?.click()} className="flex-1 lg:flex-none px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black hover:bg-slate-800 transition-all shadow-lg uppercase tracking-widest">Upload Data</button><input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" /></div></motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-10 text-black">
        <MetricCard title="Total Value" value={totalValue} icon={<Coins className="text-amber-500" />} color="text-black" />
        <MetricCard title="Unrealized P/L" value={totalProfit} percentage={profitPercentage} icon={<TrendingUp className={totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'} />} color={totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'} />
        <div className="bg-white p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-center min-h-[150px]"><p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Asset Allocation</p><div className="h-24 text-black font-black"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData.length > 0 ? chartData : [{ name: 'Empty', value: 1 }]} innerRadius={25} outerRadius={40} paddingAngle={8} dataKey="value" stroke="none">{chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}{chartData.length === 0 && <Cell fill="#f1f5f9" />}</Pie><RechartsTooltip /></PieChart></ResponsiveContainer></div></div>
      </div>

      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden font-black text-black">
        <div className="overflow-x-auto"><table className="w-full text-left text-sm text-black">
            <thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-widest"><th className="px-6 py-6 w-10"><input type="checkbox" className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500" checked={selectedIds.length === assets.length && assets.length > 0} onChange={toggleSelectAll} /></th><th className="px-6 py-6 text-black">Asset</th><th className="px-6 py-6 text-center text-black">Position</th><th className="px-6 py-6 text-right text-black">Market Price</th><th className="px-6 py-6 text-center text-black">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100 text-black">
              {loading ? (<tr><td colSpan={6} className="text-center py-20 text-slate-400 font-black uppercase tracking-widest text-[10px] animate-pulse">Syncing...</td></tr>) : assets.length === 0 ? (<tr><td colSpan={6} className="text-center py-24 text-slate-400 font-bold uppercase tracking-widest text-[10px]">No assets.</td></tr>) : (
                assets.map((asset) => {
                  const value = asset.quantity * asset.current_price;
                  const profit = value - (asset.quantity * asset.avg_buy_price);
                  const pPercent = (profit / (asset.quantity * asset.avg_buy_price)) * 100;
                  return (
                    <tr key={asset.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.includes(asset.id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-6 py-7"><input type="checkbox" className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500" checked={selectedIds.includes(asset.id)} onChange={() => toggleSelect(asset.id)} /></td>
                      <td className="px-6 py-7 font-black text-black text-sm uppercase"><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] ${asset.type === 'Gold' ? 'bg-amber-100 text-amber-700 shadow-inner' : 'bg-blue-100 text-blue-700 shadow-inner'}`}>{asset.symbol.substring(0, 2)}</div><div><p className="font-black text-black text-sm">{asset.symbol}</p><p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-black">{asset.type}</p></div></div></td>
                      <td className="px-6 py-7 font-black text-slate-700 text-xs text-center">{asset.quantity}<p className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Avg @ {new Intl.NumberFormat('id-ID').format(asset.avg_buy_price)}</p></td>
                      <td className="px-6 py-7 text-right"><p className="font-black text-black text-sm tracking-tight">{new Intl.NumberFormat('id-ID').format(asset.current_price)}</p><div className={`inline-flex items-center gap-1 text-[9px] font-black ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{profit >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{pPercent.toFixed(1)}%</div></td>
                      <td className="px-6 py-7"><div className="flex justify-center gap-1"><button onClick={() => openEditModal(asset)} className="p-2.5 text-slate-400 hover:text-blue-600 transition-all sm:opacity-0 group-hover:opacity-100"><Edit3 size={16} /></button><button onClick={() => handleDeleteSingle(asset.id)} className="p-2.5 text-slate-400 hover:text-red-600 transition-all sm:opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button></div></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table></div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, percentage, icon, color }: any) {
  return (
    <motion.div whileHover={{ y: -5 }} className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
      <div className="flex items-center justify-between mb-6 text-black">
        <div className="p-3 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform">{icon}</div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-black">{title}</p>
      </div>
      <div className="flex items-end gap-2 text-black">
        <p className={`text-2xl md:text-3xl font-black ${color}`}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)}</p>
        {percentage !== undefined && (
            <span className={`text-[10px] font-black mb-1.5 ${percentage >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>({percentage.toFixed(1)}%)</span>
        )}
      </div>
    </motion.div>
  );
}
