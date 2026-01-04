'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Target, Plus, Edit3, Trash2, X, AlertCircle, CheckCircle2, TrendingDown, RefreshCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [spending, setSpending] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({ category_id: '', amount_limit: '' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // 1. Fetch Categories & Budgets
      const { data: cats } = await supabase.from('categories').select('*').eq('type', 'expense');
      const { data: bud } = await supabase.from('budgets').select('*, categories(name)').eq('month', currentMonth).eq('year', currentYear);
      
      // 2. Fetch Spending this month
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
      const { data: trxs } = await supabase.from('transactions').select('amount, item:transaction_items(category_id)').eq('type', 'expense').gte('date', startOfMonth);

      const spendingMap: any = {};
      trxs?.forEach(t => {
        const item: any = Array.isArray(t.item) ? t.item[0] : t.item;
        const catId = item?.category_id;
        if (catId) spendingMap[catId] = (spendingMap[catId] || 0) + Number(t.amount);
      });

      setCategories(cats || []);
      setBudgets(bud || []);
      setSpending(spendingMap);
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
        amount_limit: Number(formData.amount_limit.replace(/\D/g, "")),
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    };

    const { error } = editingId 
        ? await supabase.from('budgets').update(payload).eq('id', editingId)
        : await supabase.from('budgets').insert(payload);

    if (error) toast.error(error.message);
    else {
        toast.success(editingId ? "Budget updated!" : "Budget set!");
        setIsModalOpen(false); setEditingId(null); setFormData({ category_id: '', amount_limit: '' });
        fetchData();
    }
  };

  const formatDisplayAmount = (val: string) => {
    if (!val) return "";
    const num = val.toString().replace(/\D/g, "");
    return new Intl.NumberFormat('id-ID').format(Number(num));
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 text-black font-black">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-black">Budget Planner</h1>
          <p className="text-slate-700 font-bold mt-2 uppercase text-[10px] tracking-[0.2em] opacity-50">Spending Limits</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({category_id:'', amount_limit:''}); setIsModalOpen(true); }} className="px-6 py-3 bg-black text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all">
          <Plus size={16} /> Set Limit
        </button>
      </header>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-slate-400 font-black tracking-widest text-[10px]">SYNCING BUDGETS...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {budgets.map((b) => {
            const currentSpending = spending[b.category_id] || 0;
            const percent = (currentSpending / b.amount_limit) * 100;
            const isOver = currentSpending > b.amount_limit;

            return (
              <motion.div key={b.id} layout className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-100 transition-all">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-black text-black tracking-tight uppercase">{b.categories?.name}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Monthly Limit</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditingId(b.id); setFormData({category_id: b.category_id.toString(), amount_limit: b.amount_limit.toString()}); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Edit3 size={16} /></button>
                    </div>
                </div>

                <div className="flex justify-between items-end mb-4">
                    <div>
                        <p className={`text-2xl font-black ${isOver ? 'text-red-600' : 'text-black'}`}>
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(currentSpending)}
                        </p>
                        <p className="text-[10px] font-black text-slate-400 uppercase">spent of {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(b.amount_limit)}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${isOver ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
                        {percent.toFixed(0)}%
                    </div>
                </div>

                <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden shadow-inner">
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
                  <select required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500" value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})}>
                    <option value="">Select Category...</option>
                    {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-2 block tracking-widest">Monthly Limit</label>
                  <input type="text" placeholder="0" required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-black focus:border-blue-500 shadow-sm" value={formatDisplayAmount(formData.amount_limit)} onChange={(e) => setFormData({...formData, amount_limit: e.target.value.replace(/\D/g, "")})} />
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
