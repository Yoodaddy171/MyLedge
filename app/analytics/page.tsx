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

export default function AnalyticsPage() {
  const [data, setData] = useState<any>({
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
      const { data: trx } = await supabase.from('transactions').select('*, item:transaction_items(categories(type, name))');
      const { data: history } = await supabase.from('net_worth_history').select('*').order('recorded_at', { ascending: true });
      
      // V2 Data Sources
      const { data: cashNW } = await supabase.from('net_worth_view').select('*').single();
      const { data: portfolio } = await supabase.from('portfolio_summary_view').select('*');
      const { data: debts } = await supabase.from('debts').select('*');

      if (!trx) return;

      const totalIncome = trx.filter(t => t.type === 'income').reduce((acc, c) => acc + Number(c.amount), 0);
      const totalExpense = trx.filter(t => t.type === 'expense').reduce((acc, c) => acc + Number(c.amount), 0);
      const savings = totalIncome - totalExpense;

      const totalInvested = portfolio?.reduce((acc, p) => acc + Number(p.current_value), 0) || 0;

      // Simplified radar data using actual metrics instead of unreliable category name matching
      // Since category names are user-created, we can't reliably filter by "needs" or "wants"
      // Instead, use total expense as proxy for spending allocation
      const radarData = [
        { subject: 'Income', A: totalIncome / 1000 }, // Scale for visualization
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
      const color = score > 80 ? 'text-emerald-500' : score > 50 ? 'text-blue-500' : 'text-red-500';

      setData({ radar: radarData, history: history || [], stats: { score, status, color } });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function takeSnapshot() {
    try {
      setSavingSnapshot(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login first");
        return;
      }

      const { data: cashNW } = await supabase.from('net_worth_view').select('*').single();
      const { data: portfolio } = await supabase.from('portfolio_summary_view').select('*');
      const { data: debts } = await supabase.from('debts').select('*');

      const totalLiquid = Number(cashNW?.net_worth || 0);
      const totalInvested = portfolio?.reduce((acc, p) => acc + Number(p.current_value), 0) || 0;
      const totalAssets = totalLiquid + totalInvested;
      
      const totalDebts = debts?.reduce((acc, c) => acc + Number(c.remaining_amount), 0) || 0;
      
      await supabase.from('net_worth_history').upsert({ 
        user_id: user?.id, 
        total_assets: totalAssets, 
        total_debts: totalDebts, 
        net_worth: totalAssets - totalDebts, 
        recorded_at: new Date().toISOString().split('T')[0] 
      }, { onConflict: 'recorded_at' });
      
      alert("Snapshot Saved!"); fetchAnalytics();
    } catch (err: any) { alert(err.message); }
    finally { setSavingSnapshot(false); }
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 text-black font-black">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tighter">Intelligence</h1>
          <p className="text-slate-700 font-bold mt-1 text-xs">Financial health & pulse.</p>
        </div>
        <button onClick={takeSnapshot} disabled={savingSnapshot} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">
          {savingSnapshot ? <RefreshCcw className="animate-spin w-4 h-4" /> : <TrendingUp className="w-4 h-4" />} Snapshot
        </button>
      </header>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-slate-400 font-black tracking-widest text-[10px]">ANALYZING...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-black">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
            <Zap className="text-amber-400 mb-6" size={32} fill="currentColor" />
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Stability Score</p>
            <h2 className={`text-6xl font-black mb-4 ${data.stats.color}`}>{data.stats.score}</h2>
            <div className={`px-4 py-1.5 rounded-xl font-black uppercase text-[10px] tracking-widest ${data.stats.color} bg-slate-50`}>{data.stats.status}</div>
          </motion.div>

          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-6">Balance Radar</h3>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.radar}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#000', fontWeight: 900, fontSize: 8 }} />
                      <Radar name="Evan" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-2xl relative overflow-hidden flex flex-col justify-center">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-6 tracking-[0.2em]">AI Strategy</h3>
                <div className="space-y-4">
                  <InsightRow text="Top 10% Savings Rate achieved." />
                  <InsightRow text="Net worth growing consistently." />
                  <InsightRow text="Maintain gold hedge position." />
                </div>
                <a href="/analytics/report" className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-white transition-all">Detailed Report <ArrowRight size={14} /></a>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-6 tracking-[0.2em]">Net Worth Growth</h3>
              <div className="h-[180px] w-full">
                {data.history.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.history} margin={{ left: -20 }}>
                      <defs><linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="recorded_at" hide /><Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                      <Area type="monotone" dataKey="net_worth" stroke="#3b82f6" fillOpacity={1} fill="url(#colorNet)" strokeWidth={4} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (<div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 font-black uppercase text-[10px]">No history yet.</div>)}
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
    <div className="flex gap-4 items-start">
      <div className="mt-1 shrink-0"><Zap size={12} className="text-blue-500" /></div>
      <p className="text-xs md:text-sm font-bold leading-relaxed text-slate-300">{text}</p>
    </div>
  );
}