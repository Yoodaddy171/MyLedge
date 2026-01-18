# Live Supabase Database Schema
Generated: 2026-01-18T09:25:39.105Z
Database: https://hriaaixvfyyscrernpod.supabase.co

## Summary
- Tables: 16
- Views: 5

## Tables

### categories

| Column | Type | Sample Value |
|--------|------|-------------|
| id | number | 31 |
| user_id | string | "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda" |
| name | string | "Salary" |
| type | string | "income" |
| icon | string | "Briefcase" |
| color | string | "#10b981" |
| is_system | boolean | false |
| created_at | string | "2026-01-18T05:11:32.659964+00:00" |
| updated_at | string | "2026-01-18T05:11:32.659964+00:00" |

### transaction_items

| Column | Type | Sample Value |
|--------|------|-------------|
| id | number | 68 |
| user_id | string | "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda" |
| category_id | number | 31 |
| name | string | "Monthly Salary" |
| code | string | "INC001" |
| default_amount | number | 15000000 |
| is_favorite | boolean | false |
| created_at | string | "2026-01-18T05:11:32.812985+00:00" |
| updated_at | string | "2026-01-18T05:11:32.812985+00:00" |

### wallets

| Column | Type | Sample Value |
|--------|------|-------------|
| id | number | 12 |
| user_id | string | "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda" |
| name | string | "Mandiri Savings" |
| type | string | "bank" |
| initial_balance | number | 100000000 |
| current_balance | number | 0 |
| currency | string | "IDR" |
| icon | object | null |
| color | object | null |
| is_active | boolean | true |
| is_excluded_from_total | boolean | false |
| account_number | object | null |
| notes | object | null |
| created_at | string | "2026-01-18T05:11:32.98027+00:00" |
| updated_at | string | "2026-01-18T05:11:32.98027+00:00" |

### projects

| Column | Type | Sample Value |
|--------|------|-------------|
| id | number | 8 |
| user_id | string | "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda" |
| name | string | "Home Renovation" |
| description | string | "Kitchen and living room" |
| total_budget | number | 50000000 |
| spent_amount | number | 20359859.761051618 |
| status | string | "in_progress" |
| start_date | object | null |
| deadline | string | "2026-06-30" |
| completion_date | object | null |
| priority | number | 0 |
| color | object | null |
| created_at | string | "2026-01-18T05:11:33.135316+00:00" |
| updated_at | string | "2026-01-18T05:11:34.184796+00:00" |

### debts

| Column | Type | Sample Value |
|--------|------|-------------|
| id | number | 8 |
| user_id | string | "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda" |
| name | string | "KPR House" |
| creditor | string | "BTN" |
| total_amount | number | 850000000 |
| remaining_amount | number | 750000000 |
| monthly_payment | number | 5500000 |
| interest_rate | number | 0 |
| start_date | object | null |
| due_date | string | "2026-02-10" |
| is_paid | boolean | false |
| notes | object | null |
| created_at | string | "2026-01-18T05:11:33.314972+00:00" |
| updated_at | string | "2026-01-18T05:11:33.314972+00:00" |

### transactions

| Column | Type | Sample Value |
|--------|------|-------------|
| id | number | 904 |
| user_id | string | "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda" |
| type | string | "expense" |
| amount | number | 1089221.2036915147 |
| date | string | "2026-01-01" |
| description | string | "Material for Bali Trip" |
| notes | string | "Project expense" |
| wallet_id | number | 11 |
| to_wallet_id | object | null |
| item_id | object | null |
| project_id | number | 9 |
| debt_id | object | null |
| is_recurring | boolean | false |
| recurring_transaction_id | object | null |
| receipt_url | object | null |
| location | object | null |
| created_at | string | "2026-01-18T05:11:33.52901+00:00" |
| updated_at | string | "2026-01-18T05:11:33.52901+00:00" |

### transaction_tags

*No sample data available*

### transaction_tag_assignments

*No sample data available*

### budgets

*No sample data available*

### budget_alerts

*No sample data available*

### recurring_transactions

| Column | Type | Sample Value |
|--------|------|-------------|
| id | number | 1 |
| user_id | string | "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda" |
| type | string | "income" |
| amount | number | 15000000 |
| description | string | "Monthly Salary" |
| notes | object | null |
| wallet_id | number | 11 |
| to_wallet_id | object | null |
| item_id | object | null |
| project_id | object | null |
| frequency | string | "monthly" |
| start_date | string | "2026-01-25" |
| end_date | object | null |
| next_occurrence | string | "2026-02-25" |
| last_generated_date | object | null |
| is_active | boolean | true |
| auto_generate | boolean | true |
| created_at | string | "2026-01-18T05:11:34.794181+00:00" |
| updated_at | string | "2026-01-18T05:11:34.794181+00:00" |

### financial_goals

*No sample data available*

### assets

| Column | Type | Sample Value |
|--------|------|-------------|
| id | number | 8 |
| user_id | string | "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda" |
| type | string | "stock" |
| symbol | string | "BBCA.JK" |
| name | string | "Bank Central Asia" |
| quantity | number | 5000 |
| avg_buy_price | number | 9200 |
| current_price | number | 10120 |
| purchase_date | object | null |
| notes | object | null |
| portfolio_name | object | null |
| total_cost | number | 46000000 |
| current_value | number | 50600000 |
| unrealized_gain | number | 4600000 |
| last_price_update | object | null |
| created_at | string | "2026-01-18T05:11:34.404811+00:00" |
| updated_at | string | "2026-01-18T05:11:34.404811+00:00" |

### asset_transactions

*No sample data available*

### task_categories

| Column | Type | Sample Value |
|--------|------|-------------|
| id | number | 5 |
| user_id | string | "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda" |
| name | string | "Kegiatan Pribadi" |
| icon | object | null |
| color | object | null |
| created_at | string | "2026-01-18T05:12:21.34825+00:00" |

### tasks

| Column | Type | Sample Value |
|--------|------|-------------|
| id | number | 14 |
| user_id | string | "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda" |
| title | string | "Review Portfolio" |
| priority | string | "medium" |
| status | string | "done" |
| deadline | string | "2026-02-15" |
| notes | object | null |
| completed_at | object | null |
| created_at | string | "2026-01-18T05:11:34.575831+00:00" |
| updated_at | string | "2026-01-18T05:11:34.575831+00:00" |
| category_id | object | null |

## Views

- wallet_balances_view
- project_summary_view
- budget_tracking_view
- net_worth_view
- portfolio_summary_view

