"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck,
  Target,
  AlertCircle,
  X as CloseIcon,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';
import { checkBudgetsAndCreateAlerts } from '@/lib/budget-alert-processor';
import { useDashboardStats, useChartData, useRecentTransactions } from '@/hooks/useQueries';
import { useIdlePrefetch } from '@/hooks/usePrefetch';
import { SkeletonDashboardFull } from '@/components/ui/Skeleton';

// Dashboard Components
import MetricCard from '@/components/dashboard/MetricCard';
import CashFlowChart from '@/components/dashboard/CashFlowChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import BankAccounts from '@/components/dashboard/BankAccounts';
import PriorityGoals from '@/components/dashboard/PriorityGoals';
import GrowthIndex from '@/components/dashboard/GrowthIndex';
import GoalProgressCard from '@/components/dashboard/GoalProgressCard';
import { useGlobalData, Wallet, Goal, Transaction } from '@/contexts/GlobalDataContext';
import type { DashboardStats, ChartDataPoint, Task, BankActivity } from '@/lib/types';

export default function Dashboard() {
  const { wallets, debts, goals: globalGoals, recurringTransactions, budgetAlerts, refreshData, loading: globalLoading } = useGlobalData();

  // Use React Query for dashboard stats - data cached & background refresh
  const { data: dashboardData, isLoading: statsLoading } = useDashboardStats();

  // Prefetch other pages data when browser is idle
  const { prefetchOnIdle } = useIdlePrefetch();
  useEffect(() => {
    prefetchOnIdle();
  }, [prefetchOnIdle]);

  const [stats, setStats] = useState<DashboardStats>({
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
  const [recentTrx, setRecentTrx] = useState<Transaction[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingBudgets, setCheckingBudgets] = useState(false);

  // Activity Modal State
  const [selectedBankForActivity, setSelectedBankForActivity] = useState<Wallet | null>(null);
  const [bankActivity, setBankActivity] = useState<BankActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Chart States
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // Pop-up States
  const [showReminders, setShowReminders] = useState(false);

  useBodyScrollLock(showReminders);

  // Fetch dashboard data when global data is ready (loading finished)
  useEffect(() => {
    if (!globalLoading) {
      fetchDashboardData();
    }
  }, [globalLoading, wallets, debts]);

  // Step 4: Client-side recurring transaction check
  useEffect(() => {
    const checkRecurring = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Only check once per day - use ISO date format (YYYY-MM-DD) for timezone consistency
      const lastCheck = localStorage.getItem('last_recurring_check');
      const today = new Date().toISOString().split('T')[0];

      if (lastCheck !== today) {
        try {
          const response = await fetch('/api/generate-recurring', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
          });

          const result = await response.json();

          if (response.ok && result.created > 0) {
            console.log(`Auto-generated ${result.created} recurring transaction(s)`);
            // Refresh dashboard data to show new transactions
            fetchDashboardData();
          }

          localStorage.setItem('last_recurring_check', today);
        } catch (error) {
          console.error('Error checking recurring transactions:', error);
        }
      }
    };

    checkRecurring();
  }, []);

  // Automatic budget checking (runs once per day)
  useEffect(() => {
    const checkBudgets = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Only check once per day - use ISO date format (YYYY-MM-DD) for timezone consistency
      const lastBudgetCheck = localStorage.getItem('last_budget_check');
      const today = new Date().toISOString().split('T')[0];

      if (lastBudgetCheck !== today) {
        try {
          const result = await checkBudgetsAndCreateAlerts(user.id);

          if (result.created > 0) {
            console.log(`Created ${result.created} budget alert(s) from ${result.checked} budget(s)`);
            // Refresh global data to show new alerts
            refreshData();
          }

          localStorage.setItem('last_budget_check', today);
        } catch (error) {
          console.error('Error checking budgets:', error);
          // Silently fail - don't disrupt user experience
        }
      }
    };

    checkBudgets();
  }, [refreshData]);

  // Effect for Chart Data specifically when filters change
  useEffect(() => {
    fetchChartData();
  }, [viewMode, selectedMonth, selectedYear, wallets]);

  async function fetchDashboardData() {
    try {
      setLoading(true);

      // CRITICAL: Get authenticated user first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('No authenticated user');
        setLoading(false);
        return;
      }

      const [
        { data: netWorthView },
        { data: portfolioView },
        { data: recentTransactions },
        { data: tasks },
        { data: allTransactions },
        { data: activeGoals }
      ] = await Promise.all([
        // ALL QUERIES MUST FILTER BY USER_ID
        supabase.from('net_worth_view').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('portfolio_summary_view').select('*').eq('user_id', user.id),
        supabase.from('transactions')
          .select('*, item:transaction_items!fk_transactions_item(name)')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(5),
        supabase.from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('deadline', { ascending: true })
          .limit(10),
        supabase.from('transactions')
          .select('wallet_id, amount, type, date')
          .eq('user_id', user.id)
          .gte('date', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString()),
        supabase.from('financial_goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('deadline', { ascending: true })
      ]);

      const totalCash = wallets?.reduce((acc, curr) => acc + Number(curr.current_balance || 0), 0) || 0;
      const loanDebt = debts?.reduce((acc, curr) => acc + Number(curr.remaining_amount), 0) || 0;
      const ccDebt = Number(netWorthView?.total_liabilities) || 0;
      const totalDebt = ccDebt + loanDebt;
      const totalAssets = portfolioView?.reduce((acc, curr) => acc + Number(curr.current_value), 0) || 0;
      const realNetWorth = totalCash + totalAssets - totalDebt;

      setRecentTrx(recentTransactions || []);
      setUpcomingTasks(tasks?.filter(t => t.status !== 'done').slice(0, 3) || []);
      setGoals(activeGoals || []);

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

      // CRITICAL: Get authenticated user first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setLoadingChart(false);
        return;
      }

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
        .eq('user_id', user.id)
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

      // CRITICAL: Get authenticated user first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setLoadingActivity(false);
        return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          item:transaction_items!fk_transactions_item(name, categories!fk_transaction_items_category(name))
        `)
        .eq('user_id', user.id)
        .eq('wallet_id', walletId)
        .order('date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setBankActivity(data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(error);
    } finally {
      setLoadingActivity(false);
    }
  }

  const openActivityModal = (bank: any) => {
    setSelectedBankForActivity(bank);
    fetchBankActivity(bank.id);
  };

  const handleManualBudgetCheck = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCheckingBudgets(true);
    try {
      const result = await checkBudgetsAndCreateAlerts(user.id);
      console.log(`Manual check: Created ${result.created} alert(s) from ${result.checked} budget(s)`);

      if (result.created > 0) {
        // Refresh global data to show new alerts
        await refreshData();
      }

      // Update last check timestamp
      localStorage.setItem('last_budget_check', new Date().toDateString());
    } catch (error) {
      console.error('Error checking budgets manually:', error);
    } finally {
      setCheckingBudgets(false);
    }
  };

  const getHealthStatus = (rate: number) => {
    if (rate >= 30) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <ShieldCheck className="text-emerald-600" size={16} /> };
    if (rate >= 10) return { label: 'Stable', color: 'text-blue-600', bg: 'bg-blue-50', icon: <Target className="text-blue-600" size={16} /> };
    return { label: 'Action Needed', color: 'text-red-600', bg: 'bg-red-50', icon: <AlertCircle className="text-red-600" size={16} /> };
  };

  const health = getHealthStatus(stats.savingsRate);

  // Filter critical budget alerts (threshold >= 100%)
  const criticalAlerts = budgetAlerts.filter(alert => alert.threshold_percent >= 100).slice(0, 3);

  // Filter debts due within 7 days
  const upcomingDebts = useMemo(() => {
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
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 3);
  }, [debts]);

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
                    <div className={`w-2 h-2 rounded-full shrink-0 ${t.priority === 'urgent' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
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
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-blue-600">Intelligence</h2>
            <p className="text-slate-500 text-xs md:text-sm mt-0.5">Financial health overview</p>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${health.bg} border-opacity-50 shadow-sm`}>
              {health.icon}
              <p className={`text-xs font-bold ${health.color}`}>{health.label}</p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {/* Manual Budget Check Button */}
          <button
            onClick={handleManualBudgetCheck}
            disabled={checkingBudgets}
            className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Check Budgets Now"
          >
            {checkingBudgets ? (
              <div className="w-[18px] h-[18px] border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <Target size={18} className="text-slate-600" />
            )}
          </button>

          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${health.bg} border-opacity-50 shadow-sm`}>
            {health.icon}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none mb-0.5">Status</p>
              <p className={`text-sm font-bold ${health.color} leading-none`}>{health.label}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Critical Budget Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-4 md:p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-xl shrink-0">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm md:text-base font-bold text-red-900">Budget Alerts</h3>
                <a
                  href="/budgets"
                  className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
                >
                  View All
                </a>
              </div>
              <p className="text-xs text-red-700 mb-3">
                {criticalAlerts.length} budget{criticalAlerts.length > 1 ? 's have' : ' has'} exceeded the limit
              </p>
              <div className="space-y-2">
                {criticalAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-red-100 shadow-sm"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-2 h-2 bg-red-500 rounded-full shrink-0 animate-pulse" />
                      <p className="text-xs md:text-sm font-semibold text-slate-900 truncate">
                        {alert.message}
                      </p>
                    </div>
                    <div className="ml-3 shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                        {Math.round(alert.threshold_percent)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Debt Due Dates Alert */}
      {upcomingDebts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-4 md:p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl shrink-0">
              <AlertCircle className="text-amber-600" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm md:text-base font-bold text-amber-900">Tagihan Segera Jatuh Tempo</h3>
                <a
                  href="/debts"
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                >
                  Lihat Semua
                </a>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                {upcomingDebts.length} hutang akan jatuh tempo dalam 7 hari ke depan
              </p>
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
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isUrgent ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                        <div className="min-w-0">
                          <p className="text-xs md:text-sm font-semibold text-slate-900 truncate">
                            {debt.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(debt.remaining_amount)}
                          </p>
                        </div>
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${isUrgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                          {daysLeft === 0 ? 'Hari Ini!' : daysLeft === 1 ? 'Besok' : `${daysLeft} hari lagi`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading || statsLoading ? (
        <SkeletonDashboardFull />
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
              <GoalProgressCard goals={goals} />
              {recurringTransactions.filter(r => r.is_active).length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900">Upcoming Recurring</h3>
                    <a href="/recurring" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                      View All
                    </a>
                  </div>
                  <div className="space-y-3">
                    {recurringTransactions
                      .filter(r => r.is_active)
                      .slice(0, 5)
                      .map(r => (
                        <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-slate-900 truncate">{r.description}</p>
                            <p className="text-[10px] text-slate-500 mt-1">
                              {new Date(r.next_occurrence).toLocaleDateString()} • {r.frequency}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${r.type === 'income' ? 'text-emerald-600' : r.type === 'transfer' ? 'text-blue-600' : 'text-red-600'}`}>
                              {r.type === 'income' ? '+' : r.type === 'expense' ? '-' : ''} {new Intl.NumberFormat('id-ID').format(r.amount)}
                            </p>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold ${r.type === 'income' ? 'bg-emerald-50 text-emerald-600' :
                                r.type === 'expense' ? 'bg-red-50 text-red-600' :
                                  'bg-blue-50 text-blue-600'
                              }`}>
                              {r.type}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
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
                      <span className={`text-sm font-bold ${trx.type === 'income' ? 'text-emerald-600' : trx.type === 'transfer' ? 'text-blue-600' : 'text-red-600'}`}>
                        {trx.type === 'income' ? '+' : trx.type === 'expense' ? '-' : ''} {new Intl.NumberFormat('id-ID').format(trx.amount)}
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