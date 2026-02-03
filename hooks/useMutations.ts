'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/react-query';
import { toast } from 'sonner';
import type { Transaction, Wallet, Goal, BudgetAlert } from '@/contexts/GlobalDataContext';

// Helper untuk mendapatkan user ID
async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ============================================
// TRANSACTION MUTATIONS WITH OPTIMISTIC UPDATES
// ============================================

interface CreateTransactionPayload {
  date: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  notes?: string | null;
  wallet_id?: number | null;
  to_wallet_id?: number | null;
  item_id?: number | null;
  project_id?: number | null;
  debt_id?: number | null;
  asset_id?: number | null;
  submission_id?: number | null;
  goal_id?: number | null;
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payload,
      tagIds,
      recurringPayload,
    }: {
      payload: CreateTransactionPayload;
      tagIds?: number[];
      recurringPayload?: Record<string, unknown> | null;
    }) => {
      const { data, error } = await supabase.rpc('create_transaction_with_tags', {
        p_payload: payload,
        p_tag_ids: tagIds || [],
        p_recurring_payload: recurringPayload || null,
      });

      if (error) throw error;
      return data;
    },

    // Optimistic update - update UI immediately before server responds
    onMutate: async ({ payload }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.wallets });
      await queryClient.cancelQueries({ queryKey: ['transactions'] });

      // Snapshot previous values
      const previousWallets = queryClient.getQueryData<Wallet[]>(queryKeys.wallets);

      // Optimistically update wallet balance
      if (payload.wallet_id && previousWallets) {
        queryClient.setQueryData<Wallet[]>(queryKeys.wallets, (old) => {
          if (!old) return old;
          return old.map((wallet) => {
            if (wallet.id === payload.wallet_id) {
              const balanceChange = payload.type === 'income' ? payload.amount : -payload.amount;
              return {
                ...wallet,
                current_balance: wallet.current_balance + balanceChange,
              };
            }
            // Handle transfer destination
            if (payload.type === 'transfer' && wallet.id === payload.to_wallet_id) {
              return {
                ...wallet,
                current_balance: wallet.current_balance + payload.amount,
              };
            }
            return wallet;
          });
        });
      }

      return { previousWallets };
    },

    // If mutation fails, rollback to previous state
    onError: (err, _variables, context) => {
      if (context?.previousWallets) {
        queryClient.setQueryData(queryKeys.wallets, context.previousWallets);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to create transaction');
    },

    // After success or failure, invalidate to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },

    onSuccess: () => {
      toast.success('Transaction created');
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      payload,
      tagIds,
    }: {
      transactionId: number;
      payload: CreateTransactionPayload;
      tagIds?: number[];
    }) => {
      const { error } = await supabase.rpc('update_transaction_with_tags', {
        p_transaction_id: transactionId,
        p_payload: payload,
        p_tag_ids: tagIds || [],
      });

      if (error) throw error;
    },

    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update transaction');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },

    onSuccess: () => {
      toast.success('Transaction updated');
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: number) => {
      const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
      if (error) throw error;
    },

    // Optimistic update - remove from list immediately
    onMutate: async (transactionId) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });

      // We could also remove from the local transactions list here
      // But since we use server-side pagination, it's simpler to just invalidate

      return { transactionId };
    },

    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete transaction');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },

    onSuccess: () => {
      toast.success('Transaction deleted');
    },
  });
}

export function useDeleteTransactionsBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionIds: number[]) => {
      const { error } = await supabase.from('transactions').delete().in('id', transactionIds);
      if (error) throw error;
    },

    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete transactions');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },

    onSuccess: (_, transactionIds) => {
      toast.success(`${transactionIds.length} transactions deleted`);
    },
  });
}

// ============================================
// DEBT MUTATIONS
// ============================================

export function useCreateDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const userId = await getUserId();
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase.from('debts').insert({ ...payload, user_id: userId });
      if (error) throw error;
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.debts });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },

    onSuccess: () => {
      toast.success('Debt created');
    },

    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create debt');
    },
  });
}

export function useUpdateDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Record<string, unknown> }) => {
      const { error } = await supabase.from('debts').update(payload).eq('id', id);
      if (error) throw error;
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.debts });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },

    onSuccess: () => {
      toast.success('Debt updated');
    },

    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update debt');
    },
  });
}

// ============================================
// GOAL MUTATIONS
// ============================================

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Record<string, unknown> }) => {
      const { error } = await supabase.from('financial_goals').update(payload).eq('id', id);
      if (error) throw error;
    },

    // Optimistic update for progress changes
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals });

      const previousGoals = queryClient.getQueryData(queryKeys.goals);

      queryClient.setQueryData(queryKeys.goals, (old: Goal[] | undefined) => {
        if (!old) return old;
        return old.map((goal) =>
          goal.id === id ? { ...goal, ...payload } : goal
        );
      });

      return { previousGoals };
    },

    onError: (err, _variables, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals, context.previousGoals);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update goal');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    },

    onSuccess: () => {
      toast.success('Goal updated');
    },
  });
}

// ============================================
// BUDGET ALERT MUTATIONS
// ============================================

export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: number) => {
      const { error } = await supabase
        .from('budget_alerts')
        .update({ is_read: true })
        .eq('id', alertId);
      if (error) throw error;
    },

    // Optimistic update - remove from unread list immediately
    onMutate: async (alertId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.budgetAlerts });

      const previousAlerts = queryClient.getQueryData(queryKeys.budgetAlerts);

      queryClient.setQueryData(queryKeys.budgetAlerts, (old: BudgetAlert[] | undefined) => {
        if (!old) return old;
        return old.filter((alert) => alert.id !== alertId);
      });

      return { previousAlerts };
    },

    onError: (_err, _alertId, context) => {
      if (context?.previousAlerts) {
        queryClient.setQueryData(queryKeys.budgetAlerts, context.previousAlerts);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetAlerts });
    },
  });
}

export function useMarkAllAlertsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const userId = await getUserId();
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('budget_alerts')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (error) throw error;
    },

    // Optimistic update - clear all alerts immediately
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.budgetAlerts });

      const previousAlerts = queryClient.getQueryData(queryKeys.budgetAlerts);
      queryClient.setQueryData(queryKeys.budgetAlerts, []);

      return { previousAlerts };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousAlerts) {
        queryClient.setQueryData(queryKeys.budgetAlerts, context.previousAlerts);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetAlerts });
    },
  });
}
