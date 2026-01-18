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
  // const [spending, setSpending] = useState<any>({}); // V2 uses view, no longer needed state
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({ category_id: '', amount: '' });

  useBodyScrollLock(isModalOpen);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // 1. Fetch Categories for dropdown
      const { data: cats } = await supabase.from('categories').select('*').eq('type', 'expense').order('name');
      
      // 2. Fetch Budget Tracking View (Auto-calculated)
      const { data: bud } = await supabase
        .from('budget_tracking_view')
        .select('*')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .order('percentage_used', { ascending: false });

      setCategories(cats || []);
      setBudgets(bud || []);
      // No need to setSpending manually anymore
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
      toast.success(editingId ? "Budget updated!" : "Budget set!");
      setIsModalOpen(false); setEditingId(null); setFormData({ category_id: '', amount: '' });
      fetchData();
    }
  };

  const handleDeleteBudget = async (id: number) => {
    if (!confirm("Hapus limit budget untuk kategori ini?")) return;
    try {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;
      toast.success("Budget limit dihapus");
      fetchData();
    } catch (err: any) { toast.error(err.message); }
  };


  return (
    <div className="max-w-5xl mx-auto pb-20 text-black font-black">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-black">Budget Planner</h1>
          <p className="text-slate-700 font-bold mt-1 uppercase text-[9px] tracking-[0.2em] opacity-50">Spending Limits</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ category_id: '', amount: '' }); setIsModalOpen(true); }} className="px-5 py-2.5 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all">
          <Plus size={14} /> Set Limit
        </button>
      </header>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-slate-400 font-black tracking-widest text-[10px]">SYNCING BUDGETS...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {budgets.map((b) => {
            const percent = b.percentage_used || 0;
            const isOver = b.is_exceeded;

            return (
              <motion.div key={b.id} layout className="bg-white p-6 rounded-[1.5rem] border-2 border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-100 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-black text-black tracking-tight uppercase">{b.category_name}</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Monthly Limit</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { 
                      // Need to find category_id from the view or store it?
                      // The view might NOT return category_id unless we select it.
                      // Let's assume view returns category_id if we select *?
                      // Checking schema: View select uses b.id, b.category_id... Yes.
                      setEditingId(b.id); 
                      setFormData({ category_id: b.category_id?.toString() || '', amount: b.budget_amount?.toString() || '' }); 
                      setIsModalOpen(true); 
                    }} className="p-1.5 text-slate-400 hover:text-blue-600 transition-all"><Edit3 size={14} /></button>
                    <button onClick={() => handleDeleteBudget(b.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-all"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p className={`text-xl font-black ${isOver ? 'text-red-600' : 'text-black'}`}>
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(b.spent_amount)}
                    </p>
                    <p className="text-[9px] font-black text-slate-400 uppercase">spent of {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(b.budget_amount)}</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${isOver ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
                    {Number(percent).toFixed(0)}%
                  </div>
                </div>

                <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percent, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${isOver ? 'bg-red-500' : percent > 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                  />
                </div>

                {isOver && (
                  <div className="mt-4 flex items-center gap-2 text-red-600 text-[10px] font-black uppercase animate-pulse">
                    <AlertCircle size={12} /> Limit Exceeded! Reduce spending.
                  </div>
                )}
              </motion.div>
            )
          })}
          {budgets.length === 0 && (
            <div className="col-span-2 py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400 font-black uppercase tracking-widest text-xs">No limits set for this month.</div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-10 overflow-hidden text-black font-black">
              <h2 className="text-2xl font-black mb-8">{editingId ? 'Edit Limit' : 'Set Spending Limit'}</h2>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-2 block tracking-widest">Category</label>
                  <select required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}>
                    <option value="">Select Category...</option>
                    {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-2 block tracking-widest">Monthly Limit</label>
                  <input type="text" placeholder="0" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 shadow-sm" value={formatDisplayAmount(formData.amount)} onChange={(e) => setFormData({ ...formData, amount: e.target.value.replace(/\D/g, "") })} />
                </div>
                <button type="submit" className="w-full bg-black text-white font-black py-5 rounded-[1.5rem] shadow-lg hover:bg-slate-800 transition-all mt-4 uppercase tracking-widest text-xs">Confirm Budget</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
