'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  TrendingDown, Plus, Download, Trash2, X, Edit3, Calendar, AlertCircle, CheckCircle2, TrendingUp, Activity, Landmark
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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
    const num = val.toString().replace(/\D/g, "");
    return new Intl.NumberFormat('id-ID').format(Number(num));
  };

  async function fetchDebts() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('debts').select('*').order('remaining_amount', { ascending: false });
      if (error) throw error;
      setDebts(data || []);
    } catch (err: any) { toast.error("Failed to load debts"); }
    finally { setLoading(false); }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      user_id: user.id,
      name: formData.name.trim(),
      total_amount: Number(formData.total_amount),
      remaining_amount: Number(formData.remaining_amount),
      due_date: formData.due_date || null,
      notes: formData.notes.trim(),
      is_paid: Number(formData.remaining_amount) <= 0
    };
    if (editingId) await supabase.from('debts').update(payload).eq('id', editingId);
    else await supabase.from('debts').insert(payload);
    setIsModalOpen(false); setEditingId(null); setFormData({ name: '', total_amount: '', remaining_amount: '', due_date: '', notes: '' }); fetchDebts();
    toast.success(editingId ? "Debt updated" : "New debt added");
  };

  const openEditModal = (debt: any) => {
    setEditingId(debt.id);
    setFormData({ name: debt.name, total_amount: debt.total_amount.toString(), remaining_amount: debt.remaining_amount.toString(), due_date: debt.due_date || '', notes: debt.notes || '' });
    setIsModalOpen(true);
  };

  const handleDeleteSingle = async (id: number) => {
    if (!confirm("Are you sure you want to delete this debt?")) return;
    await supabase.from('debts').delete().eq('id', id); fetchDebts();
    toast.success("Debt deleted");
  };

  const handleDeleteBulk = async () => {
    if (!confirm(`Delete ${selectedIds.length} debts?`)) return;
    await supabase.from('debts').delete().in('id', selectedIds);
    setSelectedIds([]); fetchDebts();
    toast.success("Debts deleted");
  };

  const totalDebt = debts.reduce((acc, curr) => acc + Number(curr.remaining_amount), 0);
  const totalOriginal = debts.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
  const repaymentProgress = totalOriginal > 0 ? ((totalOriginal - totalDebt) / totalOriginal) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto pb-20 text-black font-black uppercase">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-black uppercase">My Debts</h1>
          <p className="text-slate-700 text-xs mt-1 font-bold tracking-tight uppercase">Tracking what I owe & payment progress.</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ name: '', total_amount: '', remaining_amount: '', due_date: '', notes: '' }); setIsModalOpen(true); }} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 rounded-xl text-[10px] font-black text-white hover:bg-red-700 shadow-xl uppercase tracking-widest transition-all">
          <Plus size={14} /> Add New Debt
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <MetricCard
          title="Total Debt Left"
          value={totalDebt}
          icon={<TrendingDown className="text-red-500" />}
          sub="Remaining Balance"
          color="text-red-600"
        />
        <MetricCard
          title="Repayment Progress"
          value={totalOriginal - totalDebt}
          percentage={repaymentProgress}
          icon={<CheckCircle2 className="text-emerald-500" />}
          sub="Paid Off"
          color="text-emerald-600"
          isProgress
        />
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="py-20 text-center animate-pulse font-black text-[10px] uppercase text-slate-400">Syncing Debt status...</div>
        ) : debts.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400 font-black uppercase text-[10px]">No debts recorded.</div>
        ) : (
          debts.map((debt) => {
            const progress = ((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100;
            return (
              <motion.div
                key={debt.id}
                layout
                className={`group bg-white p-6 rounded-2xl border-2 transition-all flex items-center gap-6 ${debt.remaining_amount <= 0 ? 'opacity-50 border-slate-50' : 'border-slate-100 hover:border-red-100'}`}
              >
                <div className="flex items-center gap-6 flex-1">
                  <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-red-600" checked={selectedIds.includes(debt.id)} onChange={() => {
                    if (selectedIds.includes(debt.id)) setSelectedIds(selectedIds.filter(i => i !== debt.id));
                    else setSelectedIds([...selectedIds, debt.id]);
                  }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-red-500 shadow-sm border border-slate-100 ${debt.remaining_amount <= 0 ? 'bg-slate-50' : 'bg-red-50'}`}>
                          <Landmark size={20} />
                        </div>
                        <div>
                          <h3 className={`text-base font-black ${debt.remaining_amount <= 0 ? 'line-through text-slate-400' : 'text-black'} tracking-tight uppercase`}>{debt.name}</h3>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                            <Calendar size={12} className="text-red-500" /> {debt.due_date ? new Date(debt.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Due Date'}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className={`text-lg font-black tracking-tighter ${debt.remaining_amount <= 0 ? 'text-slate-400' : 'text-black'}`}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(debt.remaining_amount)}</p>
                        <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Out of: {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(debt.total_amount)}</p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden flex shadow-inner border border-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                    <div className="flex justify-between mt-3">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Progress</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${debt.remaining_amount <= 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{progress.toFixed(1)}% Paid</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-all border-l border-slate-50 pl-6 h-10 items-center">
                  <button onClick={() => openEditModal(debt)} className="p-2 text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-blue-50 rounded-lg"><Edit3 size={18} /></button>
                  <button onClick={() => handleDeleteSingle(debt.id)} className="p-2 text-slate-400 hover:text-red-600 transition-all border border-transparent hover:border-red-50 rounded-lg"><Trash2 size={18} /></button>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 overflow-hidden text-black font-black max-h-[95vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black uppercase tracking-tight">{editingId ? 'Edit Debt' : 'Add New Debt'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Who do I owe?</label>
                  <input type="text" placeholder="e.g. Bank BCA Credit Card" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-black shadow-sm outline-none focus:border-red-500 transition-all" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Principal</label>
                    <input type="text" placeholder="0" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-black shadow-sm outline-none focus:border-red-500 transition-all" value={formatDisplayAmount(formData.total_amount)} onChange={(e) => setFormData({ ...formData, total_amount: e.target.value.replace(/\D/g, "") })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Balance</label>
                    <input type="text" placeholder="0" required className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-black shadow-sm outline-none focus:border-red-500 transition-all" value={formatDisplayAmount(formData.remaining_amount)} onChange={(e) => setFormData({ ...formData, remaining_amount: e.target.value.replace(/\D/g, "") })} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Due Date</label>
                  <input type="date" className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-4 text-sm font-black shadow-sm outline-none focus:border-red-500 transition-all" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2 block">Notes</label>
                  <textarea placeholder="Interest rates, terms, etc..." className="w-full bg-white border-2 border-slate-100 rounded-xl px-5 py-3 text-xs font-bold shadow-sm outline-none focus:border-red-500 min-h-[80px] resize-none" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>
                <button type="submit" className="w-full bg-red-600 text-white font-black py-4 rounded-xl shadow-xl hover:bg-red-700 transition-all mt-4 uppercase tracking-widest text-[10px]">Save Debt Record</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[130] bg-black text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-6 border border-white/10 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-black"><span className="text-white">{selectedIds.length}</span> selected</div>
            <button onClick={handleDeleteBulk} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-black text-[10px] uppercase tracking-widest transition-colors"><Trash2 size={16} /> Delete</button>
            <button onClick={() => setSelectedIds([])} className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({ title, value, percentage, icon, color, sub, isProgress = false }: any) {
  return (
    <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-2xl border-2 border-slate-50 shadow-xl relative overflow-hidden group">
      <div className="flex items-center justify-between mb-8">
        <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 shadow-sm">{icon}</div>
        <div className="text-right">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</p>
          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{sub}</p>
        </div>
      </div>
      <div>
        <p className={`text-3xl font-black ${color} tracking-tighter`}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)}</p>
        {isProgress && percentage !== undefined && (
          <div className="mt-8 space-y-2">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
              <span>Paid Off</span>
              <span>{Math.round(percentage)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(percentage, 100)}%` }}
                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
