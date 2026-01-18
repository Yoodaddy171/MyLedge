# Detailed Supabase Database Schema

**Generated:** 2026-01-18T09:28:32.173Z
**Database:** https://hriaaixvfyyscrernpod.supabase.co

## Summary Statistics

- **Total Tables:** 16
- **Total Views:** 5
- **Total Rows Across All Tables:** 407

---

## 📊 Tables (16)

### 1. categories

**Row Count:** 12

#### Columns (9)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 31, 32, 33 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| name | string | ✗ | Salary, Freelance, Investment Return |
| type | string | ✗ | income, income, income |
| icon | string | ✗ | Briefcase, Laptop, TrendingUp |
| color | string | ✗ | #10b981, #34d399, #6ee7b7 |
| is_system | boolean | ✗ | false, false, false |
| created_at | string | ✗ | 2026-01-18T05:11:32.659964+00:..., 2026-01-18T05:11:32.659964+00:..., 2026-01-18T05:11:32.659964+00:... |
| updated_at | string | ✗ | 2026-01-18T05:11:32.659964+00:..., 2026-01-18T05:11:32.659964+00:..., 2026-01-18T05:11:32.659964+00:... |

#### Sample Data (2 rows)

```json
[
  {
    "id": 31,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "Salary",
    "type": "income",
    "icon": "Briefcase",
    "color": "#10b981",
    "is_system": false,
    "created_at": "2026-01-18T05:11:32.659964+00:00",
    "updated_at": "2026-01-18T05:11:32.659964+00:00"
  },
  {
    "id": 32,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "Freelance",
    "type": "income",
    "icon": "Laptop",
    "color": "#34d399",
    "is_system": false,
    "created_at": "2026-01-18T05:11:32.659964+00:00",
    "updated_at": "2026-01-18T05:11:32.659964+00:00"
  }
]
```

---

### 2. transaction_items

**Row Count:** 12

#### Columns (9)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 68, 69, 70 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| category_id | number | ✗ | 31, 32, 35 |
| name | string | ✗ | Monthly Salary, Freelance Project, Lunch |
| code | string | ✗ | INC001, INC002, EXP001 |
| default_amount | number | ✗ | 15000000, 5000000, 50000 |
| is_favorite | boolean | ✗ | false, false, false |
| created_at | string | ✗ | 2026-01-18T05:11:32.812985+00:..., 2026-01-18T05:11:32.812985+00:..., 2026-01-18T05:11:32.812985+00:... |
| updated_at | string | ✗ | 2026-01-18T05:11:32.812985+00:..., 2026-01-18T05:11:32.812985+00:..., 2026-01-18T05:11:32.812985+00:... |

#### Sample Data (2 rows)

```json
[
  {
    "id": 68,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "category_id": 31,
    "name": "Monthly Salary",
    "code": "INC001",
    "default_amount": 15000000,
    "is_favorite": false,
    "created_at": "2026-01-18T05:11:32.812985+00:00",
    "updated_at": "2026-01-18T05:11:32.812985+00:00"
  },
  {
    "id": 69,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "category_id": 32,
    "name": "Freelance Project",
    "code": "INC002",
    "default_amount": 5000000,
    "is_favorite": false,
    "created_at": "2026-01-18T05:11:32.812985+00:00",
    "updated_at": "2026-01-18T05:11:32.812985+00:00"
  }
]
```

---

### 3. wallets

**Row Count:** 5

#### Columns (15)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 12, 14, 15 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| name | string | ✗ | Mandiri Savings, GoPay, Credit Card |
| type | string | ✗ | bank, e_wallet, credit_card |
| initial_balance | number | ✗ | 100000000, 500000, 0 |
| current_balance | number | ✗ | 0, 0, 0 |
| currency | string | ✗ | IDR, IDR, IDR |
| icon | nullable | ✓ | null |
| color | nullable | ✓ | null |
| is_active | boolean | ✗ | true, true, true |
| is_excluded_from_total | boolean | ✗ | false, false, false |
| account_number | nullable | ✓ | null |
| notes | nullable | ✓ | null |
| created_at | string | ✗ | 2026-01-18T05:11:32.98027+00:0..., 2026-01-18T05:11:32.98027+00:0..., 2026-01-18T05:11:32.98027+00:0... |
| updated_at | string | ✗ | 2026-01-18T05:11:32.98027+00:0..., 2026-01-18T05:11:32.98027+00:0..., 2026-01-18T05:11:32.98027+00:0... |

#### Sample Data (2 rows)

