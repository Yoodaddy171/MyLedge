# Database Schema V2 - Complete Redesign

## 🎯 Philosophy

**Clean slate, best practices, production-ready**

- ✅ Fully normalized database design
- ✅ Automated business logic via triggers
- ✅ Real-time calculated views
- ✅ Comprehensive indexing for performance
- ✅ Type-safe with proper ENUMs
- ✅ Full audit trail (created_at, updated_at)
- ✅ Referential integrity enforced
- ✅ Row-Level Security (RLS) enabled

---

## 📊 Schema Overview

### Core Financial Tables (7)
1. **categories** - Income/Expense categorization
2. **transaction_items** - Master data templates
3. **wallets** - Money containers (bank, cash, cards)
4. **transactions** - ALL money movements (heart of system)
5. **budgets** - Monthly spending limits
6. **projects** - Budget tracking per initiative
7. **debts** - Liabilities & loan tracking

### Investment Tables (2)
8. **assets** - Investment portfolio holdings
9. **asset_transactions** - Buy/sell/dividend history

### Automation Tables (3)
10. **recurring_transactions** - Auto-generate templates
11. **budget_alerts** - Automated notifications
12. **financial_goals** - Savings targets

### Tagging & Organization (2)
13. **transaction_tags** - Flexible multi-tag system
14. **transaction_tag_assignments** - Junction table

### Task Management (2)
15. **tasks** - Financial & general tasks
16. **task_categories** - Task organization

---

## 🔥 Key Improvements dari Schema Lama

### 1. **Transactions - Jauh Lebih Powerful**

**Lama:**
```sql
user_id, date, item_id, wallet_id, amount, description, type
```

**Baru:**
```sql
-- Core
user_id, date, type (income/expense/transfer), amount, description, notes

-- Relationships
wallet_id          → Source wallet
to_wallet_id       → Destination (for transfers)
item_id            → Transaction template
project_id         → Link to project
debt_id            → Track debt payments

-- Metadata
is_recurring       → Auto-generated flag
receipt_url        → Photo storage
location           → GPS tracking

-- Timestamps
created_at, updated_at
```

**Manfaat:**
- ✅ Support **TRANSFER** between wallets
- ✅ Auto-update project spending
- ✅ Auto-update debt remaining
- ✅ Track receipts & location
- ✅ Link recurring transactions

---

### 2. **Wallets - Multi-Currency & Smart Balance**

**Fitur Baru:**
```sql
type                      → bank/cash/credit_card/e_wallet/investment
initial_balance           → Opening balance
current_balance           → AUTO-CALCULATED via trigger
currency                  → IDR/USD/EUR/etc
is_excluded_from_total    → Exclude credit cards from net worth
account_number            → Masked display
```

**Auto-Calculation:**
```
current_balance = initial_balance +
                  total_income -
                  total_expense +
                  transfers_in -
                  transfers_out
```

---

### 3. **Projects - Full Lifecycle Management**

**Lama:**
```sql
name, total_budget
```

**Baru:**
```sql
name, description
total_budget, spent_amount (AUTO-CALCULATED)
status (planning/in_progress/completed/on_hold/cancelled)
start_date, deadline, completion_date
priority, color
```

**Auto-Update:**
- Spent amount otomatis update saat ada transaksi baru dengan `project_id`
- Triggers handle semua calculation

---

### 4. **Automated Business Logic (Triggers)**

Tidak perlu manual update, semua otomatis:

```sql
-- ✅ Wallet balance auto-update
INSERT transaction → wallet.current_balance auto-recalculate

-- ✅ Project spending auto-update
INSERT transaction with project_id → project.spent_amount auto-update

-- ✅ Debt payment tracking
INSERT transaction with debt_id → debt.remaining_amount auto-decrease
                                → debt.is_paid auto-set to true jika lunas

-- ✅ Timestamp auto-update
UPDATE any record → updated_at auto-set to now()
```

---

### 5. **Views untuk Performance**

#### **wallet_balances_view**
Real-time balance calculation tanpa perlu query manual:
```sql
SELECT * FROM wallet_balances_view WHERE user_id = 'xxx';
```
Returns: initial_balance, income, expense, transfers, **current_balance**

#### **project_summary_view**
```sql
SELECT * FROM project_summary_view WHERE user_id = 'xxx';
```
Returns: budget, actual_spent, remaining, percentage, transaction_count

#### **budget_tracking_view**
```sql
SELECT * FROM budget_tracking_view
WHERE user_id = 'xxx' AND month = 1 AND year = 2025;
```
Returns: budget vs actual, remaining, percentage, is_exceeded

#### **net_worth_view**
```sql
SELECT * FROM net_worth_view WHERE user_id = 'xxx';
```
Returns: total_liquid_assets, total_liabilities, **net_worth**

#### **portfolio_summary_view**
```sql
SELECT * FROM portfolio_summary_view WHERE user_id = 'xxx';
```
Returns: total_invested, current_value, unrealized_gain, return_%

