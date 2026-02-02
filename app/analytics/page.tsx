'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck,
  Target,
  AlertCircle,
  Zap,
  TrendingUp,
  PieChart as PieIcon,
  Activity,
  ArrowRight,
  RefreshCcw
} from 'lucide-react';
import {
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import type { AnalyticsData } from '@/lib/types';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    radar: [],
    history: [],
    stats: { score: 0, status: 'Analyzing...', color: 'text-slate-400' }
  });
  const [loading, setLoading] = useState(true);
  const [savingSnapshot, setSavingSnapshot] = useState(false);

  useEffect(() => { fetchAnalytics(); }, []);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      // CRITICAL: Get user first and filter all queries by user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: trx } = await supabase
        .from('transactions')
        .select('*, item:transaction_items!fk_transactions_item(categories!fk_transaction_items_category(type, name))')
        .eq('user_id', user.id);
      const { data: history } = await supabase
        .from('net_worth_history')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: true });
      const { data: cashNW } = await supabase
        .from('net_worth_view')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      const { data: portfolio } = await supabase
        .from('portfolio_summary_view')
        .select('*')
        .eq('user_id', user.id);
      const { data: debts } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id);

      if (!trx) return;

      const totalIncome = trx.filter(t => t.type === 'income').reduce((acc, c) => acc + Number(c.amount), 0);
      const totalExpense = trx.filter(t => t.type === 'expense').reduce((acc, c) => acc + Number(c.amount), 0);
      const savings = totalIncome - totalExpense;
      const totalInvested = portfolio?.reduce((acc, p) => acc + Number(p.current_value), 0) || 0;

      const radarData = [
        { subject: 'Income', A: totalIncome / 1000 },
        { subject: 'Expense', A: totalExpense / 1000 },
        { subject: 'Savings', A: Math.max(0, savings) / 1000 },
        { subject: 'Invest', A: totalInvested / 1000 },
      ];

      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
      let score = 50;
      if (savingsRate > 30) score += 30; else if (savingsRate > 10) score += 15;
      
      const totalLiquid = Number(cashNW?.net_worth || 0);
      const totalAssetsVal = totalLiquid + totalInvested;
      const totalDebtVal = debts?.reduce((acc, c) => acc + Number(c.remaining_amount), 0) || 0;
      const debtRatio = totalAssetsVal > 0 ? (totalDebtVal / totalAssetsVal) * 100 : 0;
      
      if (debtRatio < 20) score += 20; else if (debtRatio > 50) score -= 20;

      const status = score > 80 ? 'Excellent' : score > 50 ? 'Healthy' : 'Vulnerable';
      const color = score > 80 ? 'text-emerald-600' : score > 50 ? 'text-blue-600' : 'text-red-600';

      setData({ radar: radarData, history: history || [], stats: { score, status, color } });
    } catch (err) { logger.handleApiError(err, 'Failed to load analytics', { component: 'AnalyticsPage' }); }
    finally { setLoading(false); }
  }

  async function takeSnapshot() {
    try {
      setSavingSnapshot(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please login first"); return; }

      // CRITICAL: Filter all queries by user_id
      const { data: cashNW } = await supabase.from('net_worth_view').select('*').eq('user_id', user.id).single();
      const { data: portfolio } = await supabase.from('portfolio_summary_view').select('*').eq('user_id', user.id);
      const { data: debts } = await supabase.from('debts').select('*').eq('user_id', user.id);

      const totalLiquid = Number(cashNW?.net_worth || 0);
      const totalInvested = portfolio?.reduce((acc, p) => acc + Number(p.current_value), 0) || 0;
      const totalAssets = totalLiquid + totalInvested;
      const totalDebts = debts?.reduce((acc, c) => acc + Number(c.remaining_amount), 0) || 0;
      
      await supabase.from('net_worth_history').upsert({ 
        user_id: user?.id, total_assets: totalAssets, total_debts: totalDebts, net_worth: totalAssets - totalDebts, recorded_at: new Date().toISOString().split('T')[0] 
      }, { onConflict: 'recorded_at' });
      toast.success("Snapshot Saved!"); fetchAnalytics();
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingSnapshot(false); }
  }

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5 md:mt-1">Financial health & patterns</p>
        </div>
        <button onClick={takeSnapshot} disabled={savingSnapshot} className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] md:text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm">
          {savingSnapshot ? <RefreshCcw className="animate-spin" size={14} /> : <TrendingUp size={14} className="text-blue-600" />} 
          Update Snapshot
        </button>
      </header>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-[10px] font-bold text-slate-400 uppercase tracking-widest">Analyzing your data...</div>
      ) : (
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
          {/* Stability Score Card */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="p-3 md:p-4 bg-amber-50 rounded-full mb-4 text-amber-500 shadow-inner"><Zap size={24} className="md:w-7 md:h-7" fill="currentColor" /></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Stability Score</p>
            <h2 className={`text-5xl md:text-6xl font-bold mb-3 ${data.stats.color} tracking-tighter`}>{data.stats.score}</h2>
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${data.stats.color} bg-slate-50 border border-slate-100`}>{data.stats.status}</div>
          </motion.div>

          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Radar Chart */}
              <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-[10px] md:text-xs font-bold text-slate-900 mb-4 uppercase tracking-widest text-center md:text-left">Balance Radar</h3>
                <div className="h-[200px] md:h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data.radar}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                      <Radar name="Metrics" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Strategy Card (Dark) */}
              <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden flex flex-col justify-center border border-slate-800 min-h-[200px]">
                <div className="absolute top-0 right-0 p-6 opacity-10"><Activity size={80} className="md:w-[100px] md:h-[100px]" /></div>
                <h3 className="text-[10px] md:text-xs font-bold text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-widest"><Zap size={14} className="text-amber-400" /> Intelligence</h3>
                <div className="space-y-3 mb-8">
                  <InsightRow text="Top 10% Savings Rate achieved." />
                  <InsightRow text="Net worth growing consistently." />
                  <InsightRow text="Consider diversifying assets." />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <a href="/analytics/report" className="flex items-center justify-between px-3 py-2 bg-slate-800 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors">
                    Report <ArrowRight size={12} />
                  </a>
                  <a href="/analytics/forecast" className="flex items-center justify-between px-3 py-2 bg-emerald-900/30 text-emerald-400 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-900/50 transition-colors border border-emerald-900/50">
                    Forecast <ArrowRight size={12} />
                  </a>
                </div>
              </div>
            </div>

            {/* Net Worth Growth Chart */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-[10px] md:text-xs font-bold text-slate-900 mb-4 uppercase tracking-widest text-center md:text-left">Net Worth Growth</h3>
              <div className="h-[200px] w-full">
                {data.history.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.history} margin={{ left: -20, top: 10, bottom: 0 }}>
                      <defs><linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="recorded_at" hide />
                      <Tooltip 
                        formatter={(value: any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 500 }} 
                      />
                      <Area type="monotone" dataKey="net_worth" stroke="#3b82f6" fillOpacity={1} fill="url(#colorNet)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (<div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-2xl text-[10px] font-bold text-slate-400 uppercase tracking-widest">No history available</div>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InsightRow({ text }: { text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500" />
      <p className="text-[11px] md:text-xs text-slate-300 leading-relaxed font-medium">{text}</p>
    </div>
  );
}