```json
[
  {
    "id": 12,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "Mandiri Savings",
    "type": "bank",
    "initial_balance": 100000000,
    "current_balance": 0,
    "currency": "IDR",
    "icon": null,
    "color": null,
    "is_active": true,
    "is_excluded_from_total": false,
    "account_number": null,
    "notes": null,
    "created_at": "2026-01-18T05:11:32.98027+00:00",
    "updated_at": "2026-01-18T05:11:32.98027+00:00"
  },
  {
    "id": 14,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "GoPay",
    "type": "e_wallet",
    "initial_balance": 500000,
    "current_balance": 0,
    "currency": "IDR",
    "icon": null,
    "color": null,
    "is_active": true,
    "is_excluded_from_total": false,
    "account_number": null,
    "notes": null,
    "created_at": "2026-01-18T05:11:32.98027+00:00",
    "updated_at": "2026-01-18T05:11:32.98027+00:00"
  }
]
```

---

### 4. projects

**Row Count:** 3

#### Columns (14)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 8, 10, 9 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| name | string | ✗ | Home Renovation, New PC Build, Bali Trip |
| description | string | ✗ | Kitchen and living room, Workstation upgrade, End of year vacation |
| total_budget | number | ✗ | 50000000, 25000000, 15000000 |
| spent_amount | number | ✗ | 20359859.761051618, 14146769.891259, 21365073.772517543 |
| status | string | ✗ | in_progress, completed, planning |
| start_date | nullable | ✓ | null |
| deadline | string | ✗ | 2026-06-30, 2026-02-28, 2026-12-20 |
| completion_date | nullable | ✓ | null |
| priority | number | ✗ | 0, 0, 0 |
| color | nullable | ✓ | null |
| created_at | string | ✗ | 2026-01-18T05:11:33.135316+00:..., 2026-01-18T05:11:33.135316+00:..., 2026-01-18T05:11:33.135316+00:... |
| updated_at | string | ✗ | 2026-01-18T05:11:34.184796+00:..., 2026-01-18T05:11:34.184796+00:..., 2026-01-18T05:11:34.184796+00:... |

#### Sample Data (2 rows)

```json
[
  {
    "id": 8,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "Home Renovation",
    "description": "Kitchen and living room",
    "total_budget": 50000000,
    "spent_amount": 20359859.761051618,
    "status": "in_progress",
    "start_date": null,
    "deadline": "2026-06-30",
    "completion_date": null,
    "priority": 0,
    "color": null,
    "created_at": "2026-01-18T05:11:33.135316+00:00",
    "updated_at": "2026-01-18T05:11:34.184796+00:00"
  },
  {
    "id": 10,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "New PC Build",
    "description": "Workstation upgrade",
    "total_budget": 25000000,
    "spent_amount": 14146769.891259,
    "status": "completed",
    "start_date": null,
    "deadline": "2026-02-28",
    "completion_date": null,
    "priority": 0,
    "color": null,
    "created_at": "2026-01-18T05:11:33.135316+00:00",
    "updated_at": "2026-01-18T05:11:34.184796+00:00"
  }
]
```

---

### 5. debts

**Row Count:** 3

#### Columns (14)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 8, 9, 7 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| name | string | ✗ | KPR House, Personal Loan, Car Loan |
| creditor | string | ✗ | BTN, Friend, BCA Finance |
| total_amount | number | ✗ | 850000000, 5000000, 150000000 |
| remaining_amount | number | ✗ | 750000000, 2000000, 43000000 |
| monthly_payment | number | ✗ | 5500000, 1000000, 3500000 |
| interest_rate | number | ✗ | 0, 0, 0 |
| start_date | nullable | ✓ | null |
| due_date | string | ✗ | 2026-02-10, 2026-01-30, 2026-02-25 |
| is_paid | boolean | ✗ | false, false, false |
| notes | nullable | ✓ | null |
| created_at | string | ✗ | 2026-01-18T05:11:33.314972+00:..., 2026-01-18T05:11:33.314972+00:..., 2026-01-18T05:11:33.314972+00:... |
| updated_at | string | ✗ | 2026-01-18T05:11:33.314972+00:..., 2026-01-18T05:11:33.314972+00:..., 2026-01-18T05:11:34.184796+00:... |

#### Sample Data (2 rows)

