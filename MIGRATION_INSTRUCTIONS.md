# Database Migration Instructions

## Problem
The `projects` table has a foreign key to a custom `users` table, but we're using Supabase Auth which has its own `auth.users` table. This causes a foreign key constraint error when creating projects.

## Solution
Run the migration SQL in your Supabase dashboard to fix the auth integration.

## Steps

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy and paste the SQL from `supabase/migrations/0003_fix_auth_integration.sql`
6. Click "Run" to execute the migration

## What This Migration Does

1. **Removes the custom users table** and replaces it with a simpler one that references `auth.users`
2. **Creates an automatic trigger** that creates a user record whenever someone signs up via Supabase Auth
3. **Fixes all foreign key constraints** to reference `auth.users` instead of the custom users table
4. **Updates all RLS policies** to work correctly with Supabase Auth's `auth.uid()` function
5. **Ensures data isolation** - users can only access their own projects, segments, assets, renders, etc.

## After Running the Migration

- Existing users will need to be recreated (sign up again)
- All future signups will automatically create a user record
- All project creation and data access will work correctly
- RLS policies will enforce proper data isolation

## Testing

After running the migration:
1. Sign up with a new account
2. Log in
3. Create a project
4. Verify the project appears in the dashboard
5. Verify you cannot see other users' projects
