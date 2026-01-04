'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingDown, Plus, Download, Trash2, X, Edit3, Calendar, AlertCircle, CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function DebtsPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({ name: '', total_amount: '', remaining_amount: '', due_date: '', notes: '' });

  useEffect(() => { fetchDebts(); }, []);

  const formatDisplayAmount = (val: string) => {
    if (!val) return "";
    const num = val.replace(/\D/g, "");
    return new Intl.NumberFormat('id-ID').format(Number(num));
  };

  async function fetchDebts() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('debts').select('*').order('remaining_amount', { ascending: false });
      if (error) throw error;
      setDebts(data || []);
    } catch (err: any) { console.error(err); }
    finally { setLoading(false); }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { user_id: user.id, name: formData.name.trim(), total_amount: Number(formData.total_amount), remaining_amount: Number(formData.remaining_amount), due_date: formData.due_date || null, notes: formData.notes, is_paid: Number(formData.remaining_amount) <= 0 };
    if (editingId) await supabase.from('debts').update(payload).eq('id', editingId);
    else await supabase.from('debts').insert(payload);
    setIsModalOpen(false); setEditingId(null); setFormData({ name: '', total_amount: '', remaining_amount: '', due_date: '', notes: '' }); fetchDebts();
  };

  const openEditModal = (debt: any) => {
    setEditingId(debt.id);
    setFormData({ name: debt.name, total_amount: debt.total_amount.toString(), remaining_amount: debt.remaining_amount.toString(), due_date: debt.due_date || '', notes: debt.notes || '' });
    setIsModalOpen(true);
  };

  const handleDeleteSingle = async (id: number) => {
    if (!confirm("Delete record?")) return;
    await supabase.from('debts').delete().eq('id', id); fetchDebts();
  };

  const handleDeleteBulk = async () => {
    if (!confirm(`Delete ${selectedIds.length} records?`)) return;
    await supabase.from('debts').delete().in('id', selectedIds);
    setSelectedIds([]); fetchDebts();
  };

  const totalDebt = debts.reduce((acc, curr) => acc + Number(curr.remaining_amount), 0);
  const totalOriginal = debts.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
  const repaymentProgress = totalOriginal > 0 ? ((totalOriginal - totalDebt) / totalOriginal) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto pb-20 text-black font-black">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 md:mb-12">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-black tracking-tighter">Liabilities</h1>
          <p className="text-slate-700 text-sm mt-1 font-bold">Manage your debt progress.</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({name:'', total_amount:'', remaining_amount:'', due_date:'', notes:''}); setIsModalOpen(true); }} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 rounded-[1.5rem] text-xs font-black text-white hover:bg-red-700 shadow-xl uppercase tracking-widest transition-all">
          <Plus size={16} /> New Debt
        </button>
      </header>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[2rem] md:rounded-[2.5rem] shadow-2xl p-6 md:p-10 overflow-hidden text-black font-black max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl md:text-2xl font-black">{editingId ? 'Edit Record' : 'New Liability'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-black"><X size={20} /></button>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Creditor Name</label>
                  <input type="text" placeholder="e.g. Bank" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-red-500 outline-none transition-all shadow-sm" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Total Loan</label>
                    <input type="text" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-red-500 outline-none transition-all shadow-sm" value={formatDisplayAmount(formData.total_amount)} onChange={(e) => setFormData({...formData, total_amount: e.target.value.replace(/\D/g, "")})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Remaining</label>
                    <input type="text" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-red-500 outline-none transition-all shadow-sm" value={formatDisplayAmount(formData.remaining_amount)} onChange={(e) => setFormData({...formData, remaining_amount: e.target.value.replace(/\D/g, "")})} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Next Due Date</label>
                  <input type="date" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-red-500 outline-none transition-all shadow-sm" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-black text-white font-black py-5 rounded-[1.5rem] shadow-lg hover:bg-slate-800 transition-all mt-4 uppercase tracking-widest text-[10px]">Record Debt</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-6 md:bottom-10 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-[110] bg-black text-white px-6 md:px-8 py-4 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl flex flex-col sm:flex-row items-center gap-4 border border-white/10 backdrop-blur-xl">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400"><span className="text-white">{selectedIds.length}</span> selected</div>
            <div className="flex gap-6 items-center">
              <button onClick={handleDeleteBulk} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-black text-xs uppercase tracking-widest transition-colors"><Trash2 size={16} /> Delete</button>
              <button onClick={() => setSelectedIds([])} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-10 mb-12">
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-slate-200 shadow-sm text-black">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 tracking-[0.2em]">Total Remaining</p>
          <p className="text-3xl md:text-5xl font-black text-red-600 tracking-tighter">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalDebt)}</p>
        </div>
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-slate-200 shadow-sm text-black">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 tracking-[0.2em]">Freedom Progress</p>
          <div className="flex items-end gap-6">
            <p className="text-3xl md:text-5xl font-black text-black tracking-tighter">{repaymentProgress.toFixed(1)}%</p>
            <div className="flex-1 bg-slate-100 h-3 rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${repaymentProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        {loading ? (<div className="py-20 text-center animate-pulse font-black text-[10px] uppercase text-slate-400">Syncing...</div>) : 
         debts.length === 0 ? (<div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400 font-black uppercase text-[10px]">No records.</div>) : (
            debts.map((debt) => {
                const progress = ((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100;
                return (
                    <motion.div key={debt.id} layout className={`group bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 transition-all flex items-center gap-6 md:gap-10 ${debt.remaining_amount <= 0 ? 'opacity-50 border-slate-50' : 'border-slate-100 hover:border-red-100 hover:shadow-2xl'}`}>
                        <input type="checkbox" className="w-5 h-5 md:w-6 md:h-6 rounded-lg border-slate-300 text-red-600 focus:ring-red-500" checked={selectedIds.includes(debt.id)} onChange={() => {
                            if (selectedIds.includes(debt.id)) setSelectedIds(selectedIds.filter(i => i !== debt.id));
                            else setSelectedIds([...selectedIds, debt.id]);
                        }} />
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                                <div>
                                    <h3 className={`text-base md:text-xl font-black ${debt.remaining_amount <= 0 ? 'line-through' : 'text-black'} tracking-tight truncate max-w-[200px] sm:max-w-none`}>{debt.name}</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1"><Calendar size={12} className="text-red-500" /> {debt.due_date ? new Date(debt.due_date).toLocaleDateString('id-ID', {day:'numeric', month:'short'}) : 'No date'}</p>
                                </div>
                                <div className="text-left sm:text-right">
                                    <p className="text-base md:text-xl font-black text-black tracking-tight">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(debt.remaining_amount)}</p>
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">of {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(debt.total_amount)}</p>
                                </div>
                            </div>
                            <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden flex shadow-inner">
                                <div className="h-full bg-red-500" style={{ width: `${100 - progress}%` }} />
                                <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => openEditModal(debt)} className="p-3 text-slate-400 hover:text-blue-600 transition-all"><Edit3 size={18} /></button>
                            <button onClick={() => handleDeleteSingle(debt.id)} className="p-3 text-slate-400 hover:text-red-600 transition-all"><Trash2 size={18} /></button>
                        </div>
                    </motion.div>
                )
            })
        )}
      </div>
    </div>
  );
}
