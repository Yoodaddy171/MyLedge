# System Analysis

## Architecture
- **Framework**: Next.js 16.1 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4+
- **Backend/DB**: Supabase (PostgreSQL)
- **Stock API**: Yahoo Finance v3 (via `yahoo-finance2`)
- **Charts**: `recharts` (AreaChart, PieChart, RadarChart)

## Data Model
- **`transactions`**: Central ledger. Linked to `wallets` and `transaction_items`.
- **`wallets`**: Bank accounts/liquidity sources. Used to track independent balances.
- **`debts`**: Liabilities. Now integrated with the calculator and payment flow.
- **`transaction_items`**: Master catalog mapping codes to categories.
- **`categories`**: Grouping for items (Income/Expense types).

## Feature Logic
### 1. Daily Balance Calculation
The dashboard computes daily balances for the last 30 days by:
1. Calculating the total balance at `Now - 30 days`.
2. Iterating forward through each day and applying transaction deltas (+/-).
3. Storing snapshots for Recharts `AreaChart`.

### 2. Debt-Transaction Linkage
Payments made through the Debts page trigger two concurrent actions:
1. An `INSERT` into `transactions` (Expense).
2. An `UPDATE` to the `debts` table (Subtract `remaining_amount`).

### 3. Investment Sync (Yahoo Finance)
- **Stocks**: Fetched using `{SYMBOL}.JK` suffix.
- **Gold**: Fetched via `GC=F` (Gold Futures) and converted using `IDR=X` (USD/IDR rate).
- **Formula**: `(USD_Price * Exchange_Rate) / 31.1035` to get price per gram.

## Key Improvements (Jan 2026)
- **Graceful Failure**: Data fetching handles missing tables without crashing the UI.
- **Mobile First**: All overflow issues fixed; button groups wrap correctly on small screens.
- **Precision Filter**: Transactions can be sliced by specific bank or category.
