# Supabase Integration Guide

**Last Updated:** 2026-01-18
**Database:** `https://hriaaixvfyyscrernpod.supabase.co`

## Overview

Your application is fully integrated with Supabase for:
- ✅ Authentication (OAuth support)
- ✅ Database operations (16 tables, 5 views)
- ✅ Row Level Security (RLS enabled)
- ✅ Real-time schema introspection

---

## What Claude Can Do

### 1. **Development & Code Generation**
- ✅ Create API routes and server actions
- ✅ Build React components with data fetching
- ✅ Write TypeScript utilities for database operations
- ✅ Generate type-safe query helpers
- ✅ Create migration scripts (as TypeScript files)
- ✅ Implement authentication flows
- ✅ Build data validation and error handling

### 2. **Schema Introspection**
- ✅ Fetch live database schema anytime
- ✅ View current table structures
- ✅ See real data samples
- ✅ Understand relationships

### 3. **Local Development**
- ✅ Run development server
- ✅ Execute build and test scripts
- ✅ Run seed scripts
- ✅ Debug code and fix errors

---

## What You Need to Do

### 1. **Supabase Dashboard Operations**
I cannot access your Supabase dashboard. You'll need to:
- ❌ Run SQL migrations manually
- ❌ Configure authentication providers (Google, GitHub, etc.)
- ❌ Manage API keys and secrets
- ❌ Set up storage buckets
- ❌ Configure database extensions
- ❌ Monitor database performance
- ❌ Manage RLS policies from dashboard
- ❌ Handle user management in Auth section

### 2. **Production Deployments**
- ❌ Deploy to Vercel/hosting platform
- ❌ Set environment variables in production
- ❌ Apply database migrations to production

### 3. **Security & Secrets**
- ❌ Rotate API keys when needed
- ❌ Update `.env.local` with new credentials
- ❌ Configure production environment variables

---

## Current Database Schema

### Tables (16)
1. **categories** - Income/expense categorization
2. **transaction_items** - Master data for transactions
3. **wallets** - Bank accounts, cash, credit cards
4. **projects** - Budget tracking for initiatives
5. **debts** - Loans and liabilities tracking
6. **transactions** - All money movements (core table)
7. **transaction_tags** - Flexible tagging system
8. **transaction_tag_assignments** - Many-to-many tags
9. **budgets** - Monthly/periodic budget limits
10. **budget_alerts** - Budget threshold notifications
11. **recurring_transactions** - Templates for auto-generation
12. **financial_goals** - Savings targets
13. **assets** - Investment portfolio tracking
14. **asset_transactions** - Buy/sell history
15. **task_categories** - Task organization
16. **tasks** - Financial and general tasks

### Views (5)
1. **wallet_balances_view** - Real-time wallet calculations
2. **project_summary_view** - Project spending summaries
3. **budget_tracking_view** - Monthly budget tracking
4. **net_worth_view** - Total net worth calculation
5. **portfolio_summary_view** - Investment portfolio overview

---

## Available Scripts

### Schema Introspection
```bash
# Fetch live schema from Supabase (saves to context/live_schema_snapshot.md)
npm run schema:fetch

# Alternative introspection method
npm run schema:inspect
```

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Seed database with test data
npm run seed
```

---

## How to View Live Schema Anytime

**For Claude:**
To see the current database structure, ask me to run:
```bash
npm run schema:fetch
```

Then read the generated file:
```
context/live_schema_snapshot.md
```

This shows:
- All table names and columns
- Sample data from each table
- Current data types
- Available views

**For You:**
- Check `context/live_schema_snapshot.md` for the latest snapshot
- Or log into Supabase Dashboard → Table Editor

---

## Environment Variables

Located in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://hriaaixvfyyscrernpod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_9LHD30E3Knj-LcKEWt3hlg_1HVKYuOP
SUPABASE_SERVICE_ROLE_KEY=sb_secret_ECmFNlWnougc4fiakD6J1Q__tHV07xj
TWELVE_DATA_API_KEY=8ca91263f0f74054a1501620f0077678
```

