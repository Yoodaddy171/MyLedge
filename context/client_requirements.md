# Client Requirements & Roadmap (Updated 2026-01-16)

## 1. High Priority: Summary & Analytics
- **Requirement:** User needs a "Summary" feature to filter expenses.
- **Filters:** By Category (e.g., Gasoline) and Time Period (Daily, Weekly, Monthly, Yearly).
- **Status:** ✅ **Completed**. Integrated into the Transactions page with Date Range, Category, and Wallet filters.

## 2. High Priority: Debt Integration
- **Requirement:** Automate debt reduction.
- **Logic:** When a transaction is recorded as "Debt Payment", the remaining balance in the Debt Module must decrease automatically.
- **Implementation:** Added a "Pay" button in `app/debts` that creates a linked transaction and updates the balance in one go.
- **Status:** ✅ **Completed**.

## 3. Dashboard Enhancements
- **Requirement:** "Holistic View" updates.
- **Additions:** Display Total Debt (Hutang) and per-bank liquidity.
- **Chart:** Area Chart showing independent bank balance evolution.
- **Status:** ✅ **Completed**.

## 4. Project Management UI
- **Requirement:** Improve Project selection UI.
- **Change:** Switch from horizontal list to **Dropdown** menu for projects.
- **Status:** Pending.

## 5. Task Management
- **Requirement:** Better organization and alerts.
- **Additions:**
    - Categories (Personal, Work, College, Other).
    - **Persistent Pop-up Notifications** for urgent tasks.
- **Status:** Partial. Priority/Deadline sorting added, but Categories/Pop-ups are pending.

## 6. Investments
- **Requirement:** Better visualization and reliable data.
- **Feature:** Yahoo Finance integration for real-time prices.
- **Status:** ✅ **Completed**.