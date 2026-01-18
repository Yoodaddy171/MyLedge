-- ============================================================================
-- ADD MISSING DATABASE INDEXES
-- Purpose: Improve query performance for frequently accessed columns
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Note: Check if indexes already exist before running
-- You can check with: SELECT * FROM pg_indexes WHERE tablename = 'table_name';

-- 1. TRANSACTIONS TABLE
-- Add standalone user_id index (currently only has compound indexes)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id
ON public.transactions(user_id);

-- Add index for common date range queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_range
ON public.transactions(user_id, date DESC);

-- 2. RECURRING_TRANSACTIONS TABLE
-- Add user_id index for filtering by user
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id
ON public.recurring_transactions(user_id);

-- Add index for active recurring transactions
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_active
ON public.recurring_transactions(user_id, is_active)
WHERE is_active = true;

-- 3. FINANCIAL_GOALS TABLE
-- Add user_id index
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id
ON public.financial_goals(user_id);

-- Add index for active (non-achieved) goals
CREATE INDEX IF NOT EXISTS idx_financial_goals_active
ON public.financial_goals(user_id, is_achieved, deadline)
WHERE is_achieved = false;

-- 4. TASK_CATEGORIES TABLE
-- Add user_id index
CREATE INDEX IF NOT EXISTS idx_task_categories_user_id
ON public.task_categories(user_id);

-- 5. ASSETS TABLE
-- Improve portfolio queries
CREATE INDEX IF NOT EXISTS idx_assets_user_portfolio
ON public.assets(user_id, portfolio_name);

-- 6. WALLETS TABLE
-- Add index for active wallets query
CREATE INDEX IF NOT EXISTS idx_wallets_user_active
ON public.wallets(user_id, is_active)
WHERE is_active = true;

-- 7. DEBTS TABLE
-- Add index for unpaid debts
CREATE INDEX IF NOT EXISTS idx_debts_user_unpaid
ON public.debts(user_id, is_paid, due_date)
WHERE is_paid = false;

-- 8. PROJECTS TABLE
-- Add index for active projects
CREATE INDEX IF NOT EXISTS idx_projects_user_active
ON public.projects(user_id, status)
WHERE status IN ('planning', 'in_progress');

-- 9. BUDGETS TABLE
-- Add index for monthly budget queries
CREATE INDEX IF NOT EXISTS idx_budgets_user_period
ON public.budgets(user_id, year DESC, month DESC);

-- 10. CATEGORIES TABLE
-- Add index for user categories by type
CREATE INDEX IF NOT EXISTS idx_categories_user_type
ON public.categories(user_id, type);

-- ============================================================================
-- ANALYZE TABLES AFTER INDEX CREATION
-- This updates PostgreSQL statistics for better query planning
-- ============================================================================
ANALYZE public.transactions;
ANALYZE public.recurring_transactions;
ANALYZE public.financial_goals;
ANALYZE public.task_categories;
ANALYZE public.assets;
ANALYZE public.wallets;
ANALYZE public.debts;
ANALYZE public.projects;
ANALYZE public.budgets;
ANALYZE public.categories;

-- ============================================================================
-- VERIFICATION QUERY
-- Run this to verify indexes were created successfully
-- ============================================================================
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;
