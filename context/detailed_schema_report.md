# Detailed Supabase Database Schema

**Generated:** 2026-01-23T16:36:33.794Z
**Database:** https://hriaaixvfyyscrernpod.supabase.co

## Summary Statistics

- **Total Tables:** 16
- **Total Views:** 5
- **Total Rows Across All Tables:** 492

---

## 📊 Tables (16)

### 1. categories

**Row Count:** 10

#### Columns (9)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 89, 90, 91 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| name | string | ✗ | Salary, Freelance, Investment |
| type | string | ✗ | income, income, income |
| icon | string | ✗ | Briefcase, Laptop, TrendingUp |
| color | string | ✗ | #10b981, #34d399, #6ee7b7 |
| is_system | boolean | ✗ | false, false, false |
| created_at | string | ✗ | 2026-01-18T16:49:44.50256+00:0..., 2026-01-18T16:49:44.50256+00:0..., 2026-01-18T16:49:44.50256+00:0... |
| updated_at | string | ✗ | 2026-01-18T16:49:44.50256+00:0..., 2026-01-18T16:49:44.50256+00:0..., 2026-01-18T16:49:44.50256+00:0... |

#### Sample Data (2 rows)

```json
[
  {
    "id": 89,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "Salary",
    "type": "income",
    "icon": "Briefcase",
    "color": "#10b981",
    "is_system": false,
    "created_at": "2026-01-18T16:49:44.50256+00:00",
    "updated_at": "2026-01-18T16:49:44.50256+00:00"
  },
  {
    "id": 90,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "Freelance",
    "type": "income",
    "icon": "Laptop",
    "color": "#34d399",
    "is_system": false,
    "created_at": "2026-01-18T16:49:44.50256+00:00",
    "updated_at": "2026-01-18T16:49:44.50256+00:00"
  }
]
```

---

### 2. transaction_items

**Row Count:** 10

#### Columns (9)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 126, 127, 128 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| category_id | number | ✗ | 89, 90, 92 |
| name | string | ✗ | Monthly Salary, Freelance Dev, Lunch |
| code | string | ✗ | INC001, INC002, EXP001 |
| default_amount | number | ✗ | 25000000, 8000000, 65000 |
| is_favorite | boolean | ✗ | false, false, false |
| created_at | string | ✗ | 2026-01-18T16:49:44.683238+00:..., 2026-01-18T16:49:44.683238+00:..., 2026-01-18T16:49:44.683238+00:... |
| updated_at | string | ✗ | 2026-01-18T16:49:44.683238+00:..., 2026-01-18T16:49:44.683238+00:..., 2026-01-18T16:49:44.683238+00:... |

#### Sample Data (2 rows)

```json
[
  {
    "id": 126,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "category_id": 89,
    "name": "Monthly Salary",
    "code": "INC001",
    "default_amount": 25000000,
    "is_favorite": false,
    "created_at": "2026-01-18T16:49:44.683238+00:00",
    "updated_at": "2026-01-18T16:49:44.683238+00:00"
  },
  {
    "id": 127,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "category_id": 90,
    "name": "Freelance Dev",
    "code": "INC002",
    "default_amount": 8000000,
    "is_favorite": false,
    "created_at": "2026-01-18T16:49:44.683238+00:00",
    "updated_at": "2026-01-18T16:49:44.683238+00:00"
  }
]
```

---

### 3. wallets

**Row Count:** 5

#### Columns (15)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 39, 40, 37 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| name | string | ✗ | GoPay, Credit Card, Mandiri Investment |
| type | string | ✗ | e_wallet, credit_card, bank |
| initial_balance | number | ✗ | 2000000, 0, 250000000 |
| current_balance | number | ✗ | 2000000, 0, 250000000 |
| currency | string | ✗ | IDR, IDR, IDR |
| icon | nullable | ✓ | null |
| color | nullable | ✓ | null |
| is_active | boolean | ✗ | true, true, true |
| is_excluded_from_total | boolean | ✗ | false, false, false |
| account_number | nullable | ✓ | null |
| notes | nullable | ✓ | null |
| created_at | string | ✗ | 2026-01-18T16:49:44.86259+00:0..., 2026-01-18T16:49:44.86259+00:0..., 2026-01-18T16:49:44.86259+00:0... |
| updated_at | string | ✗ | 2026-01-18T16:49:44.86259+00:0..., 2026-01-18T16:49:44.86259+00:0..., 2026-01-18T16:49:44.86259+00:0... |

