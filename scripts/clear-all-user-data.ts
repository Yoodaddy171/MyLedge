/**
 * Clear All User Data Script
 * Removes all user-generated data from the database to prepare for schema V2 migration
 * This will delete ALL data from all users to ensure clean state
 */

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

// Create admin client (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearAllUserData() {
  console.log('🗑️  Starting to clear ALL user data from database...\n');

  try {
    // Delete in order due to foreign key constraints
    // Start from dependent tables first

    console.log('📋 Deleting tasks...');
    const { error: tasksError } = await supabase.from('tasks').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    if (tasksError) throw tasksError;
    console.log('✅ Tasks deleted');

    console.log('💰 Deleting transactions...');
    const { error: transactionsError } = await supabase.from('transactions').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    if (transactionsError) throw transactionsError;
    console.log('✅ Transactions deleted');

    console.log('📦 Deleting transaction items...');
    const { error: itemsError } = await supabase.from('transaction_items').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    if (itemsError) throw itemsError;
    console.log('✅ Transaction items deleted');

    console.log('💳 Deleting budgets...');
    const { error: budgetsError } = await supabase.from('budgets').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    if (budgetsError) throw budgetsError;
    console.log('✅ Budgets deleted');

    console.log('📂 Deleting categories...');
    const { error: categoriesError } = await supabase.from('categories').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    if (categoriesError) throw categoriesError;
    console.log('✅ Categories deleted');

    console.log('📈 Deleting assets (investments)...');
    const { error: assetsError } = await supabase.from('assets').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    if (assetsError) throw assetsError;
    console.log('✅ Assets deleted');

    console.log('📁 Deleting projects...');
    const { error: projectsError } = await supabase.from('projects').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    if (projectsError) throw projectsError;
    console.log('✅ Projects deleted');

    console.log('💸 Deleting debts...');
    const { error: debtsError } = await supabase.from('debts').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    if (debtsError) throw debtsError;
    console.log('✅ Debts deleted');

    console.log('🏦 Deleting wallets...');
    const { error: walletsError } = await supabase.from('wallets').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    if (walletsError) throw walletsError;
    console.log('✅ Wallets deleted');

    console.log('\n🎉 All user data has been cleared successfully!');
    console.log('📊 Database is now ready for schema V2 migration');

  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('⚠️  WARNING: This will delete ALL user data from the database!');
  console.log('⚠️  Make sure you have a backup if needed.\n');

  // Wait 3 seconds to give user time to cancel
  console.log('Starting in 3 seconds... (Press Ctrl+C to cancel)');
  await new Promise(resolve => setTimeout(resolve, 3000));

  await clearAllUserData();
}

main();
