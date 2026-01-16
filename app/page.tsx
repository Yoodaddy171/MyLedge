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
  Calendar,
  Bell,
  X as CloseIcon,
  Zap
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const [stats, setStats] = useState({
    income: 0,
    expense: 0,
    balance: 0,
    todo: 0,
    inProgress: 0,
    urgent: 0,
    savingsRate: 0,
    netWorth: 0,
    totalAssets: 0,
    totalDebt: 0
  });
  const [wallets, setWallets] = useState<any[]>([]);
  const [recentTrx, setRecentTrx] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenBanks, setHiddenBanks] = useState<string[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);

      const { data: walletsData } = await supabase.from('wallets').select('*');
      const { data: transactions } = await supabase.from('transactions').select('*, item:transaction_items(name)').order('date', { ascending: false });
      const { data: tasks } = await supabase.from('tasks').select('*').order('deadline', { ascending: true }).limit(10);
      const { data: assets } = await supabase.from('assets').select('*');
      const { data: debts } = await supabase.from('debts').select('*');

      let totalIncome = 0;
      let totalExpense = 0;
      let totalDebt = debts?.reduce((acc, curr) => acc + Number(curr.remaining_amount), 0) || 0;
      let totalAssets = assets?.reduce((acc, curr) => acc + (Number(curr.quantity) * Number(curr.current_price)), 0) || 0;

      if (transactions) {
        transactions.forEach(t => {
          if (t.type === 'income') totalIncome += Number(t.amount);
          else totalExpense += Number(t.amount);
        });

        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
        });

        const grouped = last7Days.map(day => {
          const dayTrx = transactions.filter(t => t.date === day);
          const dataPoint: any = {
            name: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
          };

          walletsData?.forEach(w => {
            dataPoint[w.name] = dayTrx
              .filter(t => t.wallet_id === w.id && t.type === 'income')
              .reduce((acc, curr) => acc + Number(curr.amount), 0);
          });

          return dataPoint;
        });

        setChartData(grouped);
        setRecentTrx(transactions.slice(0, 3));
      }

      setUpcomingTasks(tasks?.filter(t => t.status !== 'done').slice(0, 3) || []);
      setWallets(walletsData || []);

      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
      const netBalance = totalIncome - totalExpense;

      setStats({
        income: totalIncome,
        expense: totalExpense,
        balance: netBalance,
        todo: tasks?.filter(t => t.status === 'todo').length || 0,
        inProgress: tasks?.filter(t => t.status === 'in_progress').length || 0,
        urgent: tasks?.filter(t => t.priority === 'Urgent' && t.status !== 'done').length || 0,
        savingsRate: savingsRate,
        netWorth: netBalance + totalAssets - totalDebt,
        totalAssets: totalAssets,
        totalDebt: totalDebt
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  const toggleBank = (name: string) => {
    if (hiddenBanks.includes(name)) setHiddenBanks(hiddenBanks.filter(h => h !== name));
    else setHiddenBanks([...hiddenBanks, name]);
  };

  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

  const getHealthStatus = (rate: number) => {
    if (rate >= 30) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <ShieldCheck className="text-emerald-600" /> };
    if (rate >= 10) return { label: 'Stable', color: 'text-blue-600', bg: 'bg-blue-50', icon: <Target className="text-blue-600" /> };
    return { label: 'Action Needed', color: 'text-red-600', bg: 'bg-red-50', icon: <AlertCircle className="text-red-600" /> };
  };

  const health = getHealthStatus(stats.savingsRate);

  // Notification & Pop-up States
  const [showReminders, setShowReminders] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Show aggressive pop-up if there are pending tasks
    if (!loading && (stats.todo > 0 || stats.inProgress > 0)) {
      setShowReminders(true);
    }
  }, [loading, stats.todo, stats.inProgress]);

  const urgentTasks = upcomingTasks.filter(t => t.priority === 'Urgent');

  return (
    <div className="space-y-6 md:space-y-10 max-w-7xl mx-auto pb-20 relative">
      {/* Aggressive Reminder Pop-up */}
      <AnimatePresence>
        {showReminders && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 50 }} className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 overflow-hidden text-black font-black flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 rounded-[1.5rem] flex items-center justify-center text-red-600 mb-6 animate-bounce">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Misi Belum Selesai!</h2>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-10 leading-relaxed">
                Anda memiliki <span className="text-red-500">{stats.todo + stats.inProgress}</span> tugas yang masih tertunda. Segera selesaikan sebelum tenggat waktu berakhir!
              </p>

              <div className="w-full space-y-4 mb-10 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {upcomingTasks.slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-center gap-4 p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 text-left">
                    <div className={`w-3 h-3 rounded-full ${t.priority === 'Urgent' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black uppercase truncate">{t.title}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{t.deadline ? new Date(t.deadline).toLocaleDateString() : 'No Deadline'}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 w-full gap-4">
                <a href="/tasks" className="w-full bg-black text-white py-6 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
                  Kelola Task Sekarang <ArrowRight size={16} />
                </a>
                <button onClick={() => setShowReminders(false)} className="text-[9px] font-black text-slate-400 hover:text-black uppercase tracking-widest transition-colors py-2">Mungkin Nanti</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-black uppercase">Intelligence</h2>
            <p className="text-slate-700 font-bold mt-1 text-xs md:text-sm opacity-50 uppercase tracking-widest text-[9px]">Financial health Overview</p>
          </div>

          {/* Notification Center Trigger */}
          <div className="relative md:hidden">
            <button onClick={() => setShowNotifications(!showNotifications)} className="p-5 bg-white rounded-3xl border-2 border-slate-100 shadow-xl relative group hover:border-blue-500 transition-all">
              <Bell size={24} className="group-hover:rotate-12 transition-transform" />
              {(stats.urgent > 0 || stats.todo > 0) && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-4 border-white">
                  {stats.urgent || stats.todo}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Desktop Notification Center */}
          <div className="relative hidden md:block">
            <button onClick={() => setShowNotifications(!showNotifications)} className="p-4 bg-white rounded-[1.5rem] border-2 border-slate-100 shadow-xl relative group hover:border-blue-500 transition-all">
              <Bell size={20} className="group-hover:rotate-12 transition-transform" />
              {(stats.urgent > 0 || stats.todo > 0) && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                  {stats.urgent || stats.todo}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-6 w-80 bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-2xl z-50 overflow-hidden">
                  <div className="p-8 border-b-2 border-slate-50 flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pusat Notifikasi</p>
                    <button onClick={() => setShowNotifications(false)}><CloseIcon size={16} className="text-slate-300 hover:text-black" /></button>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto p-4 space-y-3">
                    {urgentTasks.length > 0 && (
                      <div className="mb-6">
                        <p className="text-[8px] font-black text-red-500 uppercase tracking-[0.2em] mb-3 px-4">Argent (Mendesak)</p>
                        {urgentTasks.map(t => (
                          <div key={t.id} className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4 mb-2">
                            <Zap size={14} className="text-red-600" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black uppercase truncate">{t.title}</p>
                              <p className="text-[8px] text-red-400 font-bold uppercase mt-1">Selesaikan Segera!</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {upcomingTasks.filter(t => t.priority !== 'Urgent' && t.status !== 'done').map(t => (
                      <div key={t.id} className="p-4 hover:bg-slate-50 rounded-2xl transition-colors flex items-center gap-4 border border-transparent hover:border-slate-100">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black uppercase truncate text-black">{t.title}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Deadline: {t.deadline ? new Date(t.deadline).toLocaleDateString() : 'Continuous'}</p>
                        </div>
                      </div>
                    ))}
                    {upcomingTasks.filter(t => t.status !== 'done').length === 0 && (
                      <div className="py-12 text-center">
                        <CheckCircle2 size={32} className="mx-auto text-emerald-200 mb-4" />
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Tidak ada notifikasi aktif</p>
                      </div>
                    )}
                  </div>
                  <a href="/tasks" className="block text-center py-5 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-black hover:bg-slate-100 transition-all border-t-2 border-slate-100">Buka Semua Task</a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={`flex items-center gap-3 px-6 py-4 rounded-[1.5rem] border-2 ${health.bg} border-opacity-50 shadow-xl`}>
            {health.icon}
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status</p>
              <p className={`text-base font-black ${health.color} uppercase`}>{health.label}</p>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="py-20 text-center animate-pulse font-black text-slate-400 tracking-widest text-xs uppercase">Syncing Dashboard...</div>
      ) : (
        <div className="space-y-8 md:space-y-12">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard title="Net Worth" value={stats.netWorth} icon={<ShieldCheck className="text-blue-600" />} color="text-blue-700" sub="Total Capital Value" />
            <MetricCard title="Cash Balance" value={stats.balance} icon={<TrendingUp className="text-emerald-600" />} color="text-emerald-600" sub="Liquid Funds Available" />
            <MetricCard title="Investments" value={stats.totalAssets} icon={<Target className="text-purple-600" />} color="text-purple-700" sub="Market Portfolio" />
            <MetricCard title="Total Debts" value={stats.totalDebt} icon={<TrendingDown className="text-red-600" />} color="text-red-700" sub="Outstanding Balance" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
            {/* Left Side: Chart & Recent Transactions */}
            <div className="lg:col-span-2 space-y-8 md:space-y-12">
              <div className="bg-white p-8 md:p-10 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <h3 className="text-lg font-black text-black tracking-tight uppercase">Cash Flow Trends</h3>
                  <p className="text-[9px] font-black uppercase text-slate-400">Weekly bank activity summary</p>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ left: -30 }}>
                      <defs>
                        {wallets.map((w, i) => (
                          <linearGradient key={w.id} id={`color${w.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0.1} />
                            <stop offset="95%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} dy={10} />
                      <YAxis hide />
                      <Tooltip
                        formatter={(value: any) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(value || 0))}
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}
                      />
                      <Legend
                        onClick={(e) => toggleBank(e.value)}
                        wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                      />
                      {wallets.map((w, i) => (
                        <Area
                          key={w.id}
                          type="monotone"
                          dataKey={w.name}
                          stroke={chartColors[i % chartColors.length]}
                          fillOpacity={1}
                          fill={`url(#color${w.id})`}
                          strokeWidth={3}
                          hide={hiddenBanks.includes(w.name)}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6 uppercase">
                  <h3 className="text-base font-black text-black tracking-tight flex items-center gap-3"><Receipt size={20} className="text-blue-600" /> Recent History</h3>
                  <a href="/transactions" className="text-[9px] font-black text-blue-600 tracking-widest hover:underline uppercase">View All Activity</a>
                </div>
                <div className="space-y-4">
                  {recentTrx.map((trx) => (
                    <div key={trx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center font-black text-[10px] ${trx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-700 shadow-sm'}`}>
                          {trx.type === 'income' ? 'IN' : 'OUT'}
                        </div>
                        <div>
                          <p className="font-black text-black text-sm uppercase truncate max-w-[150px] sm:max-w-none">{trx.item?.name || trx.description || 'Manual Entry'}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{new Date(trx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <p className={`font-black text-base tracking-tight ${trx.type === 'income' ? 'text-emerald-600' : 'text-black'}`}>
                        {trx.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(trx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side: Productivity & Goals */}
            <div className="space-y-8 md:space-y-12">
              <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 border-b-2 border-slate-50 pb-4">My Bank Accounts</h3>
                <div className="space-y-6">
                  {wallets.length > 0 ? wallets.map(w => (
                    <div key={w.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-50 rounded-xl text-blue-500 group-hover:bg-blue-100 transition-all shadow-sm"><Landmark size={18} /></div>
                        <span className="text-xs font-black uppercase tracking-tight text-black">{w.name}</span>
                      </div>
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100">Linked</span>
                    </div>
                  )) : <p className="text-slate-400 text-[10px] font-bold uppercase text-center py-4">No accounts added</p>}
                </div>
                <a href="/banks" className="w-full mt-8 py-4 bg-slate-50 hover:bg-slate-100 rounded-[1.2rem] text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border border-slate-100 text-black">
                  Manage Accounts <ArrowRight size={14} />
                </a>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
                <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 border-b-2 border-slate-50 pb-4">Priority Goals</h3>
                <div className="space-y-6">
                  {upcomingTasks.length > 0 ? upcomingTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-4 group">
                      <div className={`w-2 h-2 rounded-full ${t.priority === 'urgent' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm truncate uppercase tracking-tight group-hover:text-blue-600 transition-colors text-black">{t.title}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 flex items-center gap-2"><Calendar size={10} /> {t.deadline ? new Date(t.deadline).toLocaleDateString() : 'Continuous'}</p>
                      </div>
                    </div>
                  )) : <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest py-8 text-center">No pending goals</p>}
                </div>
                <a href="/tasks" className="w-full mt-8 py-4 bg-slate-50 hover:bg-slate-100 rounded-[1.2rem] text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border border-slate-100 text-black">
                  My Tasks <ArrowRight size={14} />
                </a>
              </div>

              <div className="bg-[#1e293b] p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-1000"><Wallet size={150} /></div>
                <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 font-bold">Capital Growth Index</h3>
                <p className="text-6xl font-black mb-6 tracking-tight text-emerald-400">{stats.savingsRate.toFixed(0)}%</p>
                <div className="w-full bg-slate-800 h-2 rounded-full mb-6 overflow-hidden shadow-inner font-black">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${stats.savingsRate}%` }} transition={{ duration: 2 }} className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                </div>
                <p className="text-[10px] font-black text-slate-400 leading-relaxed uppercase tracking-[0.1em]">
                  Health Indicator: <span className={stats.savingsRate >= 30 ? 'text-emerald-500' : 'text-blue-400'}>{stats.savingsRate >= 30 ? 'Elite Growth' : 'Stable'}</span>
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
    <motion.div whileHover={{ y: -5 }} className="bg-white p-6 px-5 rounded-[1.5rem] border-2 border-slate-50 shadow-xl relative overflow-hidden group transition-all hover:border-blue-100">
      <div className="flex items-center justify-between mb-6">
        <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 group-hover:scale-110 transition-all duration-500 shadow-sm">{icon}</div>
        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">{title}</p>
      </div>
      <p className={`text-2xl md:text-3xl font-black ${color} tracking-tight`}>
        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)}
      </p>
      <p className="text-[9px] font-black text-slate-400 uppercase mt-4 tracking-[0.1em] opacity-80">{sub}</p>
    </motion.div>
  );
}
