/**
 * Fetch Live Database Schema from Supabase
 * This script connects to your Supabase database and exports the current schema
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface SchemaInfo {
  tables: string[];
  columns: Record<string, any[]>;
  enums: Record<string, string[]>;
  relationships: any[];
  views: string[];
  functions: string[];
}

async function fetchLiveSchema(): Promise<SchemaInfo> {
  console.log('🔍 Fetching live schema from Supabase...\n');
  console.log(`📡 Connected to: ${supabaseUrl}\n`);

  const schema: SchemaInfo = {
    tables: [],
    columns: {},
    enums: {},
    relationships: [],
    views: [],
    functions: []
  };

  try {
    // Check connection by listing tables
    console.log('📊 Discovering tables...');

    const knownTables = [
      'categories', 'transaction_items', 'wallets', 'projects', 'debts',
      'transactions', 'transaction_tags', 'transaction_tag_assignments',
      'budgets', 'budget_alerts', 'recurring_transactions', 'financial_goals',
      'assets', 'asset_transactions', 'task_categories', 'tasks'
    ];

    // Test each table
    for (const tableName of knownTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (!error) {
          schema.tables.push(tableName);
          console.log(`  ✅ ${tableName}`);

          // Get sample data to understand structure
          if (data && data.length > 0) {
            const sample = data[0];
            schema.columns[tableName] = Object.keys(sample).map(key => ({
              name: key,
              type: typeof sample[key],
              sample_value: sample[key]
            }));
          } else {
            // No data, try to get structure differently
            schema.columns[tableName] = [];
          }
        }
      } catch (err) {
        // Table doesn't exist or no access
        console.log(`  ⚠️  ${tableName} - not found or no access`);
      }
    }

    console.log(`\n✅ Found ${schema.tables.length} accessible tables\n`);

    // Check for views
    console.log('🔭 Checking for views...');
    const knownViews = [
      'wallet_balances_view',
      'project_summary_view',
      'budget_tracking_view',
      'net_worth_view',
      'portfolio_summary_view'
    ];

    for (const viewName of knownViews) {
      try {
        const { error } = await supabase.from(viewName).select('*').limit(1);
        if (!error) {
          schema.views.push(viewName);
          console.log(`  ✅ ${viewName}`);
        }
      } catch {
        // View doesn't exist
      }
    }

    console.log(`\n✅ Found ${schema.views.length} views\n`);

    return schema;

  } catch (error) {
    console.error('❌ Error fetching schema:', error);
    throw error;
  }
}

async function generateSchemaReport(schema: SchemaInfo) {
  console.log('\n📝 Generating schema report...\n');

  let report = `# Live Supabase Database Schema
Generated: ${new Date().toISOString()}
Database: ${supabaseUrl}

## Summary
- Tables: ${schema.tables.length}
- Views: ${schema.views.length}

## Tables

`;

  // List all tables
  schema.tables.forEach(table => {
    report += `### ${table}\n\n`;

    if (schema.columns[table] && schema.columns[table].length > 0) {
      report += `| Column | Type | Sample Value |\n`;
      report += `|--------|------|-------------|\n`;

      schema.columns[table].forEach(col => {
        const sampleValue = col.sample_value !== null && col.sample_value !== undefined
          ? JSON.stringify(col.sample_value).substring(0, 50)
          : 'null';
        report += `| ${col.name} | ${col.type} | ${sampleValue} |\n`;
      });
    } else {
      report += `*No sample data available*\n`;
    }

    report += `\n`;
  });

  // List views
  if (schema.views.length > 0) {
    report += `## Views\n\n`;
    schema.views.forEach(view => {
      report += `- ${view}\n`;
    });
    report += `\n`;
  }

  // Save to file
  const outputPath = path.join(process.cwd(), 'context', 'live_schema_snapshot.md');
  fs.writeFileSync(outputPath, report, 'utf-8');

  console.log(`✅ Schema report saved to: ${outputPath}\n`);

  return report;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        Supabase Live Schema Introspection Tool            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    const schema = await fetchLiveSchema();
    const report = await generateSchemaReport(schema);

    console.log('\n' + '='.repeat(60));
    console.log('📋 SCHEMA SUMMARY');
    console.log('='.repeat(60) + '\n');

    console.log(`Tables found: ${schema.tables.join(', ')}\n`);

    if (schema.views.length > 0) {
      console.log(`Views found: ${schema.views.join(', ')}\n`);
    }

    console.log('\n✨ Schema introspection complete!\n');
    console.log('You can now view the detailed schema in context/live_schema_snapshot.md\n');

  } catch (error) {
    console.error('\n❌ Failed to fetch schema:', error);
    process.exit(1);
  }
}

main();
