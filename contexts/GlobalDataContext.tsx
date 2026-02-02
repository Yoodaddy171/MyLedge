'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

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

      // CRITICAL: Get authenticated user first - ALL queries must filter by user_id
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        logger.warn('No authenticated user, clearing data', { component: 'GlobalDataProvider' });
        // Clear all data if no user
        setUserId(null);
        setWallets([]);
        setMasterItems([]);
        setCategories([]);
        setProjects([]);
        setAssets([]);
        setDebts([]);
        setGoals([]);
        setSubmissions([]);
        setRecurringTransactions([]);
        setTags([]);
        setBudgetAlerts([]);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // Fetch all master data in parallel - ALL QUERIES MUST FILTER BY USER_ID
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
        tagsRes,
        alertsRes
      ] = await Promise.all([
        // Wallets - filter by user_id
        supabase.from('wallet_balances_view').select('*').eq('user_id', user.id),
        // Transaction items - filter by user_id
        supabase.from('transaction_items')
          .select('*, categories!fk_transaction_items_category(id, name, type)')
          .eq('user_id', user.id),
        // Categories - filter by user_id
        supabase.from('categories').select('*').eq('user_id', user.id),
        // Projects - filter by user_id
        supabase.from('projects')
          .select('*')
          .eq('user_id', user.id)
          .neq('status', 'cancelled'),
        // Assets - filter by user_id
        supabase.from('assets').select('*').eq('user_id', user.id),
        // Debts - filter by user_id
        supabase.from('debts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_paid', false)
          .gt('remaining_amount', 0),
        // Financial goals - filter by user_id
        supabase.from('financial_goals').select('*').eq('user_id', user.id),
        // Submissions - filter by user_id
        supabase.from('submissions').select('*').eq('user_id', user.id),
        // Recurring transactions - filter by user_id
        supabase.from('recurring_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('next_occurrence', { ascending: true }),
        // Transaction tags - filter by user_id
        supabase.from('transaction_tags')
          .select('*')
          .eq('user_id', user.id)
          .order('name', { ascending: true }),
        // Budget alerts - filter by user_id
        supabase.from('budget_alerts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
      ]);

      // Handle errors
      if (walletsRes.error) throw walletsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (projectsRes.error) logger.warn('Projects fetch error', { component: 'GlobalDataProvider' });
      if (assetsRes.error) logger.warn('Assets fetch error', { component: 'GlobalDataProvider' });
      if (debtsRes.error) logger.warn('Debts fetch error', { component: 'GlobalDataProvider' });
      if (goalsRes.error) logger.warn('Goals fetch error', { component: 'GlobalDataProvider' });
      if (submissionsRes.error) logger.warn('Submissions fetch error', { component: 'GlobalDataProvider' });
      if (recurringRes.error) logger.warn('Recurring fetch error', { component: 'GlobalDataProvider' });
      if (tagsRes.error) logger.warn('Tags fetch error', { component: 'GlobalDataProvider' });
      if (alertsRes.error) logger.warn('Budget alerts fetch error', { component: 'GlobalDataProvider' });

      // Set state with fetched data
      setWallets((walletsRes.data || []) as Wallet[]);
      setMasterItems((itemsRes.data || []) as TransactionItem[]);
      setCategories((categoriesRes.data || []) as Category[]);
      setProjects((projectsRes.data || []) as Project[]);
      setAssets((assetsRes.data || []) as Asset[]);
      setDebts((debtsRes.data || []) as Debt[]);
      setGoals((goalsRes.data || []) as Goal[]);
      setSubmissions((submissionsRes.data || []) as Submission[]);
      setRecurringTransactions((recurringRes.data || []) as RecurringTransaction[]);
      setTags((tagsRes.data || []) as Tag[]);
      setBudgetAlerts((alertsRes.data || []) as BudgetAlert[]);

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Error fetching global data:', error);
      logger.error('Failed to fetch global data', error, { component: 'GlobalDataProvider' });
      setError(error);
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
    userId,
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
