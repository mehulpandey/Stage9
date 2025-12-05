#!/usr/bin/env node

/**
 * Run Supabase migration using Management API with service role key
 */

const https = require('https');
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

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

console.log('Running migration via Supabase REST API...');
console.log('Project:', projectRef);

// Read the migration file
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '0003_fix_auth_integration.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Use PostgREST to execute raw SQL
const postData = JSON.stringify({
  query: migrationSQL
});

const options = {
  hostname: `${projectRef}.supabase.co`,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`,
    'Prefer': 'return=representation'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Response status: ${res.statusCode}`);

    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('\n✓ Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Sign up with a new account');
      console.log('2. The trigger will automatically create your user record');
      console.log('3. Log in and create a project - it should work now!');
    } else {
      console.error('\n✗ Migration failed');
      console.error('Response:', data);

      // Try alternative approach - execute SQL directly
      console.log('\nTrying alternative method...');
      executeViaPostgREST();
    }
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error.message);
  console.log('\nTrying alternative method...');
  executeViaPostgREST();
});

req.write(postData);
req.end();

// Alternative: Execute SQL statements one by one via direct queries
function executeViaPostgREST() {
  const { createClient } = require('@supabase/supabase-js');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('\nUsing Supabase client to execute migration...\n');

  // Execute the migration SQL directly
  fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({ query: migrationSQL })
  })
  .then(res => {
    if (res.ok) {
      console.log('✓ Migration completed via alternative method!');
    } else {
      return res.text().then(text => {
        console.error('✗ Alternative method also failed:', text);
        console.log('\nPlease run the SQL manually in the Supabase dashboard SQL editor.');
        console.log('File: supabase/migrations/0003_fix_auth_integration.sql');
      });
    }
  })
  .catch(err => {
    console.error('✗ Alternative method error:', err.message);
    console.log('\nPlease run the SQL manually in the Supabase dashboard SQL editor.');
    console.log('File: supabase/migrations/0003_fix_auth_integration.sql');
  });
}
