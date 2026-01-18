"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck,
  Target,
  AlertCircle,
  Bell,
  X as CloseIcon,
  Zap,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';

// Dashboard Components
import MetricCard from '@/components/dashboard/MetricCard';
import CashFlowChart from '@/components/dashboard/CashFlowChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import BankAccounts from '@/components/dashboard/BankAccounts';
import PriorityGoals from '@/components/dashboard/PriorityGoals';
import GrowthIndex from '@/components/dashboard/GrowthIndex';

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
  const [loading, setLoading] = useState(true);
  
  // Activity Modal State
  const [selectedBankForActivity, setSelectedBankForActivity] = useState<any>(null);
  const [bankActivity, setBankActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  
  // Chart States
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // Notification & Pop-up States
  const [showReminders, setShowReminders] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useBodyScrollLock(showReminders);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Effect for Chart Data specifically when filters change
  useEffect(() => {
    fetchChartData();
  }, [viewMode, selectedMonth, selectedYear, wallets]);

  async function fetchDashboardData() {
    try {
      setLoading(true);

      const [
        { data: walletsView },
        { data: netWorthView },
        { data: portfolioView },
        { data: recentTransactions },
        { data: tasks },
        { data: allTransactions },
        { data: debtsData }
      ] = await Promise.all([
        supabase.from('wallet_balances_view').select('*'),
        supabase.from('net_worth_view').select('*').maybeSingle(),
        supabase.from('portfolio_summary_view').select('*'),
        supabase.from('transactions')
          .select('*, item:transaction_items!fk_transactions_item(name)')
          .order('date', { ascending: false })
          .limit(5),
        supabase.from('tasks').select('*').order('deadline', { ascending: true }).limit(10),
        supabase.from('transactions')
          .select('wallet_id, amount, type, date')
          .gte('date', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString()),
        supabase.from('debts').select('remaining_amount')
      ]);

      const totalCash = walletsView?.reduce((acc, curr) => acc + Number(curr.current_balance), 0) || 0;
      const loanDebt = debtsData?.reduce((acc, curr) => acc + Number(curr.remaining_amount), 0) || 0;
      const ccDebt = Number(netWorthView?.total_liabilities) || 0;
      const totalDebt = ccDebt + loanDebt;
      const totalAssets = portfolioView?.reduce((acc, curr) => acc + Number(curr.current_value), 0) || 0;
      const realNetWorth = totalCash + totalAssets - totalDebt;

      setRecentTrx(recentTransactions || []);
      setUpcomingTasks(tasks?.filter(t => t.status !== 'done').slice(0, 3) || []);
      setWallets(walletsView || []);

      const periodIncome = allTransactions?.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0) || 0;
      const periodExpense = allTransactions?.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0) || 0;
      const savingsRate = periodIncome > 0 ? ((periodIncome - periodExpense) / periodIncome) * 100 : 0;

      setStats({
        income: periodIncome,
        expense: periodExpense,
        balance: totalCash,
        todo: tasks?.filter(t => t.status === 'todo').length || 0,
        inProgress: 0,
        urgent: tasks?.filter(t => t.priority === 'urgent' && t.status !== 'done').length || 0,
        savingsRate: savingsRate,
        netWorth: realNetWorth,
        totalAssets: totalAssets,
        totalDebt: totalDebt
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchChartData() {
    if (!wallets.length) return;
    try {
      setLoadingChart(true);
      let startDate, endDate;

      if (viewMode === 'weekly') {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 6);
      } else if (viewMode === 'monthly') {
        startDate = new Date(selectedYear, selectedMonth - 1, 1);
        endDate = new Date(selectedYear, selectedMonth, 0);
      } else {
        startDate = new Date(selectedYear, 0, 1);
        endDate = new Date(selectedYear, 11, 31);
      }

      const { data: trxs } = await supabase
        .from('transactions')
        .select('wallet_id, amount, type, date')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (!trxs) return;

      let processed: any[] = [];

      if (viewMode === 'weekly' || viewMode === 'monthly') {
        // Group by Day
        const days = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          days.push(new Date(d).toISOString().split('T')[0]);
        }

        processed = days.map(day => {
          const dayTrx = trxs.filter(t => t.date === day);
          const dataPoint: any = {
            name: viewMode === 'weekly' 
              ? new Date(day).toLocaleDateString('en-US', { weekday: 'short' })
              : new Date(day).getDate().toString(),
            fullDate: day
          };
          wallets.forEach(w => {
            dataPoint[w.name] = dayTrx
              .filter(t => t.wallet_id === w.id && t.type === 'income')
              .reduce((acc, curr) => acc + Number(curr.amount), 0);
          });
          return dataPoint;
        });
      } else {
        // Yearly: Group by Month
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        processed = months.map((month, idx) => {
          const monthTrx = trxs.filter(t => new Date(t.date).getMonth() === idx);
          const dataPoint: any = { name: month };
          wallets.forEach(w => {
            dataPoint[w.name] = monthTrx
              .filter(t => t.wallet_id === w.id && t.type === 'income')
              .reduce((acc, curr) => acc + Number(curr.amount), 0);
          });
          return dataPoint;
        });
      }

      setChartData(processed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChart(false);
    }
  }

  async function fetchBankActivity(walletId: number) {
    try {
      setLoadingActivity(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          item:transaction_items!fk_transactions_item(name, categories!fk_transaction_items_category(name))
        `)
        .eq('wallet_id', walletId)
        .order('date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setBankActivity(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingActivity(false);
    }
  }

  const openActivityModal = (bank: any) => {
    setSelectedBankForActivity(bank);
    fetchBankActivity(bank.id);
  };

  const getHealthStatus = (rate: number) => {
    if (rate >= 30) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <ShieldCheck className="text-emerald-600" size={16} /> };
    if (rate >= 10) return { label: 'Stable', color: 'text-blue-600', bg: 'bg-blue-50', icon: <Target className="text-blue-600" size={16} /> };
    return { label: 'Action Needed', color: 'text-red-600', bg: 'bg-red-50', icon: <AlertCircle className="text-red-600" size={16} /> };
  };

  const health = getHealthStatus(stats.savingsRate);
  const urgentTasks = upcomingTasks.filter(t => t.priority === 'Urgent');

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 relative">
      {/* Aggressive Reminder Pop-up */}
      <AnimatePresence>
        {showReminders && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm pointer-events-auto" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 overflow-hidden text-black pointer-events-auto z-[210]">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-4 mx-auto">
                <AlertCircle size={24} />
              </div>
              <h2 className="text-xl font-bold text-center mb-2 text-slate-900">Pending Missions</h2>
              <p className="text-slate-500 text-sm text-center mb-6">
                You have <span className="font-bold text-red-600">{stats.todo}</span> pending tasks. Complete them before the deadline.
              </p>

              <div className="w-full space-y-3 mb-6 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                {upcomingTasks.slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${t.priority === 'Urgent' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate text-slate-900">{t.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{t.deadline ? new Date(t.deadline).toLocaleDateString() : 'No Deadline'}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 w-full gap-3">
                <a href="/tasks" className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-xs font-semibold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                  Manage Tasks
                </a>
                <button onClick={() => setShowReminders(false)} className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors py-2">Dismiss</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-2">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Intelligence</h2>
            <p className="text-slate-500 text-xs md:text-sm mt-0.5">Financial health overview</p>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${health.bg} border-opacity-50 shadow-sm`}>
                {health.icon}
                <p className={`text-xs font-bold ${health.color}`}>{health.label}</p>
            </div>
            <button onClick={() => setShowNotifications(!showNotifications)} className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm relative active:scale-95 transition-all">
              <Bell size={18} className="text-slate-600" />
              {(stats.urgent > 0 || stats.todo > 0) && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {stats.urgent || stats.todo}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm relative hover:border-slate-300 transition-all">
              <Bell size={18} className="text-slate-600" />
              {(stats.urgent > 0 || stats.todo > 0) && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-sm">
                  {stats.urgent || stats.todo}
                </span>
              )}
            </button>
            {/* Notification Dropdown logic remains same */}
          </div>

          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${health.bg} border-opacity-50 shadow-sm`}>
            {health.icon}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none mb-0.5">Status</p>
              <p className={`text-sm font-bold ${health.color} leading-none`}>{health.label}</p>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="py-20 text-center animate-pulse font-medium text-slate-400 text-sm">Loading Dashboard...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <MetricCard title="Net Worth" value={stats.netWorth} icon={<ShieldCheck size={16} className="text-blue-600" />} color="text-blue-700" sub="Total Cap" />
            <MetricCard title="Cash" value={stats.balance} icon={<TrendingUp size={16} className="text-emerald-600" />} color="text-emerald-600" sub="Liquid" />
            <MetricCard title="Assets" value={stats.totalAssets} icon={<Target size={16} className="text-purple-600" />} color="text-purple-700" sub="Market" />
            <MetricCard title="Debts" value={stats.totalDebt} icon={<TrendingDown size={16} className="text-red-600" />} color="text-red-700" sub="Owed" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <CashFlowChart 
                data={chartData} 
                wallets={wallets} 
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                loading={loadingChart}
              />
              <RecentTransactions transactions={recentTrx} />
            </div>

            <div className="space-y-6">
              <BankAccounts wallets={wallets} onViewHistory={openActivityModal} />
              <PriorityGoals tasks={upcomingTasks} />
              <GrowthIndex savingsRate={stats.savingsRate} />
            </div>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      <AnimatePresence>
        {selectedBankForActivity && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedBankForActivity(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }} className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col h-[80vh] overflow-hidden text-black">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedBankForActivity.name}</h2>
                  <p className="text-xs text-slate-500 font-bold">Recent Activity</p>
                </div>
                <button onClick={() => setSelectedBankForActivity(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><CloseIcon size={18} className="text-slate-500" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
                {loadingActivity ? <div className="text-center py-12 text-xs text-slate-400">Loading history...</div> : bankActivity.length === 0 ? <div className="text-center py-12 text-xs text-slate-400">No history found</div> : (
                  bankActivity.map((trx) => (
                    <div key={trx.id} className="p-4 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${trx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {trx.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 truncate max-w-[150px]">{trx.item?.name || trx.description}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{new Date(trx.date).toLocaleDateString()} • {trx.item?.categories?.name || 'General'}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${trx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {trx.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('id-ID').format(trx.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-slate-50 bg-slate-50/30 text-center">
                <a href="/transactions" className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">View All Transactions</a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}