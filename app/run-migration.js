#!/usr/bin/env node

/**
 * Run Supabase migration using the service role key
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('Running migration 0003_fix_auth_integration.sql...');

  // Read the migration file
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '0003_fix_auth_integration.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  // Split into individual statements and execute each one
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement
      });

      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error);
        throw error;
      }

      console.log(`✓ Statement ${i + 1} completed`);
    } catch (error) {
      console.error(`Failed at statement ${i + 1}:`, statement.substring(0, 100) + '...');
      throw error;
    }
  }

  console.log('\n✓ Migration completed successfully!');
}

runMigration().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
