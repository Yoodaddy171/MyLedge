// Shared types for the application
// Re-export core entity types from GlobalDataContext
export type {
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

import type { Wallet } from '@/contexts/GlobalDataContext';

// Additional types for views and computed data

// Simple option types for dropdowns (id, name only)
export interface WalletOption {
  id: number;
  name: string;
}

export interface ProjectOption {
  id: number;
  name: string;
}

export interface CategoryOption {
  id: number;
  name: string;
}

export interface SubmissionOption {
  id: number;
  entity: string;
  doc_number?: string;
}

// Wallet with computed balance from wallet_balances_view
export interface WalletWithBalance extends Wallet {
  total_income?: number;
  total_expense?: number;
  total_transfer_in?: number;
  total_transfer_out?: number;
  // Computed fields added by page logic
  balance?: number;
  income?: number;
  expense?: number;
  trxCount?: number;
}

// Dashboard types
export interface DashboardStats {
  income: number;
  expense: number;
  balance: number;
  todo: number;
  inProgress: number;
  urgent: number;
  savingsRate: number;
  netWorth: number;
  totalAssets: number;
  totalDebt: number;
}

export interface ChartDataPoint {
  name: string;
  income: number;
  expense: number;
  label?: string;
}

// Task types
export interface Task {
  id: number;
  user_id: string;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string | null;
  category?: string | null;
  category_id?: number | null;
  project_id?: number | null;
  submission_id?: number | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  completed_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  taskCategory?: { id: number; name: string } | null;
  project?: { id: number; name: string } | null;
  submission?: { id: number; entity: string } | null;
  projectName?: string;
}

export interface TaskCategory {
  id: number;
  user_id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  created_at: string;
}

// Budget types
export interface Budget {
  id: number;
  user_id: string;
  category_id: number;
  amount: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  categories?: { name: string; type: string } | null;
}

export interface BudgetWithSpent extends Budget {
  spent?: number;
  remaining?: number;
  percentage?: number;
  // Fields from budget_tracking_view
  category_name?: string;
  budget_amount?: number;
  spent_amount?: number;
  remaining_amount?: number;
  percentage_used?: number;
  is_exceeded?: boolean;
  month?: number;
  year?: number;
}

// Bank/Wallet Activity (transactions joined with item and category)
export interface BankActivity {
  id: number;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  description: string;
  wallet_id: number;
  to_wallet_id?: number | null;
  // Joined from transaction_items with categories
  item?: {
    name: string;
    categories?: {
      name: string;
    } | null;
  } | null;
}

// Project Summary View
export interface ProjectSummary {
  id: number;
  user_id: string;
  name: string;
  description?: string | null;
  total_budget: number;
  status: string;
  deadline?: string | null;
  actual_spent: number;
  remaining_budget: number;
  budget_percentage_used: number;
  transaction_count: number;
  last_transaction_date?: string | null;
}

// Analytics types
export interface AnalyticsData {
  radar: RadarDataPoint[];
  history: NetWorthHistoryPoint[];
  stats: {
    score: number;
    status: string;
    color: string;
  };
}

export interface RadarDataPoint {
  subject: string;
  A: number;
}

export interface NetWorthHistoryPoint {
  id?: number;
  user_id: string;
  total_assets: number;
  total_debts: number;
  net_worth: number;
  recorded_at: string;
}

// Asset transaction history
export interface AssetTransaction {
  id: number;
  user_id: string;
  asset_id: number;
  type: 'buy' | 'sell' | 'dividend' | 'interest';
  amount: number;
  price: number;
  total_amount: number;
  recorded_at: string;
  notes?: string | null;
  created_at: string;
  // Joined
  asset?: {
    symbol: string;
    name: string;
  } | null;
}

// Forecast types
export interface ForecastDataPoint {
  date: string;
  balance: number;
  event: string;
}

// Report types
export interface CategorySpending {
  name: string;
  value: number;
  [key: string]: string | number; // Index signature for recharts compatibility
}

// User type for auth
export interface AppUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
}
