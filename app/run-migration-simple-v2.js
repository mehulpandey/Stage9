#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' }
});

async function runMigration() {
  console.log('Reading migration file...');
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '0003_fix_auth_integration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Executing migration...\n');

  try {
    // Execute the raw SQL using the pg meta API
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('✓ Migration completed successfully!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

runMigration();
