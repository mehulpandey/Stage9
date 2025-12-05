#!/usr/bin/env node

/**
 * Run Supabase migration using REST API
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Read the migration file
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '0003_fix_auth_integration.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

console.log('Running migration 0003_fix_auth_integration.sql...');
console.log('Project:', projectRef);

// Use Supabase's SQL endpoint
const postData = JSON.stringify({ query: migrationSQL });

const options = {
  hostname: `${projectRef}.supabase.co`,
  path: '/rest/v1/rpc/exec',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`,
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('\n✓ Migration completed successfully!');
      console.log('You can now sign up with a new account and create projects.');
    } else {
      console.error(`\nError: HTTP ${res.statusCode}`);
      console.error(data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

req.write(postData);
req.end();
