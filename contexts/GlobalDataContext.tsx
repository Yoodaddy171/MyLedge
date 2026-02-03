'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/react-query';
import {
  useWallets,
  useCategories,
  useMasterItems,
  useProjects,
  useTags,
  useDebts,
  useGoals,
  useAssets,
  useRecurringTransactions,
  useBudgetAlerts,
  useSubmissions,
} from '@/hooks/useQueries';

// Define types based on database schema
export type Wallet = {
  id: number;
  user_id: string;
  name: string;
  type: 'bank' | 'cash' | 'credit_card' | 'e_wallet' | 'investment';
  initial_balance: number;
  current_balance: number;
  currency: string;
  icon?: string | null;
  color?: string | null;
  is_active: boolean;
  is_excluded_from_total: boolean;
  account_number?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: number;
  user_id: string;
  name: string;
  type: 'income' | 'expense'; // 'transfer' is NOT a valid category type in DB
  icon?: string;
  color?: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type TransactionItem = {
  id: number;
  user_id: string;
  name: string;
  code: string;
  category_id: number;
  default_amount: number;
  is_favorite: boolean;
  categories?: Category; // Joined
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: number;
  user_id: string;
  name: string;
  description?: string | null;
  total_budget: number;
  spent_amount: number;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  start_date?: string | null;
  deadline?: string;
  completion_date?: string | null;
  priority: number;
  color?: string | null;
  created_at: string;
  updated_at: string;
};

export type Asset = {
  id: number;
  user_id: string;
  name: string;
  symbol: string;
  type: 'stock' | 'crypto' | 'bond' | 'mutual_fund' | 'real_estate' | 'other';
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  total_cost: number;
  current_value: number;
  unrealized_gain: number;
  purchase_date?: string | null;
  portfolio_name?: string | null;
  notes?: string | null;
  last_price_update?: string | null;
  created_at: string;
  updated_at: string;
};

export type Debt = {
  id: number;
  user_id: string;
  name: string;
  creditor: string;
  total_amount: number;
  remaining_amount: number;
  monthly_payment: number;
  interest_rate: number;
  start_date?: string | null;
  due_date: string;
  is_paid: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  debt_type?: string | null;
  installment_count?: number | null;
  installment_paid?: number | null;
};

export type Goal = {
  id: number;
  user_id: string;
  name: string;
  description?: string | null;
  target_amount: number;
  current_amount: number;
  category?: string | null;
  deadline?: string | null;
  is_achieved: boolean;
  achieved_at?: string | null;
  priority: number;
  icon?: string | null;
  color?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Submission = {
  id: number;
  user_id: string;
  entity: string;
  doc_number?: string | null;
  submission_date?: string | null;
  completion_date?: string | null;
  type?: string | null;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
};

export type RecurringTransaction = {
  id: number;
  user_id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  wallet_id: number;
  to_wallet_id?: number | null;
  item_id?: number | null;
  project_id?: number | null;
  debt_id?: number | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date?: string | null;
  next_occurrence: string;
  last_generated_date?: string | null;
  is_active: boolean;
  auto_generate: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type Tag = {
  id: number;
  user_id: string;
  name: string;
  color: string;
  icon?: string | null;
  created_at: string;
};

export type BudgetAlert = {
  id: number;
  budget_id: number;
  user_id: string;
  threshold_percent: number;
  triggered_at: string;
  is_read: boolean;
  message: string;
  created_at: string;
};

export type Transaction = {
  id: number;
  user_id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  description: string;
  notes?: string | null;
  wallet_id: number;
  to_wallet_id?: number | null;
  item_id?: number | null;
  project_id?: number | null;
  debt_id?: number | null;
  asset_id?: number | null;
  submission_id?: number | null;
  goal_id?: number | null;
  is_recurring: boolean;
  recurring_transaction_id?: number | null;
  receipt_url?: string | null;
  location?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  wallet?: { name: string } | null;
  to_wallet?: { name: string } | null;
  project?: { name: string } | null;
  item?: TransactionItem | null;
  asset?: { symbol: string; name: string } | null;
  debt?: { name: string } | null;
  tags?: Tag[];
};

interface GlobalDataContextType {
  wallets: Wallet[];
  categories: Category[];
  masterItems: TransactionItem[];
  projects: Project[];
  assets: Asset[];
  debts: Debt[];
  goals: Goal[];
  submissions: Submission[];
  recurringTransactions: RecurringTransaction[];
  tags: Tag[];
  budgetAlerts: BudgetAlert[];
  userId: string | null;

  loading: boolean;
  error: Error | null;

  refreshData: () => Promise<void>;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

export function GlobalDataProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  // Use React Query hooks for all data fetching
  const walletsQuery = useWallets();
  const categoriesQuery = useCategories();
  const masterItemsQuery = useMasterItems();
  const projectsQuery = useProjects();
  const tagsQuery = useTags();
  const debtsQuery = useDebts();
  const goalsQuery = useGoals();
  const assetsQuery = useAssets();
  const recurringQuery = useRecurringTransactions();
  const alertsQuery = useBudgetAlerts();
  const submissionsQuery = useSubmissions();

  // Track loading state
  const loading =
    walletsQuery.isLoading ||
    categoriesQuery.isLoading ||
    masterItemsQuery.isLoading ||
    projectsQuery.isLoading ||
    tagsQuery.isLoading ||
    debtsQuery.isLoading ||
    goalsQuery.isLoading ||
    assetsQuery.isLoading ||
    recurringQuery.isLoading ||
    alertsQuery.isLoading ||
    submissionsQuery.isLoading;

  // Get user ID on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session?.user) {
        // Clear all queries when logged out
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Set up Supabase Realtime subscriptions for live updates
  useEffect(() => {
    if (!userId) return;

    // Subscribe to transactions changes for real-time updates
    const transactionsChannel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate related queries when transactions change
          queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
        }
      )
      .subscribe();

    // Subscribe to wallet balance changes
    const walletsChannel = supabase
      .channel('wallets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
        }
      )
      .subscribe();

    // Subscribe to budget alerts
    const alertsChannel = supabase
      .channel('budget-alerts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'budget_alerts',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.budgetAlerts });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(walletsChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, [userId, queryClient]);

  // Collect any errors
  useEffect(() => {
    const errors = [
      walletsQuery.error,
      categoriesQuery.error,
      masterItemsQuery.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      setError(errors[0] as Error);
    } else {
      setError(null);
    }
  }, [walletsQuery.error, categoriesQuery.error, masterItemsQuery.error]);

  // Refresh function that invalidates all queries
  const refreshData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets }),
      queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
      queryClient.invalidateQueries({ queryKey: queryKeys.masterItems }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tags }),
      queryClient.invalidateQueries({ queryKey: queryKeys.debts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.goals }),
      queryClient.invalidateQueries({ queryKey: queryKeys.assets }),
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringTransactions }),
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetAlerts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
    ]);
  };

  const value: GlobalDataContextType = {
    wallets: walletsQuery.data || [],
    categories: categoriesQuery.data || [],
    masterItems: masterItemsQuery.data || [],
    projects: projectsQuery.data || [],
    assets: assetsQuery.data || [],
    debts: debtsQuery.data || [],
    goals: goalsQuery.data || [],
    submissions: submissionsQuery.data || [],
    recurringTransactions: recurringQuery.data || [],
    tags: tagsQuery.data || [],
    budgetAlerts: alertsQuery.data || [],
    userId,
    loading,
    error,
    refreshData,
  };

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
}

export function useGlobalData() {
  const context = useContext(GlobalDataContext);
  if (context === undefined) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
}
