'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data dianggap fresh selama 5 menit
            staleTime: 5 * 60 * 1000,
            // Cache data selama 30 menit
            gcTime: 30 * 60 * 1000,
            // Retry 1x jika gagal
            retry: 1,
            // Refetch saat window focus (untuk data yang selalu fresh)
            refetchOnWindowFocus: false,
            // Refetch saat reconnect
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Query keys untuk konsistensi
export const queryKeys = {
  // Master data - jarang berubah
  wallets: ['wallets'] as const,
  categories: ['categories'] as const,
  masterItems: ['masterItems'] as const,
  projects: ['projects'] as const,
  tags: ['tags'] as const,

  // Dynamic data - sering berubah
  transactions: (filters?: Record<string, unknown>) => ['transactions', filters] as const,
  recentTransactions: (limit: number) => ['transactions', 'recent', limit] as const,

  // Dashboard
  dashboardStats: ['dashboard', 'stats'] as const,
  dashboardChart: (viewMode: string, month: number, year: number) =>
    ['dashboard', 'chart', viewMode, month, year] as const,
  netWorth: ['dashboard', 'netWorth'] as const,

  // Other entities
  debts: ['debts'] as const,
  goals: ['goals'] as const,
  assets: ['assets'] as const,
  budgets: ['budgets'] as const,
  budgetAlerts: ['budgetAlerts'] as const,
  recurringTransactions: ['recurringTransactions'] as const,
  submissions: ['submissions'] as const,
  tasks: ['tasks'] as const,

  // User
  user: ['user'] as const,
} as const;
