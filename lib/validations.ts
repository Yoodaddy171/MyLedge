/**
 * Zod validation schemas for forms
 */

import { z } from 'zod';

// Common validations
export const requiredString = z.string().min(1, 'This field is required');
export const optionalString = z.string().optional();
export const positiveNumber = z.number().positive('Amount must be greater than 0');
export const nonNegativeNumber = z.number().min(0, 'Amount cannot be negative');

// Transaction schema
export const transactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer'], {
    message: 'Transaction type is required'
  }),
  amount: z.string()
    .min(1, 'Amount is required')
    .refine(val => Number(val.replace(/\D/g, '')) > 0, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  notes: z.string().optional(),
  wallet_id: z.string().min(1, 'Source wallet is required'),
  to_wallet_id: z.string().optional(),
  item_id: z.string().optional(),
  project_id: z.string().optional(),
  debt_id: z.string().optional()
}).refine(
  data => {
    // For transfers, to_wallet_id is required
    if (data.type === 'transfer') {
      return !!data.to_wallet_id;
    }
    return true;
  },
  {
    message: 'Destination wallet is required for transfers',
    path: ['to_wallet_id']
  }
).refine(
  data => {
    // Cannot transfer to same wallet
    if (data.type === 'transfer' && data.wallet_id && data.to_wallet_id) {
      return data.wallet_id !== data.to_wallet_id;
    }
    return true;
  },
  {
    message: 'Cannot transfer to the same wallet',
    path: ['to_wallet_id']
  }
);

// Wallet schema
export const walletSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['bank', 'cash', 'credit_card', 'e_wallet', 'investment']),
  initial_balance: z.string().refine(
    val => !isNaN(Number(val)),
    'Initial balance must be a valid number'
  ),
  currency: z.string().min(3, 'Currency code required')
});

// Project schema
export const projectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().optional(),
  budget: z.string()
    .min(1, 'Budget is required')
    .refine(val => Number(val.replace(/\D/g, '')) > 0, 'Budget must be greater than 0'),
  status: z.enum(['planning', 'in_progress', 'completed', 'on_hold', 'cancelled']),
  deadline: z.string().optional()
});

// Task schema
export const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  category: z.string().optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low']),
  status: z.enum(['todo', 'done']),
  deadline: z.string().optional(),
  notes: z.string().optional()
});

// Debt schema
export const debtSchema = z.object({
  name: z.string().min(3, 'Debt name must be at least 3 characters'),
  creditor: z.string().min(2, 'Creditor name required'),
  total_amount: z.string()
    .min(1, 'Total amount is required')
    .refine(val => Number(val.replace(/\D/g, '')) > 0, 'Amount must be greater than 0'),
  remaining_amount: z.string()
    .min(1, 'Remaining amount is required')
    .refine(val => Number(val.replace(/\D/g, '')) >= 0, 'Amount cannot be negative'),
  monthly_payment: z.string().optional(),
  interest_rate: z.string().optional(),
  due_date: z.string().optional(),
  notes: z.string().optional()
});

// Category schema
export const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  type: z.enum(['income', 'expense']),
  icon: z.string().optional(),
  color: z.string().optional()
});

// Transaction Item schema
export const transactionItemSchema = z.object({
  name: z.string().min(2, 'Item name must be at least 2 characters'),
  code: z.string().min(2, 'Item code required'),
  category_id: z.string().min(1, 'Category is required'),
  default_amount: z.string().optional()
});

// Asset schema
export const assetSchema = z.object({
  type: z.enum(['stock', 'crypto', 'bond', 'mutual_fund', 'real_estate', 'other']),
  symbol: z.string().min(1, 'Symbol/code is required'),
  name: z.string().min(2, 'Asset name required'),
  quantity: z.string()
    .min(1, 'Quantity is required')
    .refine(val => Number(val) > 0, 'Quantity must be greater than 0'),
  avg_buy_price: z.string()
    .min(1, 'Purchase price is required')
    .refine(val => Number(val.replace(/\D/g, '')) > 0, 'Price must be greater than 0'),
  current_price: z.string().optional(),
  purchase_date: z.string().optional(),
  portfolio_name: z.string().optional(),
  notes: z.string().optional()
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// Sign up schema
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine(
  data => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }
);

// Type exports for use in components
export type TransactionFormData = z.infer<typeof transactionSchema>;
export type WalletFormData = z.infer<typeof walletSchema>;
export type ProjectFormData = z.infer<typeof projectSchema>;
export type TaskFormData = z.infer<typeof taskSchema>;
export type DebtFormData = z.infer<typeof debtSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type TransactionItemFormData = z.infer<typeof transactionItemSchema>;
export type AssetFormData = z.infer<typeof assetSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