#### Sample Data (2 rows)

```json
[
  {
    "id": 39,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "GoPay",
    "type": "e_wallet",
    "initial_balance": 2000000,
    "current_balance": 2000000,
    "currency": "IDR",
    "icon": null,
    "color": null,
    "is_active": true,
    "is_excluded_from_total": false,
    "account_number": null,
    "notes": null,
    "created_at": "2026-01-18T16:49:44.86259+00:00",
    "updated_at": "2026-01-18T16:49:44.86259+00:00"
  },
  {
    "id": 40,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "Credit Card",
    "type": "credit_card",
    "initial_balance": 0,
    "current_balance": 0,
    "currency": "IDR",
    "icon": null,
    "color": null,
    "is_active": true,
    "is_excluded_from_total": false,
    "account_number": null,
    "notes": null,
    "created_at": "2026-01-18T16:49:44.86259+00:00",
    "updated_at": "2026-01-18T16:49:44.86259+00:00"
  }
]
```

---

### 4. projects

**Row Count:** 2

#### Columns (14)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 23, 24 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| name | string | ✗ | Home Studio, Japan Trip 2025 |
| description | nullable | ✓ | null |
| total_budget | number | ✗ | 100000000, 60000000 |
| spent_amount | number | ✗ | 0, 0 |
| status | string | ✗ | in_progress, planning |
| start_date | nullable | ✓ | null |
| deadline | string | ✗ | 2025-08-15, 2025-11-20 |
| completion_date | nullable | ✓ | null |
| priority | number | ✗ | 0, 0 |
| color | nullable | ✓ | null |
| created_at | string | ✗ | 2026-01-18T16:49:45.022008+00:..., 2026-01-18T16:49:45.022008+00:... |
| updated_at | string | ✗ | 2026-01-18T16:49:45.022008+00:..., 2026-01-18T16:49:45.022008+00:... |

#### Sample Data (2 rows)

```json
[
  {
    "id": 23,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "Home Studio",
    "description": null,
    "total_budget": 100000000,
    "spent_amount": 0,
    "status": "in_progress",
    "start_date": null,
    "deadline": "2025-08-15",
    "completion_date": null,
    "priority": 0,
    "color": null,
    "created_at": "2026-01-18T16:49:45.022008+00:00",
    "updated_at": "2026-01-18T16:49:45.022008+00:00"
  },
  {
    "id": 24,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "Japan Trip 2025",
    "description": null,
    "total_budget": 60000000,
    "spent_amount": 0,
    "status": "planning",
    "start_date": null,
    "deadline": "2025-11-20",
    "completion_date": null,
    "priority": 0,
    "color": null,
    "created_at": "2026-01-18T16:49:45.022008+00:00",
    "updated_at": "2026-01-18T16:49:45.022008+00:00"
  }
]
```

---

### 5. debts

**Row Count:** 2

#### Columns (14)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 22, 21 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| name | string | ✗ | KPR Apartment, Car Loan |
| creditor | string | ✗ | Bank Mandiri, BCA Finance |
| total_amount | number | ✗ | 1200000000, 350000000 |
| remaining_amount | number | ✗ | 806000000, 0 |
| monthly_payment | number | ✗ | 12000000, 7500000 |
| interest_rate | number | ✗ | 0, 0 |
| start_date | nullable | ✓ | null |
| due_date | string | ✗ | 2025-01-05, 2025-01-15 |
| is_paid | boolean | ✗ | false, true |
| notes | nullable | ✓ | null |
| created_at | string | ✗ | 2026-01-18T16:49:45.177128+00:..., 2026-01-18T16:49:45.177128+00:... |
| updated_at | string | ✗ | 2026-01-18T16:49:46.427961+00:..., 2026-01-23T16:11:56.391167+00:... |

