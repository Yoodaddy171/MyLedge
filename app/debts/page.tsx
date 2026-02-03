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
import type { Debt } from '@/contexts/GlobalDataContext';
import type { WalletOption } from '@/lib/types';

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
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
    notes: '',
    debt_type: 'regular' as 'regular' | 'paylater' | 'loan' | 'credit_card',
    installment_count: '',
    start_date: new Date().toISOString().split('T')[0],
    wallet_id: ''
  });

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedDebtForPay, setSelectedDebtForPay] = useState<Debt | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', wallet_id: '', date: new Date().toISOString().split('T')[0] });
  const [wallets, setWallets] = useState<WalletOption[]>([]);

  useBodyScrollLock(isModalOpen || isPayModalOpen);

  useEffect(() => {
    fetchDebts();
    fetchWallets();
  }, []);

  async function fetchWallets() {
    // CRITICAL: Filter by user_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('wallets')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('is_active', true);
    setWallets(data || []);
  }


  async function fetchDebts() {
    try {
      setLoading(true);
      // CRITICAL: Filter by user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)
        .order('remaining_amount', { ascending: false });
      if (error) throw error;
      setDebts(data || []);
    } catch (err) { toast.error("Failed to load debts"); }
    finally { setLoading(false); }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isPaylater = formData.debt_type === 'paylater';
    const installmentCount = isPaylater ? Number(formData.installment_count) : null;
    const monthlyPayment = isPaylater && installmentCount
      ? Math.ceil(Number(formData.total_amount) / installmentCount)
      : Number(formData.monthly_payment) || 0;

    // Calculate due_date based on installment count if paylater
    let dueDate = formData.due_date || null;
    if (isPaylater && installmentCount && formData.start_date) {
      const startDate = new Date(formData.start_date);
      startDate.setMonth(startDate.getMonth() + installmentCount);
      dueDate = startDate.toISOString().split('T')[0];
    }

    const payload = {
      user_id: user.id,
      name: formData.name.trim(),
      creditor: formData.creditor.trim(),
      total_amount: Number(formData.total_amount),
      remaining_amount: Number(formData.remaining_amount || formData.total_amount),
      monthly_payment: monthlyPayment,
      interest_rate: Number(formData.interest_rate) || 0,
      start_date: formData.start_date || null,
      due_date: dueDate,
      notes: formData.notes.trim(),
      is_paid: Number(formData.remaining_amount || formData.total_amount) <= 0,
      debt_type: formData.debt_type,
      installment_count: installmentCount,
      installment_paid: 0
    };

    let debtId = editingId;

    if (editingId) {
      await supabase.from('debts').update(payload).eq('id', editingId);
    } else {
      const { data: newDebt, error } = await supabase.from('debts').insert(payload).select().single();
      if (error) {
        toast.error(error.message);
        return;
      }
      debtId = newDebt.id;

      // Create recurring transaction for paylater
      if (isPaylater && installmentCount && formData.wallet_id && debtId) {
        const startDate = new Date(formData.start_date);
        // Calculate end date (last payment month)
        const endDate = new Date(formData.start_date);
        endDate.setMonth(endDate.getMonth() + installmentCount - 1);

        const recurringPayload = {
          user_id: user.id,
          type: 'expense' as const,
          amount: monthlyPayment,
          description: `Cicilan ${formData.name.trim()}`,
          notes: `Paylater - ${installmentCount}x cicilan`,
          wallet_id: Number(formData.wallet_id),
          debt_id: debtId,
          frequency: 'monthly' as const,
          start_date: formData.start_date,
          end_date: endDate.toISOString().split('T')[0],
          next_occurrence: formData.start_date,
          is_active: true,
          auto_generate: true
        };

        const { error: recurringError } = await supabase.from('recurring_transactions').insert(recurringPayload);
        if (recurringError) {
          console.error('Failed to create recurring transaction:', recurringError);
          toast.error('Debt created but failed to setup recurring payment');
        } else {
          toast.success(`Paylater added with ${installmentCount}x monthly recurring payment`);
        }
      }
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      name: '',
      creditor: '',
      total_amount: '',
      remaining_amount: '',
      monthly_payment: '',
      interest_rate: '',
      due_date: '',
      notes: '',
      debt_type: 'regular',
      installment_count: '',
      start_date: new Date().toISOString().split('T')[0],
      wallet_id: ''
    });
    fetchDebts();
    if (!isPaylater || editingId) {
      toast.success(editingId ? "Debt updated" : "New debt added");
    }
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
      notes: debt.notes || '',
      debt_type: debt.debt_type || 'regular',
      installment_count: (debt.installment_count || '').toString(),
      start_date: debt.start_date || new Date().toISOString().split('T')[0],
      wallet_id: ''
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

  // Filter debts due within 7 days
  const upcomingDebts = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    return debts
      .filter(debt => {
        if (debt.remaining_amount <= 0) return false;
        if (!debt.due_date) return false;
        const dueDate = new Date(debt.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && dueDate <= sevenDaysLater;
      })
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  }, [debts]);

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-blue-600">Debts & Liabilities</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">Track what you owe</p>
        </div>
        <button onClick={() => {
          setEditingId(null);
          setFormData({ name: '', creditor: '', total_amount: '', remaining_amount: '', monthly_payment: '', interest_rate: '', due_date: '', notes: '', debt_type: 'regular', installment_count: '', start_date: new Date().toISOString().split('T')[0], wallet_id: '' });
          setIsModalOpen(true);
        }} className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] md:text-xs font-bold hover:bg-slate-800 shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest">
          <Plus size={16} /> Add Debt
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-8">
        <MetricCard title="Remaining" value={totalDebt} icon={<TrendingDown className="text-red-500" size={16} />} sub="Owed Balance" color="text-red-600" />
        <MetricCard title="Progress" value={totalOriginal - totalDebt} percentage={repaymentProgress} icon={<CheckCircle2 className="text-emerald-500" size={16} />} sub="Total Paid" color="text-emerald-600" isProgress />
      </div>

      {/* Upcoming Due Dates Alert */}
      {upcomingDebts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-4 md:p-5 mb-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl shrink-0">
              <AlertCircle className="text-amber-600" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm md:text-base font-bold text-amber-900">⚠️ Segera Jatuh Tempo</h3>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-[10px] font-bold">
                  {upcomingDebts.length} tagihan
                </span>
              </div>
              <div className="space-y-2">
                {upcomingDebts.map(debt => {
                  const dueDate = new Date(debt.due_date!);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  dueDate.setHours(0, 0, 0, 0);
                  const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isUrgent = daysLeft <= 2;

                  return (
                    <div
                      key={debt.id}
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-100 shadow-sm"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isUrgent ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs md:text-sm font-bold text-slate-900 truncate">
                            {debt.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {debt.creditor || 'No creditor'} • Jatuh tempo {dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <div className="text-right">
                          <p className="text-xs md:text-sm font-bold text-slate-900">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(debt.remaining_amount)}
                          </p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${isUrgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                            {daysLeft === 0 ? '🔥 Hari Ini!' : daysLeft === 1 ? '⏰ Besok' : `${daysLeft} hari lagi`}
                          </span>
                        </div>
                        <button
                          onClick={() => openPayModal(debt)}
                          className="px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-600 transition-all shadow-sm"
                        >
                          Bayar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

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
                          <div className="flex items-center gap-2">
                            <h3 className={`text-sm font-bold truncate max-w-[120px] ${debt.remaining_amount <= 0 ? 'line-through text-slate-400' : 'text-slate-900'}`}>{debt.name}</h3>
                            {(debt as any).debt_type === 'paylater' && (
                              <span className="px-1.5 py-0.5 bg-violet-100 text-violet-600 text-[8px] font-bold rounded uppercase tracking-wider">
                                {(debt as any).installment_count}x
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                            <Calendar size={10} /> {debt.due_date ? new Date(debt.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'No Deadline'}
                            {(debt as any).debt_type === 'paylater' && (debt as any).installment_paid !== undefined && (
                              <span className="text-violet-500">• {(debt as any).installment_paid}/{(debt as any).installment_count} paid</span>
                            )}
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
                  <p className="text-[10px] text-red-500 font-bold mt-0.5">Left: {new Intl.NumberFormat('id-ID').format(selectedDebtForPay?.remaining_amount ?? 0)}</p>
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Tipe Hutang</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-900 outline-none"
                    value={formData.debt_type}
                    onChange={(e) => setFormData({ ...formData, debt_type: e.target.value as any, remaining_amount: formData.debt_type !== 'paylater' && e.target.value === 'paylater' ? formData.total_amount : formData.remaining_amount })}
                    disabled={!!editingId}
                  >
                    <option value="regular">Hutang Biasa</option>
                    <option value="paylater">Paylater / Cicilan</option>
                    <option value="loan">Pinjaman Bank</option>
                    <option value="credit_card">Kartu Kredit</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Nama Hutang</label>
                  <input type="text" placeholder={formData.debt_type === 'paylater' ? 'e.g. iPhone 15 Shopee Paylater' : 'e.g. Car Loan'} required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 outline-none" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Kreditor</label>
                  <input type="text" placeholder={formData.debt_type === 'paylater' ? 'Shopee, Tokopedia, dll.' : 'Bank, Person, etc.'} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 outline-none" value={formData.creditor} onChange={(e) => setFormData({ ...formData, creditor: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Total Hutang</label>
                    <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 outline-none" value={formatDisplayAmount(formData.total_amount)} onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setFormData({ ...formData, total_amount: val, remaining_amount: formData.debt_type === 'paylater' ? val : formData.remaining_amount });
                    }} />
                  </div>
                  {formData.debt_type !== 'paylater' ? (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Sisa</label>
                      <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 outline-none" value={formatDisplayAmount(formData.remaining_amount)} onChange={(e) => setFormData({ ...formData, remaining_amount: e.target.value.replace(/\D/g, "") })} />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Jumlah Cicilan</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        placeholder="1"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 outline-none"
                        value={formData.installment_count}
                        onChange={(e) => setFormData({ ...formData, installment_count: e.target.value })}
                        disabled={!!editingId}
                      />
                    </div>
                  )}
                </div>

                {formData.debt_type === 'paylater' && formData.total_amount && formData.installment_count && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1">Cicilan per Bulan</p>
                    <p className="text-lg font-bold text-blue-700">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.ceil(Number(formData.total_amount) / Number(formData.installment_count)))}
                    </p>
                  </div>
                )}

                {formData.debt_type === 'paylater' && !editingId && (
                  <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 space-y-3">
                    <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest">Setup Recurring Payment</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1 block">Mulai Cicilan</label>
                        <input
                          type="date"
                          required
                          className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-900 outline-none"
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1 block">Bayar dari Wallet</label>
                        <select
                          required
                          className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-900 outline-none"
                          value={formData.wallet_id}
                          onChange={(e) => setFormData({ ...formData, wallet_id: e.target.value })}
                        >
                          <option value="">Pilih wallet...</option>
                          {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </div>
                    </div>
                    {formData.start_date && Number(formData.installment_count) > 1 && (
                      <div className="p-2.5 bg-violet-50 rounded-lg border border-violet-100">
                        <p className="text-[9px] font-bold text-violet-500 uppercase tracking-widest mb-1">Periode Cicilan</p>
                        <p className="text-xs font-bold text-violet-700">
                          {(() => {
                            const startDate = new Date(formData.start_date);
                            const endDate = new Date(formData.start_date);
                            endDate.setMonth(endDate.getMonth() + Number(formData.installment_count) - 1);
                            const formatDate = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                            return `${formatDate(startDate)} - ${formatDate(endDate)}`;
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {formData.debt_type !== 'paylater' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Cicilan/Bulan</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 outline-none" value={formatDisplayAmount(formData.monthly_payment)} onChange={(e) => setFormData({ ...formData, monthly_payment: e.target.value.replace(/\D/g, "") })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Jatuh Tempo</label>
                      <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[10px] font-bold text-slate-900 outline-none" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Catatan</label>
                  <textarea placeholder="Detail, terms, dll..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-900 outline-none h-16 resize-none" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-slate-800 transition-all mt-2 text-xs uppercase tracking-widest active:scale-[0.98]">
                  {formData.debt_type === 'paylater' && !editingId ? 'Simpan & Buat Recurring' : 'Simpan'}
                </button>
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