```json
[
  {
    "id": 8,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "KPR House",
    "creditor": "BTN",
    "total_amount": 850000000,
    "remaining_amount": 750000000,
    "monthly_payment": 5500000,
    "interest_rate": 0,
    "start_date": null,
    "due_date": "2026-02-10",
    "is_paid": false,
    "notes": null,
    "created_at": "2026-01-18T05:11:33.314972+00:00",
    "updated_at": "2026-01-18T05:11:33.314972+00:00"
  },
  {
    "id": 9,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "Personal Loan",
    "creditor": "Friend",
    "total_amount": 5000000,
    "remaining_amount": 2000000,
    "monthly_payment": 1000000,
    "interest_rate": 0,
    "start_date": null,
    "due_date": "2026-01-30",
    "is_paid": false,
    "notes": null,
    "created_at": "2026-01-18T05:11:33.314972+00:00",
    "updated_at": "2026-01-18T05:11:33.314972+00:00"
  }
]
```

---

### 6. transactions

**Row Count:** 362

#### Columns (18)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 904, 905, 906 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| type | string | ✗ | expense, expense, expense |
| amount | number | ✗ | 1089221.2036915147, 69718.92165693585, 760102.7195311479 |
| date | string | ✗ | 2026-01-01, 2026-01-02, 2026-01-02 |
| description | string | ✗ | Material for Bali Trip, Lunch, Material for Home Renovation |
| notes | string | ✓ | Project expense, Project expense |
| wallet_id | number | ✗ | 11, 13, 11 |
| to_wallet_id | nullable | ✓ | null |
| item_id | nullable | ✓ | 70 |
| project_id | number | ✓ | 9, 8 |
| debt_id | nullable | ✓ | null |
| is_recurring | boolean | ✗ | false, false, false |
| recurring_transaction_id | nullable | ✓ | null |
| receipt_url | nullable | ✓ | null |
| location | nullable | ✓ | null |
| created_at | string | ✗ | 2026-01-18T05:11:33.52901+00:0..., 2026-01-18T05:11:33.52901+00:0..., 2026-01-18T05:11:33.52901+00:0... |
| updated_at | string | ✗ | 2026-01-18T05:11:33.52901+00:0..., 2026-01-18T05:11:33.52901+00:0..., 2026-01-18T05:11:33.52901+00:0... |

#### Sample Data (2 rows)