#### Sample Data (2 rows)

```json
[
  {
    "id": 22,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "KPR Apartment",
    "creditor": "Bank Mandiri",
    "total_amount": 1200000000,
    "remaining_amount": 806000000,
    "monthly_payment": 12000000,
    "interest_rate": 0,
    "start_date": null,
    "due_date": "2025-01-05",
    "is_paid": false,
    "notes": null,
    "created_at": "2026-01-18T16:49:45.177128+00:00",
    "updated_at": "2026-01-18T16:49:46.427961+00:00"
  },
  {
    "id": 21,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "Car Loan",
    "creditor": "BCA Finance",
    "total_amount": 350000000,
    "remaining_amount": 0,
    "monthly_payment": 7500000,
    "interest_rate": 0,
    "start_date": null,
    "due_date": "2025-01-15",
    "is_paid": true,
    "notes": null,
    "created_at": "2026-01-18T16:49:45.177128+00:00",
    "updated_at": "2026-01-23T16:11:56.391167+00:00"
  }
]
```

---

### 6. transactions

**Row Count:** 455

#### Columns (21)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 3434, 3435, 2982 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| type | string | ✗ | expense, expense, expense |
| amount | number | ✗ | 50000, 10000000, 5000000 |
| date | string | ✗ | 2026-01-22, 2026-01-23, 2025-01-01 |
| description | string | ✗ | Test Transaction - Coffee, Payment for Car Loan, Apartment Rent |
| notes | string | ✓ | , Debt Repayment |
| wallet_id | number | ✗ | 36, 36, 36 |
| to_wallet_id | nullable | ✓ | null |
| item_id | number | ✓ | 129, 131 |
| project_id | nullable | ✓ | null |
| debt_id | nullable | ✓ | 21 |
| is_recurring | boolean | ✗ | false, false, false |
| recurring_transaction_id | nullable | ✓ | null |
| receipt_url | nullable | ✓ | null |
| location | nullable | ✓ | null |
| created_at | string | ✗ | 2026-01-22T01:31:04.037706+00:..., 2026-01-23T16:11:25.256698+00:..., 2026-01-18T16:49:45.347634+00:... |
| updated_at | string | ✗ | 2026-01-23T16:32:46.986051+00:..., 2026-01-23T16:11:25.256698+00:..., 2026-01-18T16:49:45.347634+00:... |
| asset_id | nullable | ✓ | null |
| submission_id | nullable | ✓ | null |
| goal_id | nullable | ✓ | null |

#### Sample Data (2 rows)

```json
[
  {
    "id": 3434,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "type": "expense",
    "amount": 50000,
    "date": "2026-01-22",
    "description": "Test Transaction - Coffee",
    "notes": "",
    "wallet_id": 36,
    "to_wallet_id": null,
    "item_id": 129,
    "project_id": null,
    "debt_id": null,
    "is_recurring": false,
    "recurring_transaction_id": null,
    "receipt_url": null,
    "location": null,
    "created_at": "2026-01-22T01:31:04.037706+00:00",
    "updated_at": "2026-01-23T16:32:46.986051+00:00",
    "asset_id": null,
    "submission_id": null,
    "goal_id": null
  },
  {
    "id": 3435,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "type": "expense",
    "amount": 10000000,
    "date": "2026-01-23",
    "description": "Payment for Car Loan",
    "notes": "Debt Repayment",
    "wallet_id": 36,
    "to_wallet_id": null,
    "item_id": null,
    "project_id": null,
    "debt_id": 21,
    "is_recurring": false,
    "recurring_transaction_id": null,
    "receipt_url": null,
    "location": null,
    "created_at": "2026-01-23T16:11:25.256698+00:00",
    "updated_at": "2026-01-23T16:11:25.256698+00:00",
    "asset_id": null,
    "submission_id": null,
    "goal_id": null
  }
]
```

