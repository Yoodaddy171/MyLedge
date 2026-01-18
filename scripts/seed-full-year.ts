import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Check .env.local');
  process.exit(1);
}

// Create admin client (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TARGET_USER_EMAIL = 'duludala171';

async function seed() {
  console.log('🚀 Starting seed process for Schema V2...');

  // 1. Get User
  // --------------------------------------------------------------------------
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) throw userError;

  const user = users.find(u => u.email?.includes(TARGET_USER_EMAIL));
  if (!user) {
    console.error(`❌ User ${TARGET_USER_EMAIL} not found!`);
    process.exit(1);
  }
  const userId = user.id;
  console.log(`👤 Found user: ${user.email} (${userId})`);

  // 2. Clear Existing Data
  // --------------------------------------------------------------------------
  console.log('🗑️  Clearing existing data...');
  
  // Disable triggers temporarily if possible? No, we just delete in correct order.
  // Dependencies: 
  // transactions -> wallets, projects, debts, items
  // tag_assignments -> transactions, tags
  
  const tables = [
    'budget_alerts',
    'budgets',
    'transaction_tag_assignments',
    'transaction_tags',
    'asset_transactions',
    'assets',
    'tasks',
    'task_categories',
    'recurring_transactions',
    'financial_goals',
    'transactions', // Heart of the system
    'transaction_items',
    'projects',
    'debts',
    'wallets',
    'categories'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) console.warn(`⚠️  Warning clearing ${table}: ${error.message}`);
  }
  console.log('✅ Data cleared successfully');

  // 3. Create Categories
  // --------------------------------------------------------------------------
  console.log('📂 Creating categories...');
  const categoriesData = [
    // Income
    { name: 'Salary', type: 'income', icon: 'Briefcase', color: '#10b981' },
    { name: 'Freelance', type: 'income', icon: 'Laptop', color: '#34d399' },
    { name: 'Investment Return', type: 'income', icon: 'TrendingUp', color: '#6ee7b7' },
    { name: 'Gift', type: 'income', icon: 'Gift', color: '#a7f3d0' },
    
    // Expense
    { name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#ef4444' },
    { name: 'Transportation', type: 'expense', icon: 'Car', color: '#f87171' },
    { name: 'Housing', type: 'expense', icon: 'Home', color: '#fca5a5' },
    { name: 'Utilities', type: 'expense', icon: 'Zap', color: '#fecaca' },
    { name: 'Healthcare', type: 'expense', icon: 'Heart', color: '#ef4444' },
    { name: 'Entertainment', type: 'expense', icon: 'Film', color: '#f87171' },
    { name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#fca5a5' },
    { name: 'Education', type: 'expense', icon: 'Book', color: '#fecaca' },
  ];

  const { data: categories, error: catError } = await supabase
    .from('categories')
    .insert(categoriesData.map(c => ({ ...c, user_id: userId })))
    .select();
  
  if (catError) throw catError;
  console.log(`✅ Created ${categories.length} categories`);

  const catMap = new Map(categories.map(c => [c.name, c.id]));

  // 4. Create Transaction Items (Master Data)
  // --------------------------------------------------------------------------
  console.log('📦 Creating transaction items...');
  const itemsData = [
    // Income
    { name: 'Monthly Salary', code: 'INC001', category: 'Salary', default_amount: 15000000 },
    { name: 'Freelance Project', code: 'INC002', category: 'Freelance', default_amount: 5000000 },
    
    // Expense
    { name: 'Lunch', code: 'EXP001', category: 'Food & Dining', default_amount: 50000 },
    { name: 'Dinner', code: 'EXP002', category: 'Food & Dining', default_amount: 75000 },
    { name: 'Groceries', code: 'EXP003', category: 'Food & Dining', default_amount: 500000 },
    { name: 'Gasoline', code: 'EXP004', category: 'Transportation', default_amount: 300000 },
    { name: 'Grab/Gojek', code: 'EXP005', category: 'Transportation', default_amount: 45000 },
    { name: 'Rent', code: 'EXP006', category: 'Housing', default_amount: 3500000 },
    { name: 'Electricity Token', code: 'EXP007', category: 'Utilities', default_amount: 200000 },
    { name: 'Internet Bill', code: 'EXP008', category: 'Utilities', default_amount: 350000 },
    { name: 'Netflix', code: 'EXP009', category: 'Entertainment', default_amount: 186000 },
    { name: 'Coffee', code: 'EXP010', category: 'Food & Dining', default_amount: 25000 },
  ];

  const { data: items, error: itemError } = await supabase
    .from('transaction_items')
    .insert(itemsData.map(i => ({
      user_id: userId,
      name: i.name,
      code: i.code,
      category_id: catMap.get(i.category),
      default_amount: i.default_amount
    })))
    .select();

  if (itemError) throw itemError;
  console.log(`✅ Created ${items.length} transaction items`);

  // 5. Create Wallets
  // --------------------------------------------------------------------------
  console.log('💰 Creating wallets...');
  const walletsData = [
    { name: 'Main BCA', type: 'bank', initial: 50000000, currency: 'IDR' },
    { name: 'Mandiri Savings', type: 'bank', initial: 100000000, currency: 'IDR' },
    { name: 'Cash Wallet', type: 'cash', initial: 1500000, currency: 'IDR' },
    { name: 'GoPay', type: 'e_wallet', initial: 500000, currency: 'IDR' },
    { name: 'Credit Card', type: 'credit_card', initial: 0, currency: 'IDR', is_excluded: false }, // Credit card balance is usually negative (debt) or 0 if paid off. Here we start 0.
  ];

  const { data: wallets, error: walletError } = await supabase
    .from('wallets')
    .insert(walletsData.map(w => ({
      user_id: userId,
      name: w.name,
      type: w.type,
      initial_balance: w.initial,
      currency: w.currency,
      is_excluded_from_total: w.is_excluded || false
    })))
    .select();

  if (walletError) throw walletError;
  console.log(`✅ Created ${wallets.length} wallets`);
  const walletMap = new Map(wallets.map(w => [w.name, w.id]));

  // 6. Create Projects
  // --------------------------------------------------------------------------
  console.log('🏗️  Creating projects...');
  const projectsData = [
    { name: 'Home Renovation', budget: 50000000, status: 'in_progress', desc: 'Kitchen and living room', deadline: '2026-06-30' },
    { name: 'Bali Trip', budget: 15000000, status: 'planning', desc: 'End of year vacation', deadline: '2026-12-20' },
    { name: 'New PC Build', budget: 25000000, status: 'completed', desc: 'Workstation upgrade', deadline: '2026-02-28' },
  ];

  const { data: projects, error: projError } = await supabase
    .from('projects')
    .insert(projectsData.map(p => ({
      user_id: userId,
      name: p.name,
      total_budget: p.budget,
      status: p.status,
      description: p.desc,
      deadline: p.deadline // Added deadline for Schedule
    })))
    .select();

  if (projError) throw projError;
  console.log(`✅ Created ${projects.length} projects`);
  const projMap = new Map(projects.map(p => [p.name, p.id]));

  // 7. Create Debts
  // --------------------------------------------------------------------------
  console.log('💳 Creating debts...');
  const debtsData = [
    { name: 'Car Loan', creditor: 'BCA Finance', total: 150000000, remaining: 85000000, monthly: 3500000, due_date: '2026-02-25' },
    { name: 'KPR House', creditor: 'BTN', total: 850000000, remaining: 750000000, monthly: 5500000, due_date: '2026-02-10' },
    { name: 'Personal Loan', creditor: 'Friend', total: 5000000, remaining: 2000000, monthly: 1000000, due_date: '2026-01-30' },
  ];

  const { data: debts, error: debtError } = await supabase
    .from('debts')
    .insert(debtsData.map(d => ({
      user_id: userId,
      name: d.name,
      creditor: d.creditor,
      total_amount: d.total,
      remaining_amount: d.remaining,
      monthly_payment: d.monthly,
      due_date: d.due_date // Added due_date for Schedule
    })))
    .select();

  if (debtError) throw debtError;
  console.log(`✅ Created ${debts.length} debts`);
  const debtMap = new Map(debts.map(d => [d.name, d.id]));

  // 8. Generate Transactions (The Heavy Lifting)
  // --------------------------------------------------------------------------
  console.log('📊 Generating full year transactions...');
  
  const transactions = [];
  const startDate = new Date('2026-01-01'); // Updated to 2026
  const endDate = new Date('2026-12-31');
  const mainWalletId = walletMap.get('Main BCA');
  const cashWalletId = walletMap.get('Cash Wallet');

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const isPayday = d.getDate() === 25;
    
    // 1. Payday (Income)
    if (isPayday) {
      transactions.push({
        user_id: userId,
        date: dateStr,
        type: 'income',
        amount: 15000000,
        description: 'Monthly Salary',
        wallet_id: mainWalletId,
        item_id: items.find(i => i.name === 'Monthly Salary')?.id
      });
    }

    // 2. Daily Expenses (Random)
    if (Math.random() > 0.3) {
      // Lunch
      transactions.push({
        user_id: userId,
        date: dateStr,
        type: 'expense',
        amount: 50000 + (Math.random() * 20000),
        description: 'Lunch',
        wallet_id: cashWalletId,
        item_id: items.find(i => i.name === 'Lunch')?.id
      });
    }

    // 3. Project Expenses (Random)
    if (Math.random() > 0.9) {
      const proj = projectsData[Math.floor(Math.random() * projectsData.length)];
      transactions.push({
        user_id: userId,
        date: dateStr,
        type: 'expense',
        amount: 500000 + (Math.random() * 2000000),
        description: `Material for ${proj.name}`,
        wallet_id: mainWalletId,
        project_id: projMap.get(proj.name),
        notes: 'Project expense'
      });
    }

    // 4. Debt Payments (Monthly on 26th)
    if (d.getDate() === 26) {
      const debt = debtsData[0]; // Car Loan
      transactions.push({
        user_id: userId,
        date: dateStr,
        type: 'expense',
        amount: debt.monthly,
        description: `Installment ${debt.name}`,
        wallet_id: mainWalletId,
        debt_id: debtMap.get(debt.name)
      });
    }

    // 5. Transfers (Withdraw cash)
    if (d.getDate() % 10 === 0) { // Every 10 days
      transactions.push({
        user_id: userId,
        date: dateStr,
        type: 'transfer',
        amount: 1000000,
        description: 'ATM Withdrawal',
        wallet_id: mainWalletId,
        to_wallet_id: cashWalletId
      });
    }
  }

  // Batch insert transactions
  const batchSize = 100;
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const { error } = await supabase.from('transactions').insert(batch);
    if (error) {
      console.error('Error inserting batch:', error);
      // Don't throw, continue
    } else {
      process.stdout.write('.');
    }
  }
  console.log(`\n✅ Generated ${transactions.length} transactions`);

  // 9. Create Assets (Investments)
  // --------------------------------------------------------------------------
  console.log('📈 Creating investments...');
  const assetsData = [
    { type: 'stock', symbol: 'BBCA.JK', name: 'Bank Central Asia', qty: 5000, price: 9200 },
    { type: 'stock', symbol: 'TLKM.JK', name: 'Telkom Indonesia', qty: 2000, price: 3800 },
    { type: 'crypto', symbol: 'BTC', name: 'Bitcoin', qty: 0.05, price: 950000000 },
  ];

  const { error: assetError } = await supabase
    .from('assets')
    .insert(assetsData.map(a => ({
      user_id: userId,
      type: a.type,
      symbol: a.symbol,
      name: a.name,
      quantity: a.qty,
      avg_buy_price: a.price,
      current_price: a.price * 1.1 // Simulate gain
    })));

  if (assetError) throw assetError;
  console.log(`✅ Created ${assetsData.length} assets`);

  // 10. Create Tasks
  // --------------------------------------------------------------------------
  console.log('✅ Creating tasks...');
  const tasksData = [
    { title: 'Pay Taxes', priority: 'high', deadline: '2026-03-31', status: 'todo' },
    { title: 'Review Portfolio', priority: 'medium', deadline: '2026-02-15', status: 'done' },
    { title: 'Cancel Gym Subscription', priority: 'low', deadline: '2026-01-28', status: 'todo' },
    { title: 'Prepare Q1 Report', priority: 'high', deadline: '2026-04-01', status: 'in_progress' },
    { title: 'Car Service', priority: 'medium', deadline: '2026-02-20', status: 'todo' },
  ];

  const { error: taskError } = await supabase
    .from('tasks')
    .insert(tasksData.map(t => ({
      user_id: userId,
      title: t.title,
      priority: t.priority,
      deadline: t.deadline,
      status: t.status
    })))
    .select();

  if (taskError) throw taskError;
  console.log(`✅ Created ${tasksData.length} tasks`);

  // 11. Create Recurring Transactions (For Schedule View)
  // --------------------------------------------------------------------------
  console.log('🔄 Creating recurring transactions...');
  const recurringData = [
    { type: 'income', amount: 15000000, description: 'Monthly Salary', frequency: 'monthly', start_date: '2026-01-25', next: '2026-02-25', wallet: 'Main BCA' },
    { type: 'expense', amount: 186000, description: 'Netflix', frequency: 'monthly', start_date: '2026-01-01', next: '2026-02-01', wallet: 'Credit Card' },
    { type: 'expense', amount: 350000, description: 'Internet Bill', frequency: 'monthly', start_date: '2026-01-10', next: '2026-02-10', wallet: 'Main BCA' },
  ];

  const { error: recurError } = await supabase
    .from('recurring_transactions')
    .insert(recurringData.map(r => ({
      user_id: userId,
      type: r.type,
      amount: r.amount,
      description: r.description,
      frequency: r.frequency,
      start_date: r.start_date,
      next_occurrence: r.next,
      wallet_id: walletMap.get(r.wallet),
      is_active: true,
      auto_generate: true
    })));

  if (recurError) throw recurError;
  console.log(`✅ Created ${recurringData.length} recurring templates`);

  console.log('🎉 Seed V2 Completed Successfully!');
}

seed().catch(err => {
  console.error('❌ Seed Failed:', err);
  process.exit(1);
});