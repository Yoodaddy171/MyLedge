'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDisplayAmount } from '@/lib/utils';
import {
  TrendingDown, Plus, Download, Trash2, X, Edit3, Calendar, AlertCircle, CheckCircle2, TrendingUp, Activity, Landmark
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';

export default function DebtsPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({ 
    name: '', 
    creditor: '',
    total_amount: '', 
    remaining_amount: '', 
    monthly_payment: '',
    interest_rate: '',
    due_date: '', 
    notes: '' 
  });

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedDebtForPay, setSelectedDebtForPay] = useState<any>(null);
  const [payForm, setPayForm] = useState({ amount: '', wallet_id: '', date: new Date().toISOString().split('T')[0] });
  const [wallets, setWallets] = useState<any[]>([]);

  useBodyScrollLock(isModalOpen || isPayModalOpen);

  useEffect(() => { 
    fetchDebts(); 
    fetchWallets();
  }, []);

  async function fetchWallets() {
    const { data } = await supabase.from('wallets').select('id, name').eq('is_active', true);
    setWallets(data || []);
  }


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
      creditor: formData.creditor.trim(),
      total_amount: Number(formData.total_amount),
      remaining_amount: Number(formData.remaining_amount),
      monthly_payment: Number(formData.monthly_payment) || 0,
      interest_rate: Number(formData.interest_rate) || 0,
      due_date: formData.due_date || null,
      notes: formData.notes.trim(),
      is_paid: Number(formData.remaining_amount) <= 0
    };
    if (editingId) await supabase.from('debts').update(payload).eq('id', editingId);
    else await supabase.from('debts').insert(payload);
    setIsModalOpen(false); setEditingId(null); 
    setFormData({ 
      name: '', 
      creditor: '',
      total_amount: '', 
      remaining_amount: '', 
      monthly_payment: '',
      interest_rate: '',
      due_date: '', 
      notes: '' 
    }); 
    fetchDebts();
    toast.success(editingId ? "Debt updated" : "New debt added");
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtForPay) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const amount = Number(payForm.amount.replace(/\D/g, ""));
    if (amount <= 0) return toast.error("Invalid amount");

    if (amount > selectedDebtForPay.remaining_amount) {
      return toast.error(`Payment amount (${formatDisplayAmount(amount)}) exceeds remaining debt (${formatDisplayAmount(selectedDebtForPay.remaining_amount)})`);
    }

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'expense',
      amount: amount,
      description: `Payment for ${selectedDebtForPay.name}`,
      date: payForm.date,
      wallet_id: payForm.wallet_id,
      debt_id: selectedDebtForPay.id,
      notes: 'Debt Repayment'
    });

    if (error) toast.error(error.message);
    else {
      toast.success("Payment recorded");
      setIsPayModalOpen(false);
      setSelectedDebtForPay(null);
      setPayForm({ amount: '', wallet_id: '', date: new Date().toISOString().split('T')[0] });
      fetchDebts();
    }
  };

  const openEditModal = (debt: any) => {
    setEditingId(debt.id);
    setFormData({ 
      name: debt.name, 
      creditor: debt.creditor || '',
      total_amount: debt.total_amount.toString(), 
      remaining_amount: debt.remaining_amount.toString(), 
      monthly_payment: (debt.monthly_payment || '').toString(),
      interest_rate: (debt.interest_rate || '').toString(),
      due_date: debt.due_date || '', 
      notes: debt.notes || '' 
    });
    setIsModalOpen(true);
  };

  const openPayModal = (debt: any) => {
    setSelectedDebtForPay(debt);
    setPayForm({ amount: '', wallet_id: '', date: new Date().toISOString().split('T')[0] });
    setIsPayModalOpen(true);
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
    <div className="max-w-6xl mx-auto pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Debts & Liabilities</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">Track what you owe</p>
        </div>
        <button onClick={() => { 
          setEditingId(null); 
          setFormData({ name: '', creditor: '', total_amount: '', remaining_amount: '', monthly_payment: '', interest_rate: '', due_date: '', notes: '' }); 
          setIsModalOpen(true); 
        }} className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] md:text-xs font-bold hover:bg-slate-800 shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest">
          <Plus size={16} /> Add Debt
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-8">
        <MetricCard title="Remaining" value={totalDebt} icon={<TrendingDown className="text-red-500" size={16} />} sub="Owed Balance" color="text-red-600" />
        <MetricCard title="Progress" value={totalOriginal - totalDebt} percentage={repaymentProgress} icon={<CheckCircle2 className="text-emerald-500" size={16} />} sub="Total Paid" color="text-emerald-600" isProgress />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing liabilities...</div>
        ) : debts.length === 0 ? (
          <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-widest">No records found</div>
        ) : (
          debts.map((debt) => {
            const progress = ((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100;
            return (
              <motion.div
                key={debt.id}
                layout
                className={`group bg-white p-4 md:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center gap-4 ${debt.remaining_amount <= 0 ? 'opacity-60 border-slate-100 bg-slate-50/30' : 'border-slate-100 hover:border-red-100 hover:shadow-sm'}`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0" checked={selectedIds.includes(debt.id)} onChange={() => {
                    if (selectedIds.includes(debt.id)) setSelectedIds(selectedIds.filter(i => i !== debt.id));
                    else setSelectedIds([...selectedIds, debt.id]);
                  }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shadow-sm border border-slate-100 ${debt.remaining_amount <= 0 ? 'bg-slate-50 text-slate-400' : 'bg-red-50 text-red-500'}`}>
                          <Landmark size={18} />
                        </div>
                        <div className="min-w-0">
                          <h3 className={`text-sm font-bold truncate max-w-[150px] ${debt.remaining_amount <= 0 ? 'line-through text-slate-400' : 'text-slate-900'}`}>{debt.name}</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                            <Calendar size={10} /> {debt.due_date ? new Date(debt.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'No Deadline'}
                          </p>
                        </div>
                      </div>
                      <div className="text-left md:text-right">
                        <p className={`text-sm md:text-base font-bold ${debt.remaining_amount <= 0 ? 'text-slate-400' : 'text-slate-900'}`}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(debt.remaining_amount)}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">of {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(debt.total_amount)}</p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex shadow-inner">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className={`h-full ${debt.remaining_amount <= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-end gap-2 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4">
                  {debt.remaining_amount > 0 && (
                    <button onClick={() => openPayModal(debt)} className="flex-1 sm:flex-none px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all border border-emerald-100 shadow-sm active:scale-95">
                      Pay
                    </button>
                  )}
                  <div className="flex gap-1">
                    <button onClick={() => openEditModal(debt)} className="p-2 text-slate-400 hover:text-blue-600 transition-all rounded-lg"><Edit3 size={14} /></button>
                    <button onClick={() => handleDeleteSingle(debt.id)} className="p-2 text-slate-400 hover:text-red-600 transition-all rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Pay Modal */}
      <AnimatePresence>
        {isPayModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPayModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl p-5 md:p-6 overflow-hidden text-black font-black">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-900">Record Payment</h2>
                <button onClick={() => setIsPayModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handlePaySubmit} className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1 block">Selected Loan</label>
                    <p className="font-bold text-sm text-slate-900">{selectedDebtForPay?.name}</p>
                    <p className="text-[10px] text-red-500 font-bold mt-0.5">Left: {new Intl.NumberFormat('id-ID').format(selectedDebtForPay?.remaining_amount)}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Amount</label>
                  <input type="text" placeholder="0" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-base font-bold shadow-sm outline-none focus:ring-2 focus:ring-emerald-100 text-slate-900" value={formatDisplayAmount(payForm.amount)} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value.replace(/\D/g, "") })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Pay From</label>
                        <select required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-900 outline-none" value={payForm.wallet_id} onChange={(e) => setPayForm({ ...payForm, wallet_id: e.target.value })}>
                            <option value="">Select...</option>
                            {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Date</label>
                        <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-900 outline-none" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} />
                    </div>
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-emerald-700 transition-all mt-2 text-xs uppercase tracking-widest active:scale-[0.98]">Confirm Payment</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Modal Integration remains consistent */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl p-5 md:p-6 max-h-[90vh] overflow-y-auto no-scrollbar overscroll-contain text-black font-black">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Update Debt' : 'New Debt'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Debt Name</label>
                  <input type="text" placeholder="e.g. Car Loan" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 outline-none" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Creditor</label>
                  <input type="text" placeholder="Bank, Person, etc." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 outline-none" value={formData.creditor} onChange={(e) => setFormData({ ...formData, creditor: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Original</label>
                    <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 outline-none" value={formatDisplayAmount(formData.total_amount)} onChange={(e) => setFormData({ ...formData, total_amount: e.target.value.replace(/\D/g, "") })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Remaining</label>
                    <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 outline-none" value={formatDisplayAmount(formData.remaining_amount)} onChange={(e) => setFormData({ ...formData, remaining_amount: e.target.value.replace(/\D/g, "") })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Monthly</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 outline-none" value={formatDisplayAmount(formData.monthly_payment)} onChange={(e) => setFormData({ ...formData, monthly_payment: e.target.value.replace(/\D/g, "") })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Due Date</label>
                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[10px] font-bold text-slate-900 outline-none" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Notes</label>
                  <textarea placeholder="Terms, details..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-900 outline-none h-20 resize-none" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-slate-800 transition-all mt-2 text-xs uppercase tracking-widest active:scale-[0.98]">Save Debt Record</button>
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

function MetricCard({ title, value, percentage, icon, color, sub, isProgress = false }: any) {
  return (
    <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-red-100 transition-all">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="p-1.5 md:p-2 bg-slate-50 rounded-lg text-slate-600 group-hover:scale-110 transition-transform">{icon}</div>
        <div className="text-right">
          <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
          <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sub}</p>
        </div>
      </div>
      <div>
        <p className={`text-sm md:text-2xl font-bold ${color} tracking-tight truncate`}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)}</p>
        {isProgress && percentage !== undefined && (
          <div className="mt-3 md:mt-4 space-y-1">
            <div className="flex justify-between text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Paid Off</span>
              <span>{Math.round(percentage)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1 md:h-1.5 rounded-full overflow-hidden shadow-inner">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(percentage, 100)}%` }} className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