---

### 6. **Recurring Transactions - Full Automation**

```sql
CREATE recurring_transaction:
  - type: 'income'
  - amount: 5000
  - description: 'Monthly Salary'
  - wallet_id: checking_account
  - frequency: 'monthly'
  - start_date: '2025-01-25'
  - auto_generate: true

→ System will auto-create transaction every month on day 25
```

**Supported Frequencies:**
- daily
- weekly
- monthly (most common)
- quarterly
- yearly

---

### 7. **Financial Goals - Target Tracking**

```sql
CREATE financial_goal:
  name: 'Emergency Fund'
  target_amount: 50000000
  current_amount: 15000000 (manual update or linked to specific wallet)
  deadline: '2025-12-31'
  category: 'emergency_fund'

→ Track progress: 30% achieved
→ Alert when milestone reached
```

---

### 8. **Multi-Tag System**

Beyond single category, sekarang bisa multi-tag:

```sql
Transaction: "Beli laptop untuk kerja"
Category: Shopping (via item)
Tags: ['Business Expense', 'Tax Deductible', 'Work From Home']

→ Bisa filter by multiple dimensions
→ Better reporting & analytics
```

---

## 🚀 Performance Optimizations

### Indexes Created:
- User + Date indexes for fast transaction queries
- Wallet/Project/Debt indexes for relationships
- Composite indexes for common filters
- Partial indexes for active records only

### Cached Calculations:
- `wallets.current_balance` → Updated by trigger
- `projects.spent_amount` → Updated by trigger
- `assets.total_cost`, `current_value`, `unrealized_gain` → **GENERATED columns** (always accurate)

### Views for Complex Queries:
- Pre-joined data
- Aggregated calculations
- No need to write complex SQL in application

---

## 📐 ERD Relationships

```
users (auth.users)
  ├── categories
  │     └── transaction_items
  │           └── transactions
  ├── wallets
  │     ├── transactions (wallet_id)
  │     └── transactions (to_wallet_id for transfers)
  ├── projects
  │     └── transactions (project_id)
  ├── debts
  │     └── transactions (debt_id for payments)
  ├── budgets
  │     ├── categories
  │     └── budget_alerts
  ├── recurring_transactions
  │     └── transactions (recurring_transaction_id)
  ├── financial_goals
  ├── assets
  │     └── asset_transactions
  ├── transaction_tags
  │     └── transaction_tag_assignments
  │           └── transactions
  └── tasks
```

---

## 🔄 Migration Plan

### Step 1: Backup Current Data
```bash
# Export current transactions
npm run export-data
```

### Step 2: Run New Schema
```sql
-- Copy database_schema_v2_complete.sql to Supabase SQL Editor
-- Run it → Will DROP old tables and CREATE new ones
```

### Step 3: Re-seed Data
```bash
npm run seed
```

### Step 4: Update Application Code
- Update queries to use new field names
- Leverage new views for simpler queries
- Remove manual calculation code (triggers handle it)

---

## ✨ What Makes This Better?

### Old Way (Manual):
```typescript
// Calculate wallet balance manually
const { data: transactions } = await supabase
  .from('transactions')
  .select('*')
  .eq('wallet_id', walletId);

const income = transactions
  .filter(t => t.type === 'income')
  .reduce((sum, t) => sum + t.amount, 0);

const expense = transactions
  .filter(t => t.type === 'expense')
  .reduce((sum, t) => sum + t.amount, 0);

const balance = initialBalance + income - expense;
```

### New Way (Automatic):
```typescript
// Balance already calculated!
const { data: wallet } = await supabase
  .from('wallet_balances_view')
  .select('current_balance')
  .eq('id', walletId)
  .single();

console.log(wallet.current_balance); // Done!
```

---

## 🎓 Best Practices Implemented

1. ✅ **Normalization** - No data duplication
2. ✅ **Referential Integrity** - Foreign keys everywhere
3. ✅ **Type Safety** - ENUMs for standardized values
4. ✅ **Audit Trail** - created_at, updated_at on all tables
5. ✅ **Soft Deletes** - Use is_active flags instead of DELETE
6. ✅ **Indexes** - For all common query patterns
7. ✅ **Views** - Pre-calculated data for performance
8. ✅ **Triggers** - Business logic in database
9. ✅ **RLS** - Row-level security for multi-tenant
10. ✅ **Constraints** - Data validation at DB level

---

## 📝 Next Steps

1. **Run Migration** → Execute SQL file in Supabase
2. **Update Seed Script** → Adjust for new schema
3. **Update Application** → Use new field names
4. **Test Everything** → Ensure all features work
5. **Deploy** → Ship to production

---

## 🆘 Need Help?

Schema ini production-ready dan sudah include:
- Auto-calculations via triggers
- Optimized indexes
- Real-time views
- Full audit trail
- Type safety

Tinggal run SQL file-nya dan selesai! 🚀
