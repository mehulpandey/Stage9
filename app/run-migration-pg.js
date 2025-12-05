#!/usr/bin/env node

/**
 * Run Supabase migration using PostgreSQL connection
 */

const { Client } = require('pg');
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

// Construct PostgreSQL connection string
// Format: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
const connectionString = `postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;

console.log('Connecting to Supabase database...');
console.log('Project:', projectRef);

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '0003_fix_auth_integration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration 0003_fix_auth_integration.sql...\n');

    // Execute the entire migration
    await client.query(migrationSQL);

    console.log('\n✓ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Sign up with a new account (the trigger will auto-create your user record)');
    console.log('2. Log in and create a project');
    console.log('3. Everything should work now!');

  } catch (error) {
    console.error('\n✗ Migration failed:');
    console.error(error.message);
    if (error.position) {
      console.error('Error at position:', error.position);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
