'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  TrendingUp, Coins, Plus, RefreshCcw, ArrowUpRight, ArrowDownRight, Download, Trash2, X, Edit3, Activity, Briefcase
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
    } catch (err: any) { toast.error("Failed to load investments"); }
    finally { setLoading(false); }
  }

  const handleDeleteSingle = async (id: number) => {
    if (!confirm("Delete this investment?")) return;
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (!error) { toast.success("Investment removed"); fetchAssets(); }
    else toast.error(error.message);
  };

  const handleDeleteBulk = async () => {
    if (!confirm(`Remove ${selectedIds.length} investments?`)) return;
    const { error } = await supabase.from('assets').delete().in('id', selectedIds);
    if (!error) { toast.success(`${selectedIds.length} investments removed`); setSelectedIds([]); fetchAssets(); }
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
      toast.success("Investment updated");
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
      toast.success("Prices updated successfully"); fetchAssets();
    } catch (err: any) { toast.error("Update failed: " + err.message); }
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
        toast.success("Investments imported");
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
    <div className="max-w-6xl mx-auto pb-20 text-black font-black uppercase">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-black uppercase">My Portfolio</h1>
          <p className="text-slate-700 text-xs mt-1 font-bold tracking-tight uppercase">Investment tracking & market value.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={syncMarketPrices}
            disabled={syncing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCcw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => { setEditingId(null); setFormData({ type: 'Stock', symbol: '', quantity: '', avg_buy_price: '' }); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 rounded-xl text-[10px] font-black text-white hover:bg-blue-700 shadow-xl transition-all"
          >
            <Plus className="w-4 h-4" /> Add Assets
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Market Value"
          value={totalValue}
          icon={<Coins className="text-amber-500" />}
          color="text-black"
          sub="Total Value Now"
        />
        <MetricCard
          title="Total Profit"
          value={totalProfit}
          percentage={profitPercentage}
          icon={<TrendingUp className={totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'} />}
          color={totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}
          sub="Overall Growth"
        />
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-50 shadow-xl flex flex-col justify-center min-h-[140px] group hover:border-blue-100 transition-all">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Mix</p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.length > 0 ? chartData : [{ name: 'Empty', value: 1 }]}
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  {chartData.length === 0 && <Cell fill="#f1f5f9" />}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm mb-8 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shadow-inner">
            <Download size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-black">Bulk Data Import</h3>
            <p className="text-[10px] text-slate-600 font-bold tracking-tight">Sync your investments from Excel files.</p>
          </div>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <button onClick={() => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Type: 'Stock', Symbol: 'BBCA', Quantity: 100, 'Avg Buy Price': 10000 }]), 'Assets'); XLSX.writeFile(wb, 'Portfolio_Template.xlsx'); }} className="flex-1 lg:flex-none px-5 py-2.5 bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black hover:bg-slate-100 border border-slate-200 uppercase tracking-widest transition-all">Template</button>
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 lg:flex-none px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black hover:bg-slate-800 transition-all shadow-lg uppercase tracking-widest">Upload</button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                <th className="px-6 py-4 w-10">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" checked={selectedIds.length === assets.length && assets.length > 0} onChange={toggleSelectAll} />
                </th>
                <th className="px-6 py-4">Asset Details</th>
                <th className="px-6 py-4 text-center">My Holdings</th>
                <th className="px-6 py-4 text-right">Market Price</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-20 text-slate-400 font-black uppercase tracking-widest text-[10px] animate-pulse">Syncing Portfolio...</td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-24 text-slate-400 font-black uppercase tracking-widest text-[10px]">No investments yet.</td></tr>
              ) : (
                assets.map((asset) => {
                  const value = asset.quantity * asset.current_price;
                  const profit = value - (asset.quantity * asset.avg_buy_price);
                  const pPercent = (profit / (asset.quantity * asset.avg_buy_price)) * 100;
                  return (

                    <tr key={asset.id} className={`hover:bg-slate-50/50 transition-all group ${selectedIds.includes(asset.id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-6 py-4 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" checked={selectedIds.includes(asset.id)} onChange={() => toggleSelect(asset.id)} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] shadow-sm border-2 ${asset.type === 'Gold' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                            {asset.symbol.substring(0, 2)}
                          </div>
                          <div>
                            <p className="font-black text-black text-sm tracking-tight">{asset.symbol}</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{asset.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <p className="font-black text-slate-700 text-sm">{new Intl.NumberFormat('id-ID').format(asset.quantity)} Units</p>
                        <p className="text-[8px] text-slate-400 uppercase tracking-widest font-black">Buy: {new Intl.NumberFormat('id-ID').format(asset.avg_buy_price)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-black text-sm tracking-tight">{new Intl.NumberFormat('id-ID').format(asset.current_price)}</p>
                        <div className={`inline-flex items-center gap-1 text-[9px] font-black ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {profit >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {pPercent.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-1.5 sm:opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => openEditModal(asset)} className="p-2 text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-blue-50 rounded-lg"><Edit3 size={16} /></button>
                          <button onClick={() => handleDeleteSingle(asset.id)} className="p-2 text-slate-400 hover:text-red-600 transition-all border border-transparent hover:border-red-50 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 overflow-hidden text-black font-black max-h-[95vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black uppercase tracking-tight">{editingId ? 'Update Assets' : 'Add Assets'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Type</label>
                    <select className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-3.5 text-xs font-black uppercase shadow-sm outline-none focus:border-blue-500" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                      <option value="Stock">Stock / Saham</option>
                      <option value="Gold">Gold / Logam Mulia</option>
                      <option value="Crypto">Crypto</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Ticker</label>
                    <input type="text" placeholder="e.g. BBCA" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-3.5 text-sm font-black uppercase shadow-sm outline-none focus:border-blue-500" value={formData.symbol} onChange={(e) => setFormData({ ...formData, symbol: e.target.value })} disabled={!!editingId} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Quantity</label>
                  <input type="number" step="any" required placeholder="0" className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-3.5 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Avg Buy Price</label>
                  <input type="text" placeholder="0" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-3.5 text-sm font-black shadow-sm outline-none focus:border-blue-500" value={formatDisplayAmount(formData.avg_buy_price)} onChange={handlePriceChange} />
                </div>
                <button type="submit" disabled={syncing} className="w-full bg-black text-white font-black py-4 rounded-xl shadow-xl hover:bg-slate-800 transition-all mt-4 uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                  {syncing && <RefreshCcw size={14} className="animate-spin" />} Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({ title, value, percentage, icon, color, sub }: any) {
  return (
    <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-2xl border-2 border-slate-50 shadow-xl relative overflow-hidden group">
      <div className="flex items-center justify-between mb-8">
        <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 shadow-sm">{icon}</div>
        <div className="text-right">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</p>
          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{sub}</p>
        </div>
      </div>
      <div className="flex items-end gap-2 translate-y-1 group-hover:translate-y-0 transition-all duration-500">
        <p className={`text-2xl md:text-3xl font-black ${color} tracking-tighter`}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)}</p>
        {percentage !== undefined && (
          <span className={`text-[10px] font-black mb-1 px-1.5 py-0.5 rounded-full ${percentage >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {percentage.toFixed(1)}%
          </span>
        )}
      </div>
    </motion.div>
  );
}
