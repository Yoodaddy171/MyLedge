'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// Define types based on schema usage
export type Wallet = {
  id: any;
  name: string;
  current_balance?: number;
  type?: string;
  is_active?: boolean;
};

export type Category = {
  id: any;
  name: string;
  type: 'income' | 'expense' | 'transfer';
};

export type TransactionItem = {
  id: any;
  name: string;
  code?: string;
  category_id: any;
  categories?: Category; // Joined
};

export type Project = {
  id: any;
  name: string;
  status?: string;
};

export type Asset = {
  id: any;
  name: string;
  symbol: string;
};

export type Debt = {
  id: any;
  name: string;
  remaining_amount: number;
  is_paid?: boolean;
};

export type Goal = {
  id: any;
  name: string;
  status?: string;
};

export type Submission = {
  id: any;
  entity: string;
  doc_number?: string;
};

export type RecurringTransaction = {
  id: any;
  user_id: any;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  wallet_id: any;
  to_wallet_id?: any;
  item_id?: any;
  project_id?: any;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date?: string;
  next_occurrence: string;
  last_generated_date?: string;
  is_active: boolean;
  auto_generate: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type Tag = {
  id: any;
  user_id: any;
  name: string;
  color: string;
  icon?: string;
  created_at?: string;
};

export type BudgetAlert = {
  id: any;
  budget_id: any;
  user_id: any;
  threshold_percent: number;
  triggered_at: string;
  is_read: boolean;
  message: string;
  created_at?: string;
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

  loading: boolean;
  error: Error | null;

  refreshData: () => Promise<void>;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

export function GlobalDataProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [masterItems, setMasterItems] = useState<TransactionItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all master data in parallel
      // For wallets, we prefer the view if available to get balances, but fall back to table if needed.
      // app/page.tsx uses 'wallet_balances_view'. app/transactions/page.tsx uses 'wallets'.
      // We'll try to fetch 'wallet_balances_view' first as it likely contains all wallets + balances.
      
      const [
        walletsRes,
        itemsRes,
        categoriesRes,
        projectsRes,
        assetsRes,
        debtsRes,
        goalsRes,
        submissionsRes,
        recurringRes,
        tagsRes
      ] = await Promise.all([
        supabase.from('wallet_balances_view').select('*'), // Or 'wallets' if view is slow/restricted
        supabase.from('transaction_items').select('id, name, code, category_id, categories!fk_transaction_items_category(id, name, type)'),
        supabase.from('categories').select('id, name, type'),
        supabase.from('projects').select('id, name, status').neq('status', 'cancelled'),
        supabase.from('assets').select('id, name, symbol'),
        supabase.from('debts').select('id, name, remaining_amount, is_paid').eq('is_paid', false).gt('remaining_amount', 0),
        supabase.from('financial_goals').select('id, name'), // status column missing
        supabase.from('submissions').select('id, entity, doc_number'),
        supabase.from('recurring_transactions').select('*').order('next_occurrence', { ascending: true }),
        supabase.from('transaction_tags').select('*').order('name', { ascending: true })
      ]);

      if (walletsRes.error) throw walletsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      // Map and set state
      setWallets(walletsRes.data || []);
      setMasterItems((itemsRes.data || []) as any);
      setCategories(categoriesRes.data || []);
      setProjects(projectsRes.data || []);
      setAssets(assetsRes.data || []);
      setDebts(debtsRes.data || []);
      setGoals(goalsRes.data || []);
      setSubmissions(submissionsRes.data || []);
      setRecurringTransactions(recurringRes.data || []);
      setTags(tagsRes.data || []);

      // Budget alerts feature temporarily disabled until schema is ready
      // The budget_alerts table exists but has no columns defined yet
      setBudgetAlerts([]);

    } catch (err: any) {
      console.error('Error fetching global data:', err);
      logger.error('GlobalDataProvider', 'Failed to fetch global data', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const value = {
    wallets,
    categories,
    masterItems,
    projects,
    assets,
    debts,
    goals,
    submissions,
    recurringTransactions,
    tags,
    budgetAlerts,
    loading,
    error,
    refreshData: fetchData
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
