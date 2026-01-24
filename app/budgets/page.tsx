'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDisplayAmount } from '@/lib/utils';
import {
  Target, Plus, Edit3, Trash2, X, AlertCircle, CheckCircle2, TrendingDown, RefreshCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    category_id: '',
    amount: ''
  });

  useBodyScrollLock(isModalOpen);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data: cats } = await supabase.from('categories').select('*').eq('type', 'expense').order('name');
      const { data: bud } = await supabase
        .from('budget_tracking_view')
        .select('*')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .order('percentage_used', { ascending: false });

      setCategories(cats || []);
      setBudgets(bud || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      category_id: Number(formData.category_id),
      amount: Number(formData.amount.replace(/\D/g, "")),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    };

    const { error } = editingId
      ? await supabase.from('budgets').update(payload).eq('id', editingId)
      : await supabase.from('budgets').insert(payload);

    if (error) toast.error(error.message);
    else {
      toast.success(editingId ? "Budget updated" : "Budget set");
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ category_id: '', amount: '' });
      fetchData();
    }
  };


  const handleDeleteBudget = async (id: number) => {
    if (!confirm("Delete budget limit?")) return;
    try {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;
      toast.success("Budget limit removed");
      fetchData();
    } catch (err: any) { toast.error(err.message); }
  };


  return (
    <div className="max-w-6xl mx-auto pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Budget Planner</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5 font-bold uppercase tracking-widest">Spending Limits</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ category_id: '', amount: '' }); setIsModalOpen(true); }} className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest">
          <Plus size={16} /> Set Limit
        </button>
      </header>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-[10px] font-bold text-slate-400 uppercase tracking-widest">Syncing budgets...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {budgets.map((b) => {
            const percent = b.percentage_used || 0;
            const isOver = b.is_exceeded;

            return (
              <motion.div key={b.id} layout className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-100 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">{b.category_name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Monthly Limit</p>
                  </div>
                  <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => {
                      setEditingId(b.id);
                      setFormData({
                        category_id: b.category_id?.toString() || '',
                        amount: b.budget_amount?.toString() || ''
                      });
                      setIsModalOpen(true);
                    }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md transition-colors"><Edit3 size={14} /></button>
                    <button onClick={() => handleDeleteBudget(b.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p className={`text-sm md:text-lg font-bold ${isOver ? 'text-red-600' : 'text-slate-900'}`}>
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(b.spent_amount)}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">of {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(b.budget_amount)}</p>
                  </div>
                  <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isOver ? 'bg-red-50 text-red-600 shadow-[0_0_8px_rgba(239,68,68,0.2)]' : 'bg-slate-50 text-slate-600'}`}>
                    {Number(percent).toFixed(0)}%
                  </div>
                </div>

                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percent, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${isOver ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : percent > 80 ? 'bg-amber-500' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]'}`}
                  />
                </div>

                {isOver && (
                  <div className="mt-3 flex items-center gap-1.5 text-red-600 text-[10px] font-bold animate-pulse uppercase tracking-widest">
                    <AlertCircle size={12} /> Limit Exceeded
                  </div>
                )}
              </motion.div>
            )
          })}
          {budgets.length === 0 && (
            <div className="col-span-full py-24 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-widest">No budgets defined.</div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-md max-h-[90vh] rounded-2xl shadow-xl overflow-hidden text-black font-black flex flex-col">
              <div className="flex justify-between items-center p-5 md:p-6 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Limit' : 'Set Limit'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form id="budget-form" onSubmit={handleManualSubmit} className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Category</label>
                  <select required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 transition-all" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}>
                    <option value="">Select Category...</option>
                    {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Monthly Max</label>
                  <input type="text" placeholder="0" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 transition-all" value={formatDisplayAmount(formData.amount)} onChange={(e) => setFormData({ ...formData, amount: e.target.value.replace(/\D/g, "") })} />
                </div>

              </form>
              <div className="p-5 md:p-6 border-t border-slate-100">
                <button type="submit" form="budget-form" className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-slate-800 transition-all text-xs uppercase tracking-widest active:scale-[0.98]">Save Budget Record</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
