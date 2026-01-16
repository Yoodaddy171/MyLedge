# Changelog

## [Unreleased] - 2026-01-16

### Added
- **Dashboard Area Chart**: Implemented a sophisticated balance evolution chart for the last 30 days.
- **Bank Visibility Filter**: Added toggle controls on the dashboard to show/hide specific banks in the area chart.
- **Debt Payment Integration**: Added a "Pay" feature in the Liabilities module that automatically records an expense in transactions and reduces the debt balance.
- **Loan Calculator**: Built-in tool to calculate monthly installments, total interest, and total payments, with an option to save directly as a liability.
- **Transaction Filters**: Added comprehensive filtering (Date Range, Wallet, Category) and sorting (Date, Amount) to the Transactions page.
- **Master Data Filters**: Added Income/Expense type filtering to the Catalog page.
- **Yahoo Finance Integration**: Successfully migrated investment price synchronization to Yahoo Finance v3.

### Changed
- **Dashboard Robustness**: Refactored data fetching to use `Promise.allSettled`, preventing the entire dashboard from crashing if one table is missing or empty.
- **UI Responsiveness**: Fixed button group overflows and ensured all headers are mobile-friendly across all modules.
- **Transaction UI**: Enhanced the transaction list to display the source bank/wallet prominently with icons.
- **Dynamic Form Labels**: Updated transaction forms to dynamically label bank selection as "Pay With" or "Deposit To" based on the transaction type.

### Fixed
- **Filtering Bug**: Resolved an issue where the transaction table wouldn't update when filters were applied (was rendering raw instead of filtered data).
- **Build Errors**: Fixed several import and directive issues (`use client` and Yahoo Finance class instantiation).
- **Database Schema**: Prepared idempotent SQL scripts for safe policy and table creation.