**⚠️ Security Notes:**
- Never commit `.env.local` to version control
- Rotate service role key periodically
- Use anon key for client-side operations only
- Use service role key only in server-side code

---

## Integration Status

### ✅ Completed Setup
- [x] Supabase client configured (`lib/supabase.ts`)
- [x] Server-side auth middleware (`middleware.ts`)
- [x] OAuth callback handler (`app/auth/callback/route.ts`)
- [x] Environment variables configured
- [x] Database schema deployed (16 tables, 5 views)
- [x] Row Level Security enabled
- [x] Schema introspection utilities created
- [x] Sample data seeded

### 🔄 Current State
- Database has live data with user: `fa3c5dfb-3d2d-4042-8e5f-f7eb0950edda`
- Categories, wallets, projects, debts all populated
- Transactions being tracked
- Assets and recurring transactions configured
- Tasks system active

### 📋 Next Steps (If Needed)
- [ ] Generate TypeScript types from schema
- [ ] Create API route helpers
- [ ] Build server actions for CRUD operations
- [ ] Add optimistic UI updates
- [ ] Implement real-time subscriptions
- [ ] Add storage for receipts/documents

---

## Working Together for Development Integrity

### When You Want Me to Build Features:

1. **Always run schema fetch first** (if schema might have changed):
   ```
   "Can you run npm run schema:fetch first?"
   ```

2. **Tell me about any dashboard changes**:
   ```
   "I just added a new column 'foo' to the 'transactions' table"
   ```

3. **Let me know about RLS policy changes**:
   ```
   "I updated the RLS policy on wallets to allow shared access"
   ```

### I Will:

1. **Check live schema before coding** when building new features
2. **Use actual column names and types** from your database
3. **Respect your current data structure**
4. **Never assume schema** - always verify
5. **Create migration-ready code** for schema changes

---

## Example Workflow

### Scenario: You want to add a new feature

**You:**
> "I want to add a feature to track shared expenses with friends"

**Me (Claude):**
1. First, I'll run `npm run schema:fetch` to see current schema
2. Check if we need new tables or can use existing ones
3. Propose schema changes (if needed)
4. Wait for you to apply changes in Supabase Dashboard
5. Create the TypeScript code once schema is updated

**You:**
1. Review my schema proposal
2. Run the SQL in Supabase Dashboard SQL Editor
3. Confirm it's done
4. I'll run `schema:fetch` again to verify
5. I'll build the feature using the actual schema

---

## Quick Reference

### File Locations
- **Supabase Client:** `lib/supabase.ts`
- **Middleware:** `middleware.ts`
- **Auth Callback:** `app/auth/callback/route.ts`
- **Schema Scripts:** `scripts/fetch-live-schema.ts`
- **Live Schema Snapshot:** `context/live_schema_snapshot.md`
- **Environment:** `.env.local`

### Key Functions
```typescript
// Client-side usage
import { supabase } from '@/lib/supabase';

// Example query
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId);
```

---

## Troubleshooting

### "Cannot access table X"
- Check RLS policies in Supabase Dashboard
- Verify user authentication
- Run `schema:fetch` to confirm table exists

### "Column Y does not exist"
- Run `npm run schema:fetch` to see current columns
- Check if recent schema changes were applied
- Verify you're using the correct column name

### "Permission denied"
- Check RLS policies
- Verify SUPABASE_SERVICE_ROLE_KEY for server-side operations
- Check user authentication status

---

## Summary

✅ **Supabase is fully integrated and ready for development**

**I can see your live schema anytime** by running `npm run schema:fetch`

**We maintain development integrity** by:
- Me checking schema before coding
- You managing dashboard/migrations
- Regular schema synchronization
- Clear communication about changes

Let's build amazing features together! 🚀