---

### 7. transaction_tags

**Row Count:** 0

*No data available in this table*

---

### 8. transaction_tag_assignments

**Row Count:** 0

*No data available in this table*

---

### 9. budgets

**Row Count:** 1

#### Columns (10)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 13 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| category_id | number | ✗ | 92 |
| amount | number | ✗ | 1000000 |
| spent_amount | number | ✗ | 0 |
| month | number | ✗ | 1 |
| year | number | ✗ | 2026 |
| notes | nullable | ✓ | null |
| created_at | string | ✗ | 2026-01-18T17:05:32.37915+00:0... |
| updated_at | string | ✗ | 2026-01-18T17:05:32.37915+00:0... |

#### Sample Data (1 rows)

```json
[
  {
    "id": 13,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "category_id": 92,
    "amount": 1000000,
    "spent_amount": 0,
    "month": 1,
    "year": 2026,
    "notes": null,
    "created_at": "2026-01-18T17:05:32.37915+00:00",
    "updated_at": "2026-01-18T17:05:32.37915+00:00"
  }
]
```

---

### 10. budget_alerts

**Row Count:** 0

*No data available in this table*

---

### 11. recurring_transactions

**Row Count:** 0

*No data available in this table*

---

### 12. financial_goals

**Row Count:** 0

*No data available in this table*

---

### 13. assets

**Row Count:** 2

#### Columns (17)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 17, 18 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| type | string | ✗ | stock, crypto |
| symbol | string | ✗ | BBCA.JK, BTC |
| name | string | ✗ | Bank Central Asia, Bitcoin |
| quantity | number | ✗ | 5000, 0.05 |
| avg_buy_price | number | ✗ | 9200, 950000000 |
| current_price | number | ✗ | 10120, 1045000000.0000001 |
| purchase_date | nullable | ✓ | null |
| notes | nullable | ✓ | null |
| portfolio_name | nullable | ✓ | null |
| total_cost | number | ✗ | 46000000, 47500000 |
| current_value | number | ✗ | 50600000, 52250000.00000001 |
| unrealized_gain | number | ✗ | 4600000, 4750000.000000005 |
| last_price_update | string | ✗ | 2026-01-18T16:49:19.69+00:00, 2026-01-18T16:49:19.69+00:00 |
| created_at | string | ✗ | 2026-01-18T16:49:46.816996+00:..., 2026-01-18T16:49:46.816996+00:... |
| updated_at | string | ✗ | 2026-01-18T16:49:46.816996+00:..., 2026-01-18T16:49:46.816996+00:... |

#### Sample Data (2 rows)

```json
[
  {
    "id": 17,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "type": "stock",
    "symbol": "BBCA.JK",
    "name": "Bank Central Asia",
    "quantity": 5000,
    "avg_buy_price": 9200,
    "current_price": 10120,
    "purchase_date": null,
    "notes": null,
    "portfolio_name": null,
    "total_cost": 46000000,
    "current_value": 50600000,
    "unrealized_gain": 4600000,
    "last_price_update": "2026-01-18T16:49:19.69+00:00",
    "created_at": "2026-01-18T16:49:46.816996+00:00",
    "updated_at": "2026-01-18T16:49:46.816996+00:00"
  },
  {
    "id": 18,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "type": "crypto",
    "symbol": "BTC",
    "name": "Bitcoin",
    "quantity": 0.05,
    "avg_buy_price": 950000000,
    "current_price": 1045000000.0000001,
    "purchase_date": null,
    "notes": null,
    "portfolio_name": null,
    "total_cost": 47500000,
    "current_value": 52250000.00000001,
    "unrealized_gain": 4750000.000000005,
    "last_price_update": "2026-01-18T16:49:19.69+00:00",
    "created_at": "2026-01-18T16:49:46.816996+00:00",
    "updated_at": "2026-01-18T16:49:46.816996+00:00"
  }
]
```

