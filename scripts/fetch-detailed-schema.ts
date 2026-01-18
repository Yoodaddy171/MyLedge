/**
 * Fetch Detailed Database Schema from Supabase
 * Gets comprehensive information about all tables, columns, constraints, and data
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

interface DetailedTableInfo {
  name: string;
  row_count: number;
  columns: any[];
  sample_rows: any[];
  primary_key?: string;
  foreign_keys: any[];
  indexes: string[];
}

const ALL_TABLES = [
  'categories',
  'transaction_items',
  'wallets',
  'projects',
  'debts',
  'transactions',
  'transaction_tags',
  'transaction_tag_assignments',
  'budgets',
  'budget_alerts',
  'recurring_transactions',
  'financial_goals',
  'assets',
  'asset_transactions',
  'task_categories',
  'tasks'
];

const ALL_VIEWS = [
  'wallet_balances_view',
  'project_summary_view',
  'budget_tracking_view',
  'net_worth_view',
  'portfolio_summary_view'
];

async function getTableDetails(tableName: string): Promise<DetailedTableInfo | null> {
  try {
    console.log(`\n📊 Analyzing table: ${tableName}`);

    // Get row count
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log(`  ⚠️  Could not access table: ${countError.message}`);
      return null;
    }

    console.log(`  📈 Rows: ${count || 0}`);

    // Get sample rows (up to 5)
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(5);

    if (sampleError) {
      console.log(`  ⚠️  Could not fetch sample data: ${sampleError.message}`);
      return null;
    }

    // Extract column information from sample data
    const columns = sampleData && sampleData.length > 0
      ? Object.keys(sampleData[0]).map(columnName => {
          const sampleValue = sampleData[0][columnName];
          return {
            name: columnName,
            type: sampleValue === null ? 'nullable' : typeof sampleValue,
            nullable: sampleData.some(row => row[columnName] === null),
            sample_values: sampleData
              .map(row => row[columnName])
              .filter((val, idx) => idx < 3) // First 3 unique values
          };
        })
      : [];

    console.log(`  📋 Columns: ${columns.length}`);

    return {
      name: tableName,
      row_count: count || 0,
      columns,
      sample_rows: sampleData || [],
      foreign_keys: [],
      indexes: []
    };

  } catch (error) {
    console.log(`  ❌ Error analyzing table: ${error}`);
    return null;
  }
}

async function getViewDetails(viewName: string) {
  try {
    console.log(`\n🔭 Analyzing view: ${viewName}`);

    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .limit(3);

    if (error) {
      console.log(`  ⚠️  Could not access view: ${error.message}`);
      return null;
    }

    const columns = data && data.length > 0
      ? Object.keys(data[0]).map(col => ({
          name: col,
          type: typeof data[0][col]
        }))
      : [];

    console.log(`  📋 Columns: ${columns.length}`);

    return {
      name: viewName,
      columns,
      sample_data: data
    };

  } catch (error) {
    console.log(`  ❌ Error analyzing view: ${error}`);
    return null;
  }
}

async function generateDetailedReport(tables: DetailedTableInfo[], views: any[]) {
  console.log('\n\n📝 Generating detailed schema report...\n');

  let report = `# Detailed Supabase Database Schema

**Generated:** ${new Date().toISOString()}
**Database:** ${supabaseUrl}

## Summary Statistics

- **Total Tables:** ${tables.length}
- **Total Views:** ${views.length}
- **Total Rows Across All Tables:** ${tables.reduce((sum, t) => sum + t.row_count, 0).toLocaleString()}

---

`;

  // Detailed table information
  report += `## 📊 Tables (${tables.length})\n\n`;

  tables.forEach((table, idx) => {
    report += `### ${idx + 1}. ${table.name}\n\n`;
    report += `**Row Count:** ${table.row_count.toLocaleString()}\n\n`;

    if (table.columns.length > 0) {
      report += `#### Columns (${table.columns.length})\n\n`;
      report += `| Column Name | Type | Nullable | Sample Values |\n`;
      report += `|-------------|------|----------|---------------|\n`;

      table.columns.forEach(col => {
        const sampleVals = col.sample_values
          .filter((v: any) => v !== null && v !== undefined)
          .map((v: any) => {
            const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
            return str.length > 30 ? str.substring(0, 30) + '...' : str;
          })
          .join(', ') || 'null';

        report += `| ${col.name} | ${col.type} | ${col.nullable ? '✓' : '✗'} | ${sampleVals} |\n`;
      });

      report += `\n`;
    }

    // Sample data
    if (table.sample_rows.length > 0) {
      report += `#### Sample Data (${Math.min(table.sample_rows.length, 2)} rows)\n\n`;
      report += '```json\n';
      report += JSON.stringify(table.sample_rows.slice(0, 2), null, 2);
      report += '\n```\n\n';
    } else {
      report += `*No data available in this table*\n\n`;
    }

    report += `---\n\n`;
  });

  // Views information
  if (views.length > 0) {
    report += `## 🔭 Views (${views.length})\n\n`;

    views.forEach((view, idx) => {
      if (!view) return;

      report += `### ${idx + 1}. ${view.name}\n\n`;

      if (view.columns && view.columns.length > 0) {
        report += `#### Columns (${view.columns.length})\n\n`;
        report += `| Column Name | Type |\n`;
        report += `|-------------|------|\n`;

        view.columns.forEach((col: any) => {
          report += `| ${col.name} | ${col.type} |\n`;
        });

        report += `\n`;
      }

      if (view.sample_data && view.sample_data.length > 0) {
        report += `#### Sample Data\n\n`;
        report += '```json\n';
        report += JSON.stringify(view.sample_data.slice(0, 1), null, 2);
        report += '\n```\n\n';
      }

      report += `---\n\n`;
    });
  }

  // Table relationships overview
  report += `## 🔗 Common Relationships\n\n`;
  report += `Based on column naming patterns, likely foreign key relationships:\n\n`;

  tables.forEach(table => {
    const fkColumns = table.columns.filter(col =>
      col.name.endsWith('_id') && col.name !== 'user_id'
    );

    if (fkColumns.length > 0) {
      report += `**${table.name}:**\n`;
      fkColumns.forEach(col => {
        const referencedTable = col.name.replace('_id', 's');
        report += `  - \`${col.name}\` → likely references \`${referencedTable}\`\n`;
      });
      report += `\n`;
    }
  });

  report += `\n---\n\n`;

  // Data distribution
  report += `## 📈 Data Distribution\n\n`;
  report += `| Table | Row Count | % of Total |\n`;
  report += `|-------|-----------|------------|\n`;

  const totalRows = tables.reduce((sum, t) => sum + t.row_count, 0);
  tables
    .sort((a, b) => b.row_count - a.row_count)
    .forEach(table => {
      const percentage = totalRows > 0 ? ((table.row_count / totalRows) * 100).toFixed(1) : '0.0';
      report += `| ${table.name} | ${table.row_count.toLocaleString()} | ${percentage}% |\n`;
    });

  report += `\n`;

  return report;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Detailed Supabase Schema Introspection Tool           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  console.log('\n📡 Connecting to Supabase...\n');
  console.log(`Database: ${supabaseUrl}\n`);

  try {
    // Fetch all tables
    console.log('🔍 Analyzing all tables...');
    const tablePromises = ALL_TABLES.map(table => getTableDetails(table));
    const tableResults = await Promise.all(tablePromises);
    const tables = tableResults.filter(t => t !== null) as DetailedTableInfo[];

    console.log(`\n✅ Successfully analyzed ${tables.length} tables`);

    // Fetch all views
    console.log('\n🔍 Analyzing all views...');
    const viewPromises = ALL_VIEWS.map(view => getViewDetails(view));
    const viewResults = await Promise.all(viewPromises);
    const views = viewResults.filter(v => v !== null);

    console.log(`\n✅ Successfully analyzed ${views.length} views`);

    // Generate report
    const report = await generateDetailedReport(tables, views);

    // Save to file
    const outputPath = path.join(process.cwd(), 'context', 'detailed_schema_report.md');
    fs.writeFileSync(outputPath, report, 'utf-8');

    console.log(`\n✅ Detailed schema report saved to:\n   ${outputPath}`);

    // Also create a JSON export
    const jsonData = {
      generated_at: new Date().toISOString(),
      database_url: supabaseUrl,
      summary: {
        total_tables: tables.length,
        total_views: views.length,
        total_rows: tables.reduce((sum, t) => sum + t.row_count, 0)
      },
      tables,
      views
    };

    const jsonPath = path.join(process.cwd(), 'context', 'schema_export.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');

    console.log(`\n✅ JSON export saved to:\n   ${jsonPath}`);

    console.log('\n\n' + '='.repeat(60));
    console.log('📋 ANALYSIS COMPLETE');
    console.log('='.repeat(60));

    console.log(`\n📊 Tables analyzed: ${tables.length}`);
    console.log(`🔭 Views analyzed: ${views.length}`);
    console.log(`📈 Total rows: ${tables.reduce((sum, t) => sum + t.row_count, 0).toLocaleString()}`);

    console.log('\n✨ Schema introspection complete!\n');

  } catch (error) {
    console.error('\n❌ Error during introspection:', error);
    process.exit(1);
  }
}

main();
