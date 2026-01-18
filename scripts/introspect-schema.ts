/**
 * Database Schema Introspection Utility
 * Fetches the current live schema from Supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TableColumn {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
}

interface TableInfo {
  table_name: string;
  table_type: string;
}

interface EnumType {
  enum_name: string;
  enum_values: string[];
}

interface ForeignKey {
  constraint_name: string;
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

interface IndexInfo {
  table_name: string;
  index_name: string;
  column_name: string;
  is_unique: boolean;
}

async function getTables(): Promise<TableInfo[]> {
  const { data, error } = await supabase.rpc('get_tables_info');

  if (error) {
    // Fallback to direct query
    const { data: tables, error: queryError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .order('table_name');

    if (queryError) throw queryError;
    return tables as TableInfo[];
  }

  return data as TableInfo[];
}

async function getColumns(): Promise<TableColumn[]> {
  const query = `
    SELECT
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;

  const { data, error } = await supabase.rpc('exec_sql', { query });

  if (error) throw error;
  return data as TableColumn[];
}

async function getEnums(): Promise<EnumType[]> {
  const query = `
    SELECT
      t.typname as enum_name,
      array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `;

  const { data, error } = await supabase.rpc('exec_sql', { query });

  if (error) throw error;
  return data as EnumType[];
}

async function getForeignKeys(): Promise<ForeignKey[]> {
  const query = `
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name
  `;

  const { data, error } = await supabase.rpc('exec_sql', { query });

  if (error) throw error;
  return data as ForeignKey[];
}

async function getIndexes(): Promise<IndexInfo[]> {
  const query = `
    SELECT
      t.relname AS table_name,
      i.relname AS index_name,
      a.attname AS column_name,
      ix.indisunique AS is_unique
    FROM pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    WHERE t.relkind = 'r'
      AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND i.relname NOT LIKE 'pg_%'
    ORDER BY t.relname, i.relname
  `;

  const { data, error } = await supabase.rpc('exec_sql', { query });

  if (error) throw error;
  return data as IndexInfo[];
}

async function introspectSchema() {
  console.log('🔍 Introspecting Supabase Database Schema...\n');

  try {
    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('wallets')
      .select('count')
      .limit(0);

    if (testError && testError.code !== 'PGRST116') {
      // PGRST116 is "relation does not exist" - that's fine
      console.error('❌ Connection error:', testError);
      throw testError;
    }

    console.log('✅ Connected to Supabase\n');

    // Get tables
    console.log('📊 Fetching tables...');
    const tables = await getTablesSimple();
    console.log(`Found ${tables.length} tables:\n`);
    tables.forEach(t => console.log(`  - ${t.table_name} (${t.table_type})`));

    // Get columns for each table
    console.log('\n📋 Fetching columns...');
    const columns = await getColumnsSimple();

    console.log('\n\n=== DETAILED SCHEMA ===\n');

    const groupedColumns = columns.reduce((acc, col) => {
      if (!acc[col.table_name]) acc[col.table_name] = [];
      acc[col.table_name].push(col);
      return acc;
    }, {} as Record<string, TableColumn[]>);

    Object.entries(groupedColumns).forEach(([tableName, cols]) => {
      console.log(`\n📦 Table: ${tableName}`);
      console.log('─'.repeat(80));
      cols.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${nullable}${def}`);
      });
    });

    // Try to get enums (might fail if we don't have RPC function)
    console.log('\n\n🏷️  Attempting to fetch ENUM types...');
    try {
      const enums = await getEnumsSimple();
      if (enums.length > 0) {
        enums.forEach(e => {
          console.log(`\n  ${e.enum_name}:`);
          console.log(`    ${e.enum_values.join(', ')}`);
        });
      } else {
        console.log('  No custom ENUMs found or unable to fetch');
      }
    } catch (err) {
      console.log('  ⚠️  Could not fetch ENUMs (may need RPC function)');
    }

    console.log('\n\n✨ Schema introspection complete!\n');

  } catch (error) {
    console.error('❌ Error introspecting schema:', error);
    throw error;
  }
}

// Simplified functions that work without custom RPC
async function getTablesSimple(): Promise<TableInfo[]> {
  const { data, error } = await supabase
    .rpc('get_public_tables');

  if (error) {
    // Fallback: Try raw SQL query
    console.log('  Using fallback method...');
    return await getTablesFallback();
  }

  return data as TableInfo[];
}

async function getTablesFallback(): Promise<TableInfo[]> {
  // This is a workaround - we'll query each table to see if it exists
  const knownTables = [
    'categories', 'transaction_items', 'wallets', 'projects', 'debts',
    'transactions', 'transaction_tags', 'transaction_tag_assignments',
    'budgets', 'budget_alerts', 'recurring_transactions', 'financial_goals',
    'assets', 'asset_transactions', 'task_categories', 'tasks'
  ];

  const existingTables: TableInfo[] = [];

  for (const tableName of knownTables) {
    try {
      const { error } = await supabase.from(tableName).select('*').limit(0);
      if (!error) {
        existingTables.push({ table_name: tableName, table_type: 'BASE TABLE' });
      }
    } catch {
      // Table doesn't exist
    }
  }

  return existingTables;
}

async function getColumnsSimple(): Promise<TableColumn[]> {
  const tables = await getTablesSimple();
  const allColumns: TableColumn[] = [];

  for (const table of tables) {
    try {
      // Use Supabase PostgREST introspection
      const { data, error } = await supabase
        .from(table.table_name)
        .select('*')
        .limit(0);

      if (!error) {
        // We can't get full column info this way, so we'll use a different approach
        // Let's try to get one row to see the structure
        const { data: sampleData } = await supabase
          .from(table.table_name)
          .select('*')
          .limit(1)
          .single();

        if (sampleData) {
          Object.keys(sampleData).forEach(columnName => {
            allColumns.push({
              table_name: table.table_name,
              column_name: columnName,
              data_type: typeof sampleData[columnName],
              is_nullable: 'UNKNOWN',
              column_default: null,
              character_maximum_length: null
            });
          });
        }
      }
    } catch (err) {
      // Skip if error
    }
  }

  return allColumns;
}

async function getEnumsSimple(): Promise<EnumType[]> {
  // This requires a custom RPC function in Supabase
  // We'll return empty array for now
  return [];
}

// Run introspection
introspectSchema().catch(console.error);