---

### 14. asset_transactions

**Row Count:** 0

*No data available in this table*

---

### 15. task_categories

**Row Count:** 2

#### Columns (6)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 14, 15 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| name | string | ✗ | hobby, ijin |
| icon | nullable | ✓ | null |
| color | nullable | ✓ | null |
| created_at | string | ✗ | 2026-01-18T17:47:15.130089+00:..., 2026-01-18T17:47:23.261666+00:... |

#### Sample Data (2 rows)

```json
[
  {
    "id": 14,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "hobby",
    "icon": null,
    "color": null,
    "created_at": "2026-01-18T17:47:15.130089+00:00"
  },
  {
    "id": 15,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "ijin",
    "icon": null,
    "color": null,
    "created_at": "2026-01-18T17:47:23.261666+00:00"
  }
]
```

---

### 16. tasks

**Row Count:** 3

#### Columns (13)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 29, 30, 31 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| title | string | ✗ | Japanese Visa Application, Renew Car Insurance, 666 |
| priority | string | ✗ | urgent, high, medium |
| status | string | ✗ | todo, done, todo |
| deadline | string | ✗ | 2025-10-01, 2025-06-15, 2026-01-20 |
| notes | nullable | ✓ | null |
| completed_at | nullable | ✓ | null |
| created_at | string | ✗ | 2026-01-18T16:49:47.029206+00:..., 2026-01-18T16:49:47.029206+00:..., 2026-01-18T17:47:41.762129+00:... |
| updated_at | string | ✗ | 2026-01-18T16:49:47.029206+00:..., 2026-01-18T16:49:47.029206+00:..., 2026-01-18T17:47:41.762129+00:... |
| category_id | nullable | ✓ | 14 |
| project_id | nullable | ✓ | null |
| submission_id | nullable | ✓ | null |

#### Sample Data (2 rows)

```json
[
  {
    "id": 29,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "title": "Japanese Visa Application",
    "priority": "urgent",
    "status": "todo",
    "deadline": "2025-10-01",
    "notes": null,
    "completed_at": null,
    "created_at": "2026-01-18T16:49:47.029206+00:00",
    "updated_at": "2026-01-18T16:49:47.029206+00:00",
    "category_id": null,
    "project_id": null,
    "submission_id": null
  },
  {
    "id": 30,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "title": "Renew Car Insurance",
    "priority": "high",
    "status": "done",
    "deadline": "2025-06-15",
    "notes": null,
    "completed_at": null,
    "created_at": "2026-01-18T16:49:47.029206+00:00",
    "updated_at": "2026-01-18T16:49:47.029206+00:00",
    "category_id": null,
    "project_id": null,
    "submission_id": null
  }
]
```

---

## 🔭 Views (5)

### 1. wallet_balances_view

#### Columns (13)

| Column Name | Type |
|-------------|------|
| id | number |
| user_id | string |
| name | string |
| type | string |
| initial_balance | number |
| currency | string |
| is_active | boolean |
| is_excluded_from_total | boolean |
| total_income | number |
| total_expense | number |
| total_transfer_in | number |
| total_transfer_out | number |
| current_balance | number |

#### Sample Data

```json
[
  {
    "id": 36,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "BCA Priority",
    "type": "bank",
    "initial_balance": 150000000,
    "currency": "IDR",
    "is_active": true,
    "is_excluded_from_total": false,
    "total_income": 348000000,
    "total_expense": 414050000,
    "total_transfer_in": 0,
    "total_transfer_out": 70000000,
    "current_balance": 13950000
  }
]
```

---

### 2. project_summary_view

#### Columns (12)