```json
[
  {
    "id": 904,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "type": "expense",
    "amount": 1089221.2036915147,
    "date": "2026-01-01",
    "description": "Material for Bali Trip",
    "notes": "Project expense",
    "wallet_id": 11,
    "to_wallet_id": null,
    "item_id": null,
    "project_id": 9,
    "debt_id": null,
    "is_recurring": false,
    "recurring_transaction_id": null,
    "receipt_url": null,
    "location": null,
    "created_at": "2026-01-18T05:11:33.52901+00:00",
    "updated_at": "2026-01-18T05:11:33.52901+00:00"
  },
  {
    "id": 905,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "type": "expense",
    "amount": 69718.92165693585,
    "date": "2026-01-02",
    "description": "Lunch",
    "notes": null,
    "wallet_id": 13,
    "to_wallet_id": null,
    "item_id": 70,
    "project_id": null,
    "debt_id": null,
    "is_recurring": false,
    "recurring_transaction_id": null,
    "receipt_url": null,
    "location": null,
    "created_at": "2026-01-18T05:11:33.52901+00:00",
    "updated_at": "2026-01-18T05:11:33.52901+00:00"
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

**Row Count:** 0

*No data available in this table*

---

### 10. budget_alerts

**Row Count:** 0

*No data available in this table*

---

### 11. recurring_transactions

**Row Count:** 3

#### Columns (19)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 1, 2, 3 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| type | string | ✗ | income, expense, expense |
| amount | number | ✗ | 15000000, 186000, 350000 |
| description | string | ✗ | Monthly Salary, Netflix, Internet Bill |
| notes | nullable | ✓ | null |
| wallet_id | number | ✗ | 11, 15, 11 |
| to_wallet_id | nullable | ✓ | null |
| item_id | nullable | ✓ | null |
| project_id | nullable | ✓ | null |
| frequency | string | ✗ | monthly, monthly, monthly |
| start_date | string | ✗ | 2026-01-25, 2026-01-01, 2026-01-10 |
| end_date | nullable | ✓ | null |
| next_occurrence | string | ✗ | 2026-02-25, 2026-02-01, 2026-02-10 |
| last_generated_date | nullable | ✓ | null |
| is_active | boolean | ✗ | true, true, true |
| auto_generate | boolean | ✗ | true, true, true |
| created_at | string | ✗ | 2026-01-18T05:11:34.794181+00:..., 2026-01-18T05:11:34.794181+00:..., 2026-01-18T05:11:34.794181+00:... |
| updated_at | string | ✗ | 2026-01-18T05:11:34.794181+00:..., 2026-01-18T05:11:34.794181+00:..., 2026-01-18T05:11:34.794181+00:... |

#### Sample Data (2 rows)

```json
[
  {
    "id": 1,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "type": "income",
    "amount": 15000000,
    "description": "Monthly Salary",
    "notes": null,
    "wallet_id": 11,
    "to_wallet_id": null,
    "item_id": null,
    "project_id": null,
    "frequency": "monthly",
    "start_date": "2026-01-25",
    "end_date": null,
    "next_occurrence": "2026-02-25",
    "last_generated_date": null,
    "is_active": true,
    "auto_generate": true,
    "created_at": "2026-01-18T05:11:34.794181+00:00",
    "updated_at": "2026-01-18T05:11:34.794181+00:00"
  },
  {
    "id": 2,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "type": "expense",
    "amount": 186000,
    "description": "Netflix",
    "notes": null,
    "wallet_id": 15,
    "to_wallet_id": null,
    "item_id": null,
    "project_id": null,
    "frequency": "monthly",
    "start_date": "2026-01-01",
    "end_date": null,
    "next_occurrence": "2026-02-01",
    "last_generated_date": null,
    "is_active": true,
    "auto_generate": true,
    "created_at": "2026-01-18T05:11:34.794181+00:00",
    "updated_at": "2026-01-18T05:11:34.794181+00:00"
  }
]
```

---

### 12. financial_goals

**Row Count:** 0

*No data available in this table*

---

### 13. assets

**Row Count:** 3

#### Columns (17)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 8, 9, 10 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| type | string | ✗ | stock, stock, crypto |
| symbol | string | ✗ | BBCA.JK, TLKM.JK, BTC |
| name | string | ✗ | Bank Central Asia, Telkom Indonesia, Bitcoin |
| quantity | number | ✗ | 5000, 2000, 0.05 |
| avg_buy_price | number | ✗ | 9200, 3800, 950000000 |
| current_price | number | ✗ | 10120, 4180, 1045000000.0000001 |
| purchase_date | nullable | ✓ | null |
| notes | nullable | ✓ | null |
| portfolio_name | nullable | ✓ | null |
| total_cost | number | ✗ | 46000000, 7600000, 47500000 |
| current_value | number | ✗ | 50600000, 8360000, 52250000.00000001 |
| unrealized_gain | number | ✗ | 4600000, 760000, 4750000.000000005 |
| last_price_update | nullable | ✓ | null |
| created_at | string | ✗ | 2026-01-18T05:11:34.404811+00:..., 2026-01-18T05:11:34.404811+00:..., 2026-01-18T05:11:34.404811+00:... |
| updated_at | string | ✗ | 2026-01-18T05:11:34.404811+00:..., 2026-01-18T05:11:34.404811+00:..., 2026-01-18T05:11:34.404811+00:... |

#### Sample Data (2 rows)

```json
[
  {
    "id": 8,
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
    "last_price_update": null,
    "created_at": "2026-01-18T05:11:34.404811+00:00",
    "updated_at": "2026-01-18T05:11:34.404811+00:00"
  },
  {
    "id": 9,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "type": "stock",
    "symbol": "TLKM.JK",
    "name": "Telkom Indonesia",
    "quantity": 2000,
    "avg_buy_price": 3800,
    "current_price": 4180,
    "purchase_date": null,
    "notes": null,
    "portfolio_name": null,
    "total_cost": 7600000,
    "current_value": 8360000,
    "unrealized_gain": 760000,
    "last_price_update": null,
    "created_at": "2026-01-18T05:11:34.404811+00:00",
    "updated_at": "2026-01-18T05:11:34.404811+00:00"
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
| id | number | ✗ | 5, 6 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| name | string | ✗ | Kegiatan Pribadi, Kegiatan Kantor |
| icon | nullable | ✓ | null |
| color | nullable | ✓ | null |
| created_at | string | ✗ | 2026-01-18T05:12:21.34825+00:0..., 2026-01-18T05:12:21.34825+00:0... |

#### Sample Data (2 rows)

```json
[
  {
    "id": 5,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "Kegiatan Pribadi",
    "icon": null,
    "color": null,
    "created_at": "2026-01-18T05:12:21.34825+00:00"
  },
  {
    "id": 6,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "Kegiatan Kantor",
    "icon": null,
    "color": null,
    "created_at": "2026-01-18T05:12:21.34825+00:00"
  }
]
```

---

### 16. tasks

**Row Count:** 2

#### Columns (11)

| Column Name | Type | Nullable | Sample Values |
|-------------|------|----------|---------------|
| id | number | ✗ | 14, 18 |
| user_id | string | ✗ | fa3c5dfb-3d2d-4042-8e5f-f7eb09..., fa3c5dfb-3d2d-4042-8e5f-f7eb09... |
| title | string | ✗ | Review Portfolio, aa |
| priority | string | ✗ | medium, high |
| status | string | ✗ | done, todo |
| deadline | string | ✗ | 2026-02-15, 2026-01-28 |
| notes | nullable | ✓ | aa |
| completed_at | nullable | ✓ | null |
| created_at | string | ✗ | 2026-01-18T05:11:34.575831+00:..., 2026-01-18T05:14:39.257185+00:... |
| updated_at | string | ✗ | 2026-01-18T05:11:34.575831+00:..., 2026-01-18T06:27:58.406287+00:... |
| category_id | nullable | ✓ | 5 |

#### Sample Data (2 rows)

```json
[
  {
    "id": 14,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "title": "Review Portfolio",
    "priority": "medium",
    "status": "done",
    "deadline": "2026-02-15",
    "notes": null,
    "completed_at": null,
    "created_at": "2026-01-18T05:11:34.575831+00:00",
    "updated_at": "2026-01-18T05:11:34.575831+00:00",
    "category_id": null
  },
  {
    "id": 18,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "title": "aa",
    "priority": "high",
    "status": "todo",
    "deadline": "2026-01-28",
    "notes": "aa",
    "completed_at": null,
    "created_at": "2026-01-18T05:14:39.257185+00:00",
    "updated_at": "2026-01-18T06:27:58.406287+00:00",
    "category_id": 5
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
    "id": 11,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "Main BCA",
    "type": "bank",
    "initial_balance": 50000000,
    "currency": "IDR",
    "is_active": true,
    "is_excluded_from_total": false,
    "total_income": 180000000,
    "total_expense": 97871703.42482816,
    "total_transfer_in": 0,
    "total_transfer_out": 35000000,
    "current_balance": 97128296.57517184
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
| description | string |
| total_budget | number |
| status | string |
| deadline | string |
| actual_spent | number |
| remaining_budget | number |
| budget_percentage_used | number |
| transaction_count | number |
| last_transaction_date | string |

#### Sample Data

```json
[
  {
    "id": 8,
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "name": "Home Renovation",
    "description": "Kitchen and living room",
    "total_budget": 50000000,
    "status": "in_progress",
    "deadline": "2026-06-30",
    "actual_spent": 20359859.761051618,
    "remaining_budget": 29640140.238948382,
    "budget_percentage_used": 40.72,
    "transaction_count": 13,
    "last_transaction_date": "2026-10-29"
  }
]
```

---

### 3. budget_tracking_view

---

### 4. net_worth_view

#### Columns (4)

| Column Name | Type |
|-------------|------|
| user_id | string |
| total_liquid_assets | number |
| total_liabilities | object |
| net_worth | object |

#### Sample Data

```json
[
  {
    "user_id": "fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda",
    "total_liquid_assets": 218075842.51371017,
    "total_liabilities": null,
    "net_worth": null
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

**recurring_transactions:**
  - `wallet_id` → likely references `wallets`
  - `to_wallet_id` → likely references `to_wallets`
  - `item_id` → likely references `items`
  - `project_id` → likely references `projects`

**tasks:**
  - `category_id` → likely references `categorys`


---

## 📈 Data Distribution

| Table | Row Count | % of Total |
|-------|-----------|------------|
| transactions | 362 | 88.9% |
| categories | 12 | 2.9% |
| transaction_items | 12 | 2.9% |
| wallets | 5 | 1.2% |
| projects | 3 | 0.7% |
| debts | 3 | 0.7% |
| recurring_transactions | 3 | 0.7% |
| assets | 3 | 0.7% |
| task_categories | 2 | 0.5% |
| tasks | 2 | 0.5% |
| transaction_tags | 0 | 0.0% |
| transaction_tag_assignments | 0 | 0.0% |
| budgets | 0 | 0.0% |
| budget_alerts | 0 | 0.0% |
| financial_goals | 0 | 0.0% |
| asset_transactions | 0 | 0.0% |

