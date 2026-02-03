'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/react-query';

// Helper untuk mendapatkan user ID
async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Hook untuk prefetch data saat hover pada navigation links
 * Ini membuat navigasi terasa instant karena data sudah di-cache
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  // Prefetch transactions page data
  const prefetchTransactions = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;

    await queryClient.prefetchQuery({
      queryKey: queryKeys.transactions({ page: 1 }),
      queryFn: async () => {
        const { data } = await supabase
          .from('transactions')
          .select(`
            *,
            wallet:wallets!fk_transactions_wallet(name),
            to_wallet:wallets!fk_transactions_to_wallet(name),
            project:projects!fk_transactions_project(name),
            item:transaction_items!fk_transactions_item(name, code, categories!fk_transaction_items_category(id, name))
          `, { count: 'exact' })
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .range(0, 24);

        return data || [];
      },
      staleTime: 2 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch dashboard data
  const prefetchDashboard = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;

    await queryClient.prefetchQuery({
      queryKey: queryKeys.dashboardStats,
      queryFn: async () => {
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
  }, [queryClient]);

  // Prefetch debts page data
  const prefetchDebts = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;

    await queryClient.prefetchQuery({
      queryKey: queryKeys.debts,
      queryFn: async () => {
        const { data } = await supabase
          .from('debts')
          .select('*')
          .eq('user_id', userId)
          .order('due_date', { ascending: true });

        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch goals page data
  const prefetchGoals = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;

    await queryClient.prefetchQuery({
      queryKey: queryKeys.goals,
      queryFn: async () => {
        const { data } = await supabase
          .from('financial_goals')
          .select('*')
          .eq('user_id', userId)
          .order('deadline', { ascending: true });

        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch investments/assets page data
  const prefetchInvestments = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;

    await queryClient.prefetchQuery({
      queryKey: queryKeys.assets,
      queryFn: async () => {
        const { data } = await supabase
          .from('assets')
          .select('*')
          .eq('user_id', userId)
          .order('symbol', { ascending: true });

        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch budgets page data
  const prefetchBudgets = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;

    await queryClient.prefetchQuery({
      queryKey: queryKeys.budgets,
      queryFn: async () => {
        const currentDate = new Date();
        const { data } = await supabase
          .from('budgets')
          .select('*, category:categories(name, icon, color)')
          .eq('user_id', userId)
          .eq('month', currentDate.getMonth() + 1)
          .eq('year', currentDate.getFullYear());

        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch recurring transactions
  const prefetchRecurring = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;

    await queryClient.prefetchQuery({
      queryKey: queryKeys.recurringTransactions,
      queryFn: async () => {
        const { data } = await supabase
          .from('recurring_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('next_occurrence', { ascending: true });

        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch tasks
  const prefetchTasks = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return;

    await queryClient.prefetchQuery({
      queryKey: queryKeys.tasks,
      queryFn: async () => {
        const { data } = await supabase
          .from('tasks')
          .select('*, category:task_categories(name, icon, color)')
          .eq('user_id', userId)
          .order('deadline', { ascending: true });

        return data || [];
      },
      staleTime: 2 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch banks/wallets
  const prefetchBanks = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.wallets,
      staleTime: 10 * 60 * 1000,
    });
  }, [queryClient]);

  // Map route to prefetch function
  const prefetchForRoute = useCallback((route: string) => {
    switch (route) {
      case '/':
        return prefetchDashboard;
      case '/transactions':
        return prefetchTransactions;
      case '/debts':
        return prefetchDebts;
      case '/goals':
        return prefetchGoals;
      case '/investments':
        return prefetchInvestments;
      case '/budgets':
        return prefetchBudgets;
      case '/recurring':
        return prefetchRecurring;
      case '/tasks':
        return prefetchTasks;
      case '/banks':
        return prefetchBanks;
      default:
        return null;
    }
  }, [
    prefetchDashboard,
    prefetchTransactions,
    prefetchDebts,
    prefetchGoals,
    prefetchInvestments,
    prefetchBudgets,
    prefetchRecurring,
    prefetchTasks,
    prefetchBanks,
  ]);

  return {
    prefetchTransactions,
    prefetchDashboard,
    prefetchDebts,
    prefetchGoals,
    prefetchInvestments,
    prefetchBudgets,
    prefetchRecurring,
    prefetchTasks,
    prefetchBanks,
    prefetchForRoute,
  };
}

/**
 * Hook untuk prefetch data saat browser idle
 * Ini memastikan data yang sering diakses sudah ready
 */
export function useIdlePrefetch() {
  const { prefetchDashboard, prefetchTransactions } = usePrefetch();

  // Prefetch critical data saat browser idle
  const prefetchOnIdle = useCallback(() => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        prefetchDashboard();
        prefetchTransactions();
      }, { timeout: 5000 });
    } else {
      // Fallback untuk browser yang tidak support requestIdleCallback
      setTimeout(() => {
        prefetchDashboard();
        prefetchTransactions();
      }, 2000);
    }
  }, [prefetchDashboard, prefetchTransactions]);

  return { prefetchOnIdle };
}
