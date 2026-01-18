'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDisplayAmount } from '@/lib/utils';
import {
  TrendingUp, Coins, Plus, RefreshCcw, ArrowUpRight, ArrowDownRight, Download, Trash2, X, Edit3, Activity, Briefcase, History, Wallet, PieChart as PieIcon
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6'];

export default function InvestmentsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [syncing, setSyncing] = useState(false);
  
  const [formData, setFormData] = useState({ type: 'stock', symbol: '', quantity: '', avg_buy_price: '', wallet_id: '' });
  const [wallets, setWallets] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(isModalOpen);

  useEffect(() => { 
    fetchAssets(); 
    fetchHistory();
    fetchWallets();
  }, []);

  async function fetchWallets() {
    const { data } = await supabase.from('wallets').select('id, name').eq('is_active', true);
    setWallets(data || []);
  }

  async function fetchAssets() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('assets').select('*').order('type', { ascending: true }).order('symbol', { ascending: true });
      if (error) throw error;
      setAssets(data || []);
    } catch (err: any) { toast.error("Failed to load investments"); }
    finally { setLoading(false); }
  }

  async function fetchHistory() {
    const { data } = await supabase.from('asset_transactions').select('*, asset:assets(symbol, name)').order('recorded_at', { ascending: false }).limit(10);
    setHistory(data || []);
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    try {
      setSyncing(true);
      const qty = Number(formData.quantity);
      const price = Number(formData.avg_buy_price);
      const assetPayload = { user_id: user.id, type: formData.type.toLowerCase(), symbol: formData.symbol.toUpperCase().trim(), quantity: qty, avg_buy_price: price, current_price: price, last_price_update: new Date().toISOString() };
      
      let assetId;
      if (editingId) {
        const { data } = await supabase.from('assets').update(assetPayload).eq('id', editingId).select().single();
        assetId = data.id;
      } else {
        const { data } = await supabase.from('assets').upsert(assetPayload, { onConflict: 'user_id,symbol,type' }).select().single();
        assetId = data.id;
      }

      await supabase.from('asset_transactions').insert({ user_id: user.id, asset_id: assetId, type: editingId ? 'update' : 'buy', quantity: qty, unit_price: price, total_amount: qty * price, recorded_at: new Date().toISOString() });

      if (formData.wallet_id) {
          await supabase.from('transactions').insert({ user_id: user.id, wallet_id: Number(formData.wallet_id), type: 'expense', amount: qty * price, description: `Investment: ${formData.symbol.toUpperCase()}`, date: new Date().toISOString().split('T')[0], asset_id: assetId });
      }

      toast.success("Portfolio sync complete");
      setIsModalOpen(false); setEditingId(null); setFormData({ type: 'stock', symbol: '', quantity: '', avg_buy_price: '', wallet_id: '' }); 
      fetchAssets(); fetchHistory();
    } catch (err: any) { toast.error(err.message); }
    finally { setSyncing(false); }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, avg_buy_price: rawVal });
  };

  const totalValue = assets.reduce((acc, curr) => acc + (curr.quantity * curr.current_price), 0);
  const totalCost = assets.reduce((acc, curr) => acc + (curr.quantity * curr.avg_buy_price), 0);
  const totalProfit = totalValue - totalCost;
  const profitPercentage = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  const chartData = assets.map(asset => ({ name: asset.symbol, value: asset.quantity * asset.current_price }));

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Portfolio</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5 font-bold uppercase tracking-widest">Growth & Allocation</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ type: 'stock', symbol: '', quantity: '', avg_buy_price: '', wallet_id: '' }); setIsModalOpen(true); }} className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-lg flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest">
          <Plus size={16} /> New Asset
        </button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-8">
        <MetricCard title="Market Val" value={totalValue} icon={<Coins className="text-amber-500" size={16} />} color="text-slate-900" sub="Current Value" />
        <MetricCard title="Total P/L" value={totalProfit} percentage={profitPercentage} icon={<TrendingUp className={totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'} size={16} />} color={totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'} sub="Total Growth" />
        
        <div className="hidden lg:flex bg-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden flex-col justify-center border border-slate-800">
            <div className="absolute top-0 right-0 p-4 opacity-10"><PieIcon size={100}/></div>
            <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest">Allocation</h3>
            <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={chartData.length > 0 ? chartData : [{ name: 'Empty', value: 1 }]} innerRadius={35} outerRadius={50} paddingAngle={8} dataKey="value" stroke="none">
                            {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px', fontWeight: 700, color: '#000' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="p-4 md:p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Activity size={16} className="text-blue-500"/> Holdings</h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{assets.length} Assets</span>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[500px]">
                        <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-3">Asset</th>
                                <th className="px-6 py-3 text-center">Holdings</th>
                                <th className="px-6 py-3 text-right">Price</th>
                                <th className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {assets.map((asset) => (
                                <tr key={asset.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px]">{asset.symbol.substring(0,2)}</div>
                                            <div><p className="font-bold text-slate-900 text-sm">{asset.symbol}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{asset.type}</p></div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center"><p className="font-bold text-slate-700 text-sm">{new Intl.NumberFormat('id-ID').format(asset.quantity)} Units</p></td>
                                    <td className="px-6 py-4 text-right"><p className="font-bold text-slate-900 text-sm">{new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(asset.current_price)}</p></td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingId(asset.id); setFormData({...asset, quantity: asset.quantity.toString(), avg_buy_price: asset.avg_buy_price.toString(), wallet_id: ''}); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md transition-colors"><Edit3 size={14} /></button>
                                            <button onClick={() => handleDeleteSingle(asset.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {assets.length === 0 && (<tr><td colSpan={4} className="py-16 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No assets in portfolio.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-[10px] font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-widest"><History size={14} className="text-slate-400"/> Recent Activity</h3>
                <div className="space-y-4">
                    {history.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'buy' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {tx.type === 'buy' ? <ArrowUpRight size={14}/> : <Activity size={14}/>}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-900">{tx.asset?.symbol}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{tx.type} • {new Date(tx.recorded_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                                </div>
                            </div>
                            <p className="text-xs font-bold text-slate-900">{new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(tx.total_amount)}</p>
                        </div>
                    ))}
                    {history.length === 0 && <p className="text-center py-12 text-[9px] font-bold text-slate-400 uppercase tracking-widest">No logs yet.</p>}
                </div>
            </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-2xl shadow-xl p-5 md:p-6 overflow-hidden text-black font-black">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Update Asset' : 'Add New Asset'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Asset Type</label>
                    <select required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-900 outline-none" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                      <option value="stock">Stock</option><option value="crypto">Crypto</option><option value="bond">Bond</option><option value="mutual_fund">Fund</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Symbol</label>
                    <input type="text" placeholder="e.g. BBCA" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold uppercase text-slate-900 outline-none" value={formData.symbol} onChange={(e) => setFormData({ ...formData, symbol: e.target.value })} disabled={!!editingId} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Quantity</label>
                        <input type="number" step="any" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 outline-none" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Buy Price</label>
                        <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 outline-none" value={formatDisplayAmount(formData.avg_buy_price)} onChange={(e) => setFormData({ ...formData, avg_buy_price: e.target.value.replace(/\D/g, "") })} />
                    </div>
                </div>

                {!editingId && (
                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                        <label className="text-[9px] font-bold text-blue-600 mb-2 block uppercase tracking-widest">Auto-Deduct Wallet</label>
                        <select className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-900 outline-none" value={formData.wallet_id} onChange={(e) => setFormData({ ...formData, wallet_id: e.target.value })}>
                            <option value="">No deduction</option>
                            {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                )}

                <button type="submit" disabled={syncing} className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-slate-800 transition-all mt-2 text-xs uppercase tracking-widest active:scale-[0.98]">
                  {syncing ? 'Synchronizing...' : 'Save Asset Record'}
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
    <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-100 transition-all">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="p-1.5 md:p-2 bg-slate-50 rounded-lg text-slate-600 group-hover:scale-110 transition-transform">{icon}</div>
        <div className="text-right">
          <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
          <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sub}</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end gap-1 sm:gap-2">
        <p className={`text-base md:text-2xl font-bold ${color} tracking-tight truncate`}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)}</p>
        {percentage !== undefined && (
          <span className={`text-[9px] md:text-[10px] font-bold mb-1 px-1.5 py-0.5 rounded-full w-fit ${percentage >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {percentage.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}