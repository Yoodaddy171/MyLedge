# Feature Plan: Multi-Bank Management

## Objective
Allow the user to manage an unlimited number of Banks (Wallets) and view per-bank expense statistics on the Dashboard.

## Requirements
1.  **Bank Management (CRUD)**:
    - User can Add, Edit, Delete Banks.
    - "Banks" will map to the existing `wallets` table.
2.  **Dashboard Update**:
    - Display all Banks.
    - Show "Money Out" (Expense) for each bank.
    - (Optional but recommended) Show Income and Balance for better context.

## Implementation Steps

### 1. Create Bank Management Page
- **Path**: `app/banks/page.tsx`
- **Features**:
    - List existing wallets.
    - "Add Bank" button -> Modal with Name input.
    - Edit/Delete actions per bank.
    - Use similar UI style to `transactions` or `master` pages (Cards or Table).

### 2. Update Dashboard (`app/page.tsx`)
- **Logic**:
    - Fetch all `wallets`.
    - Fetch all `transactions` (or aggregate via Supabase query if possible, but currently it fetches raw transactions and aggregates in JS. Given the volume might be small for a personal app, JS aggregation is fine).
    - Group transactions by `wallet_id`.
    - Calculate `total_expense` (and `total_income`) per wallet.
- **UI**:
    - Add a new section "Bank Accounts" or "Liquidity Sources".
    - Display cards/list items for each bank showing the calculated stats.

## Technical Details
- **Table**: `wallets`
- **Fields**: `name`, `user_id` (and implicit `id`).

## Verification
- Add a new bank.
- Add transactions for that bank.
- Check Dashboard for correct bank listing and expense calculation.
