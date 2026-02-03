'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/react-query';
import type {
  Wallet,
  Category,
  TransactionItem,
  Project,
  Asset,
  Debt,
  Goal,
  Submission,
  RecurringTransaction,
  Tag,
  BudgetAlert,
  Transaction,
} from '@/contexts/GlobalDataContext';

// Helper untuk mendapatkan user ID
async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ============================================
// MASTER DATA HOOKS (stale time lebih lama)
// ============================================

export function useWallets() {
  return useQuery({
    queryKey: queryKeys.wallets,
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('wallet_balances_view')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []) as Wallet[];
    },
    staleTime: 10 * 60 * 1000, // 10 menit untuk master data
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []) as Category[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useMasterItems() {
  return useQuery({
    queryKey: queryKeys.masterItems,
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('transaction_items')
        .select('*, categories!fk_transaction_items_category(id, name, type)')
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []) as TransactionItem[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'cancelled');

      if (error) throw error;
      return (data || []) as Project[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('transaction_tags')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as Tag[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================
// FINANCIAL DATA HOOKS
// ============================================

export function useDebts() {
  return useQuery({
    queryKey: queryKeys.debts,
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_paid', false)
        .gt('remaining_amount', 0);

      if (error) throw error;
      return (data || []) as Debt[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals,
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []) as Goal[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssets() {
  return useQuery({
    queryKey: queryKeys.assets,
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []) as Asset[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecurringTransactions() {
  return useQuery({
    queryKey: queryKeys.recurringTransactions,
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('next_occurrence', { ascending: true });

      if (error) throw error;
      return (data || []) as RecurringTransaction[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useBudgetAlerts() {
  return useQuery({
    queryKey: queryKeys.budgetAlerts,
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('budget_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as BudgetAlert[];
    },
    staleTime: 2 * 60 * 1000, // 2 menit untuk alerts
  });
}

export function useSubmissions() {
  return useQuery({
    queryKey: queryKeys.submissions,
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []) as Submission[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// TRANSACTION HOOKS
// ============================================

export function useRecentTransactions(limit: number = 5) {
  return useQuery({
    queryKey: queryKeys.recentTransactions(limit),
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select('*, item:transaction_items!fk_transactions_item(name)')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as Transaction[];
    },
    staleTime: 1 * 60 * 1000, // 1 menit untuk recent transactions
  });
}

// ============================================
// DASHBOARD HOOKS
// ============================================

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return null;

      // Use the optimized dashboard_summary_view for main stats
      // This reduces 6+ queries to just 1 query!
      const [summaryRes, portfolioRes, tasksRes] = await Promise.all([
        supabase.from('dashboard_summary_view').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('portfolio_summary_view').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId).order('deadline', { ascending: true }).limit(10),
      ]);

      return {
        summary: summaryRes.data,
        portfolio: portfolioRes.data || [],
        tasks: tasksRes.data || [],
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

// Type for dashboard summary
export type DashboardSummary = {
  user_id: string;
  monthly_income: number;
  monthly_expense: number;
  total_cash: number;
  total_debt: number;
  total_assets: number;
  net_worth: number;
  savings_rate: number;
  todo_count: number;
  in_progress_count: number;
  urgent_count: number;
};

export function useChartData(
  viewMode: 'weekly' | 'monthly' | 'yearly',
  selectedMonth: number,
  selectedYear: number,
  wallets: Wallet[]
) {
  return useQuery({
    queryKey: queryKeys.dashboardChart(viewMode, selectedMonth, selectedYear),
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId || wallets.length === 0) return [];

      let startDate: Date, endDate: Date;

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
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (!trxs) return [];

      let processed: Record<string, unknown>[] = [];

      if (viewMode === 'weekly' || viewMode === 'monthly') {
        const days: string[] = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          days.push(new Date(d).toISOString().split('T')[0]);
        }

        processed = days.map(day => {
          const dayTrx = trxs.filter(t => t.date === day);
          const dataPoint: Record<string, unknown> = {
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
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        processed = months.map((month, idx) => {
          const monthTrx = trxs.filter(t => new Date(t.date).getMonth() === idx);
          const dataPoint: Record<string, unknown> = { name: month };
          wallets.forEach(w => {
            dataPoint[w.name] = monthTrx
              .filter(t => t.wallet_id === w.id && t.type === 'income')
              .reduce((acc, curr) => acc + Number(curr.amount), 0);
          });
          return dataPoint;
        });
      }

      return processed;
    },
    staleTime: 5 * 60 * 1000,
    enabled: wallets.length > 0,
  });
}

// ============================================
// COMBINED HOOK FOR GLOBAL DATA
// ============================================

export function useGlobalDataQuery() {
  const wallets = useWallets();
  const categories = useCategories();
  const masterItems = useMasterItems();
  const projects = useProjects();
  const tags = useTags();
  const debts = useDebts();
  const goals = useGoals();
  const assets = useAssets();
  const recurringTransactions = useRecurringTransactions();
  const budgetAlerts = useBudgetAlerts();
  const submissions = useSubmissions();

  const isLoading =
    wallets.isLoading ||
    categories.isLoading ||
    masterItems.isLoading ||
    projects.isLoading ||
    tags.isLoading ||
    debts.isLoading ||
    goals.isLoading ||
    assets.isLoading ||
    recurringTransactions.isLoading ||
    budgetAlerts.isLoading ||
    submissions.isLoading;

  const queryClient = useQueryClient();

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
    queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    queryClient.invalidateQueries({ queryKey: queryKeys.masterItems });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    queryClient.invalidateQueries({ queryKey: queryKeys.debts });
    queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    queryClient.invalidateQueries({ queryKey: queryKeys.assets });
    queryClient.invalidateQueries({ queryKey: queryKeys.recurringTransactions });
    queryClient.invalidateQueries({ queryKey: queryKeys.budgetAlerts });
    queryClient.invalidateQueries({ queryKey: queryKeys.submissions });
  };

  return {
    wallets: wallets.data || [],
    categories: categories.data || [],
    masterItems: masterItems.data || [],
    projects: projects.data || [],
    tags: tags.data || [],
    debts: debts.data || [],
    goals: goals.data || [],
    assets: assets.data || [],
    recurringTransactions: recurringTransactions.data || [],
    budgetAlerts: budgetAlerts.data || [],
    submissions: submissions.data || [],
    loading: isLoading,
    refreshData,
  };
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useInvalidateOnSuccess() {
  const queryClient = useQueryClient();

  return {
    invalidateTransactions: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },
    invalidateWallets: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },
    invalidateDebts: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.debts });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },
    invalidateGoals: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries();
    },
  };
}
