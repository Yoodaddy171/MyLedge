import { supabase } from '@/lib/supabase';

interface Budget {
  id: any;
  user_id: any;
  category_id?: any;
  amount: number;
  period: string;
  alert_thresholds?: number[]; // e.g., [80, 100]
}

/**
 * Check budgets and create alerts when thresholds are exceeded
 */
export async function checkBudgetsAndCreateAlerts(userId: string) {
  try {
    // Fetch all active budgets for the user
    const { data: budgets, error: budgetsError } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId);

    if (budgetsError) throw budgetsError;
    if (!budgets || budgets.length === 0) return { checked: 0, created: 0 };

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    let alertsCreated = 0;

    for (const budget of budgets) {
      // Default thresholds: 80% and 100%
      const thresholds = budget.alert_thresholds || [80, 100];

      // Calculate spent amount for this budget period
      let spentAmount = 0;

      if (budget.period === 'monthly') {
        // Get transactions for current month
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', userId)
          .eq('type', 'expense');

        if (budget.category_id) {
          // Category-specific budget
          const { data: categoryTransactions } = await supabase
            .from('transactions')
            .select('amount, item_id, transaction_items!inner(category_id)')
            .eq('user_id', userId)
            .eq('type', 'expense')
            .gte('date', `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)
            .lt('date', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`);

          spentAmount = (categoryTransactions || [])
            .filter((t: any) => t.transaction_items?.category_id === budget.category_id)
            .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        } else {
          // Overall budget
          const { data: allTransactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', userId)
            .eq('type', 'expense')
            .gte('date', `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)
            .lt('date', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`);

          spentAmount = (allTransactions || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        }
      }

      const percentageUsed = (spentAmount / budget.amount) * 100;

      // Check each threshold
      for (const threshold of thresholds) {
        if (percentageUsed >= threshold) {
          // Check if alert already exists for this threshold
          const { data: existingAlert } = await supabase
            .from('budget_alerts')
            .select('id')
            .eq('budget_id', budget.id)
            .eq('threshold_percent', threshold)
            .gte('created_at', `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)
            .single();

          if (!existingAlert) {
            // Create new alert
            const message = threshold >= 100
              ? `Budget exceeded! You've spent ${percentageUsed.toFixed(1)}% of your budget.`
              : `Budget alert: You've used ${percentageUsed.toFixed(1)}% of your budget.`;

            const { error: alertError } = await supabase
              .from('budget_alerts')
              .insert({
                user_id: userId,
                budget_id: budget.id,
                threshold_percent: threshold,
                triggered_at: new Date().toISOString(),
                is_read: false,
                message,
              });

            if (!alertError) {
              alertsCreated++;
            }
          }
        }
      }
    }

    return {
      checked: budgets.length,
      created: alertsCreated,
    };
  } catch (error) {
    console.error('Error checking budgets:', error);
    throw error;
  }
}

/**
 * Mark a budget alert as read
 */
export async function markAlertAsRead(alertId: any) {
  const { error } = await supabase
    .from('budget_alerts')
    .update({ is_read: true })
    .eq('id', alertId);

  if (error) throw error;
  return true;
}

/**
 * Mark all budget alerts as read for a user
 */
export async function markAllAlertsAsRead(userId: string) {
  const { error } = await supabase
    .from('budget_alerts')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return true;
}

/**
 * Delete a budget alert
 */
export async function deleteAlert(alertId: any) {
  const { error } = await supabase
    .from('budget_alerts')
    .delete()
    .eq('id', alertId);

  if (error) throw error;
  return true;
}