| Column Name | Type |
|-------------|------|
| id | number |
| user_id | string |
| name | string |
| description | object |
| total_budget | number |
| status | string |
| deadline | string |
| actual_spent | number |
| remaining_budget | number |
| budget_percentage_used | number |
| transaction_count | number |
| last_transaction_date | object |

#### Sample Data

```json
[
  {
    "id": 23,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "Home Studio",
    "description": null,
    "total_budget": 100000000,
    "status": "in_progress",
    "deadline": "2025-08-15",
    "actual_spent": 0,
    "remaining_budget": 100000000,
    "budget_percentage_used": 0,
    "transaction_count": 0,
    "last_transaction_date": null
  }
]
```

---

### 3. budget_tracking_view

#### Columns (12)

| Column Name | Type |
|-------------|------|
| id | number |
| user_id | string |
| category_id | number |
| category_name | string |
| category_icon | string |
| category_color | string |
| budget_amount | number |
| month | number |
| year | number |
| spent_amount | number |
| percentage_used | number |
| is_exceeded | boolean |

#### Sample Data

```json
[
  {
    "id": 13,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "category_id": 92,
    "category_name": "Food & Dining",
    "category_icon": "Utensils",
    "category_color": "#ef4444",
    "budget_amount": 1000000,
    "month": 1,
    "year": 2026,
    "spent_amount": 50000,
    "percentage_used": 5,
    "is_exceeded": false
  }
]
```

---

### 4. net_worth_view

#### Columns (4)

| Column Name | Type |
|-------------|------|
| user_id | string |
| total_liquid_assets | number |
| total_liabilities | number |
| net_worth | number |

#### Sample Data

```json
[
  {
    "user_id": "28824703-3eac-48b2-9483-d6e144b87929",
    "total_liquid_assets": 0,
    "total_liabilities": 0,
    "net_worth": 0
  }
]
```

---

### 5. portfolio_summary_view

#### Columns (8)

| Column Name | Type |
|-------------|------|
| user_id | string |
| portfolio_name | object |
| type | string |
| asset_count | number |
| total_invested | number |
| current_value | number |
| total_unrealized_gain | number |
| return_percentage | number |

#### Sample Data

```json
[
  {
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "portfolio_name": null,
    "type": "crypto",
    "asset_count": 1,
    "total_invested": 47500000,
    "current_value": 52250000.00000001,
    "total_unrealized_gain": 4750000.000000005,
    "return_percentage": 10
  }
]
```

---

## 🔗 Common Relationships

Based on column naming patterns, likely foreign key relationships:

**transaction_items:**
  - `category_id` → likely references `categorys`

**transactions:**
  - `wallet_id` → likely references `wallets`
  - `to_wallet_id` → likely references `to_wallets`
  - `item_id` → likely references `items`
  - `project_id` → likely references `projects`
  - `debt_id` → likely references `debts`
  - `recurring_transaction_id` → likely references `recurring_transactions`
  - `asset_id` → likely references `assets`
  - `submission_id` → likely references `submissions`
  - `goal_id` → likely references `goals`

**budgets:**
  - `category_id` → likely references `categorys`

**tasks:**
  - `category_id` → likely references `categorys`
  - `project_id` → likely references `projects`
  - `submission_id` → likely references `submissions`


---

## 📈 Data Distribution

| Table | Row Count | % of Total |
|-------|-----------|------------|
| transactions | 455 | 92.5% |
| categories | 10 | 2.0% |
| transaction_items | 10 | 2.0% |
| wallets | 5 | 1.0% |
| tasks | 3 | 0.6% |
| projects | 2 | 0.4% |
| debts | 2 | 0.4% |
| assets | 2 | 0.4% |
| task_categories | 2 | 0.4% |
| budgets | 1 | 0.2% |
| transaction_tags | 0 | 0.0% |
| transaction_tag_assignments | 0 | 0.0% |
| budget_alerts | 0 | 0.0% |
| recurring_transactions | 0 | 0.0% |
| financial_goals | 0 | 0.0% |
| asset_transactions | 0 | 0.0% |

