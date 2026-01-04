"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ShieldCheck,
  Target,
  ArrowRight,
  Sparkles,
  Receipt,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const [stats, setStats] = useState({
    income: 0,
    expense: 0,
    balance: 0,
    todo: 0,
    inProgress: 0,
    urgent: 0,
    savingsRate: 0
  });
  const [recentTrx, setRecentTrx] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      
      const { data: transactions } = await supabase.from('transactions').select('*, item:transaction_items(name)').order('date', { ascending: false }).limit(20);
      const { data: tasks } = await supabase.from('tasks').select('*').order('deadline', { ascending: true }).limit(10);

      let totalIncome = 0;
      let totalExpense = 0;

      if (transactions) {
        // Calculate totals for all transactions (ideally should be non-limited query, but for dashboard summary we use this)
        // Note: For real app, use a dedicated summary RPC or query.
        const { data: allTrx } = await supabase.from('transactions').select('amount, type');
        allTrx?.forEach(t => {
          if (t.type === 'income') totalIncome += Number(t.amount);
          else totalExpense += Number(t.amount);
        });

        setRecentTrx(transactions.slice(0, 3));

        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
        });

        const grouped = last7Days.map(day => {
          const dayTrx = transactions.filter(t => t.date === day);
          return {
            name: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
            income: dayTrx.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0),
            expense: dayTrx.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0),
          };
        });
        setChartData(grouped);
      }

      setUpcomingTasks(tasks?.filter(t => t.status !== 'done').slice(0, 3) || []);

      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

      setStats({
        income: totalIncome,
        expense: totalExpense,
        balance: totalIncome - totalExpense,
        todo: tasks?.filter(t => t.status === 'todo').length || 0,
        inProgress: tasks?.filter(t => t.status === 'in_progress').length || 0,
        urgent: tasks?.filter(t => t.priority === 'urgent' && t.status !== 'done').length || 0,
        savingsRate: savingsRate
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  const getHealthStatus = (rate: number) => {
    if (rate >= 30) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <ShieldCheck className="text-emerald-600" /> };
    if (rate >= 10) return { label: 'Stable', color: 'text-blue-600', bg: 'bg-blue-50', icon: <Target className="text-blue-600" /> };
    return { label: 'Attention Needed', color: 'text-red-600', bg: 'bg-red-50', icon: <AlertCircle className="text-red-600" /> };
  };

  const health = getHealthStatus(stats.savingsRate);

  return (
    <div className="space-y-6 md:space-y-10 max-w-7xl mx-auto pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-black uppercase">Intelligence</h2>
          <p className="text-slate-700 font-bold mt-1 text-sm md:text-base opacity-50 uppercase tracking-widest text-[10px]">Real-time Pulse</p>
        </div>
        <div className={`flex items-center gap-3 px-6 py-4 rounded-[2rem] border-2 ${health.bg} border-opacity-50 shadow-xl`}>
          {health.icon}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Status</p>
            <p className={`text-base font-black ${health.color} uppercase`}>{health.label}</p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="py-20 text-center animate-pulse font-black text-slate-400 tracking-widest text-xs uppercase">Syncing with Cloud...</div>
      ) : (
        <div className="space-y-8 md:space-y-12">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard title="Income" value={stats.income} icon={<TrendingUp className="text-emerald-600" />} color="text-emerald-600" sub="Total Earnings" />
            <MetricCard title="Expense" value={stats.expense} icon={<TrendingDown className="text-red-600" />} color="text-black" sub="Total Spending" />
            <MetricCard title="Net Balance" value={stats.balance} icon={<Wallet className="text-blue-600" />} color="text-blue-700" sub={`${stats.savingsRate.toFixed(1)}% Saving Rate`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
            {/* Left Side: Chart & Recent Transactions */}
            <div className="lg:col-span-2 space-y-8 md:space-y-12">
              <div className="bg-white p-8 md:p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                  <h3 className="text-xl font-black text-black tracking-tight uppercase">Cashflow Trend</h3>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> In</div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"><div className="w-2.5 h-2.5 bg-red-500 rounded-full" /> Out</div>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: -30 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} dy={10} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', fontWeight: 'bold' }} />
                      <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                      <Bar dataKey="expense" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 md:p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8 uppercase">
                    <h3 className="text-lg font-black text-black tracking-tight flex items-center gap-3"><Receipt size={20} className="text-blue-600" /> Recent Activity</h3>
                    <a href="/transactions" className="text-[10px] font-black text-blue-600 tracking-widest hover:underline">View All</a>
                </div>
                <div className="space-y-4">
                    {recentTrx.map((trx) => (
                        <div key={trx.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs ${trx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                                    {trx.type === 'income' ? 'IN' : 'OUT'}
                                </div>
                                <div>
                                    <p className="font-black text-black text-sm uppercase truncate max-w-[150px] sm:max-w-none">{trx.item?.name || trx.description}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{new Date(trx.date).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</p>
                                </div>
                            </div>
                            <p className={`font-black text-base ${trx.type === 'income' ? 'text-emerald-600' : 'text-black'}`}>
                                {trx.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(trx.amount)}
                            </p>
                        </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Right Side: Productivity & Goals */}
            <div className="space-y-8 md:space-y-12">
              <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                <Sparkles className="absolute top-6 right-6 text-blue-400 opacity-30" size={24} />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-10">Task Pulse</h3>
                <div className="space-y-6">
                    {upcomingTasks.length > 0 ? upcomingTasks.map(t => (
                        <div key={t.id} className="flex items-center gap-4 group">
                            <div className={`w-2 h-2 rounded-full ${t.priority === 'urgent' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-sm truncate uppercase tracking-tight group-hover:text-blue-400 transition-colors">{t.title}</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 flex items-center gap-2"><Calendar size={10} /> {t.deadline ? new Date(t.deadline).toLocaleDateString() : 'No date'}</p>
                            </div>
                        </div>
                    )) : <p className="text-slate-500 text-xs font-bold uppercase tracking-widest py-10 text-center">No pending tasks</p>}
                </div>
                <a href="/tasks" className="w-full mt-12 py-5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border border-white/5">
                  Manage Roadmap <ArrowRight size={14} />
                </a>
              </div>

              <div className="bg-blue-600 p-10 rounded-[3.5rem] text-white shadow-2xl shadow-blue-600/20 relative overflow-hidden group">
                <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-1000"><Wallet size={200} /></div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200 mb-4">Capital Growth</h3>
                <p className="text-6xl font-black mb-6 tracking-tighter">{stats.savingsRate.toFixed(0)}%</p>
                <div className="w-full bg-white/10 h-1.5 rounded-full mb-6 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${stats.savingsRate}%` }} transition={{ duration: 2 }} className="h-full bg-white" />
                </div>
                <p className="text-[11px] font-bold text-blue-100 leading-relaxed uppercase tracking-wide opacity-80">
                  Efficiency Index: {stats.savingsRate >= 30 ? 'Elite' : 'Stable'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon, color, sub }: any) {
  return (
    <motion.div whileHover={{ y: -10 }} className="bg-white p-8 md:p-10 rounded-[3rem] border-2 border-slate-50 shadow-xl relative overflow-hidden group transition-all hover:border-blue-100">
      <div className="flex items-center justify-between mb-8">
        <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-blue-50 group-hover:scale-110 transition-all duration-500">{icon}</div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{title}</p>
      </div>
      <p className={`text-3xl md:text-4xl font-black ${color} tracking-tighter`}>
        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)}
      </p>
      <p className="text-[10px] font-black text-slate-400 uppercase mt-3 tracking-widest opacity-70">{sub}</p>
    </motion.div>
  );
}

function TaskRow({ icon, label, count }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <span className="text-2xl font-black text-white tracking-tighter">{count}</span>
    </div>
  );
}
