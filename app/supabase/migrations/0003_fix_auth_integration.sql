-- Fix Auth Integration: Use Supabase auth.users instead of custom users table
-- This migration makes the app work seamlessly with Supabase Auth

-- Step 1: Drop existing foreign key constraint on projects
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_user_id_fkey;

-- Step 2: Drop custom users table (we'll use auth.users instead)
-- But first, we need to handle the dependencies
DROP TABLE IF EXISTS rate_limit_state CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 3: Create a simplified public.users table that syncs with auth.users
-- This table stores app-specific user data and references auth.users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  renders_used_this_month INTEGER NOT NULL DEFAULT 0,
  renders_reset_date DATE DEFAULT CURRENT_DATE,
  storage_used_bytes BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_plan_type_idx ON users(plan_type);

-- Step 4: Re-add foreign key on projects to reference auth.users
ALTER TABLE projects
  ADD CONSTRAINT projects_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 5: Create trigger function to auto-create user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, plan_type, renders_used_this_month, renders_reset_date, storage_used_bytes)
  VALUES (NEW.id, NEW.email, 'free', 0, CURRENT_DATE, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger on auth.users to auto-create user record
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Update RLS policies to use auth.uid() correctly
-- Users can only access their own profile
DROP POLICY IF EXISTS users_own_profile ON users;
CREATE POLICY users_own_profile ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users
  FOR UPDATE USING (auth.uid() = id);

-- Step 8: Recreate rate_limit_state table
CREATE TABLE rate_limit_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  renders_count INTEGER NOT NULL DEFAULT 0,
  concurrent_renders INTEGER NOT NULL DEFAULT 0,
  reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX rate_limit_state_user_id_idx ON rate_limit_state(user_id);
CREATE INDEX rate_limit_state_reset_date_idx ON rate_limit_state(reset_date);

-- Step 9: Enable RLS on rate_limit_state
ALTER TABLE rate_limit_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_limit_own_state ON rate_limit_state
  FOR ALL USING (auth.uid() = user_id);

-- Step 10: Update existing RLS policies on projects to use auth.uid() correctly
-- The existing policies already use auth.uid()::text = user_id::text which should work
-- But let's ensure consistency by recreating them

DROP POLICY IF EXISTS projects_own_projects ON projects;
CREATE POLICY projects_own_projects ON projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS projects_create_own ON projects;
CREATE POLICY projects_create_own ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS projects_update_own ON projects;
CREATE POLICY projects_update_own ON projects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS projects_delete_own ON projects;
CREATE POLICY projects_delete_own ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Step 11: Update segments policies to use UUID comparison
DROP POLICY IF EXISTS segments_own_segments ON segments;
CREATE POLICY segments_own_segments ON segments
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS segments_update_own ON segments;
CREATE POLICY segments_update_own ON segments
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS segments_create_own ON segments;
CREATE POLICY segments_create_own ON segments
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS segments_delete_own ON segments;
CREATE POLICY segments_delete_own ON segments
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Step 12: Update assets policies
DROP POLICY IF EXISTS assets_own_assets ON assets;
CREATE POLICY assets_own_assets ON assets
  FOR SELECT USING (
    project_id IS NULL OR project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS assets_create_own ON assets;
CREATE POLICY assets_create_own ON assets
  FOR INSERT WITH CHECK (
    project_id IS NULL OR project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS assets_update_own ON assets;
CREATE POLICY assets_update_own ON assets
  FOR UPDATE USING (
    project_id IS NULL OR project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS assets_delete_own ON assets;
CREATE POLICY assets_delete_own ON assets
  FOR DELETE USING (
    project_id IS NULL OR project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Step 13: Update renders policies
DROP POLICY IF EXISTS renders_own_renders ON renders;
CREATE POLICY renders_own_renders ON renders
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS renders_create_own ON renders;
CREATE POLICY renders_create_own ON renders
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS renders_update_own ON renders;
CREATE POLICY renders_update_own ON renders
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS renders_delete_own ON renders;
CREATE POLICY renders_delete_own ON renders
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Step 14: Update job_logs policies
DROP POLICY IF EXISTS job_logs_own_logs ON job_logs;
CREATE POLICY job_logs_own_logs ON job_logs
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS job_logs_create_own ON job_logs;
CREATE POLICY job_logs_create_own ON job_logs
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS job_logs_update_own ON job_logs;
CREATE POLICY job_logs_update_own ON job_logs
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );
