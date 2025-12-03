-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Users Table
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  renders_used_this_month INTEGER NOT NULL DEFAULT 0,
  renders_reset_date DATE DEFAULT CURRENT_DATE,
  storage_used_bytes BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_plan_type_idx ON users(plan_type);

-- ============================================================================
-- Projects Table
-- ============================================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'ready', 'rendering', 'completed', 'failed')),
  original_script TEXT NOT NULL,
  optimized_script TEXT,
  voice_preset_id VARCHAR(50) NOT NULL DEFAULT 'professional_narrator' CHECK (voice_preset_id IN ('professional_narrator', 'energetic_host', 'calm_educator')),
  editing_style_preset_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX projects_user_id_idx ON projects(user_id);
CREATE INDEX projects_status_idx ON projects(status);
CREATE INDEX projects_created_at_idx ON projects(created_at DESC);

-- ============================================================================
-- Segments Table
-- ============================================================================
CREATE TABLE segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  segment_number INTEGER NOT NULL,
  original_text TEXT NOT NULL,
  optimized_text TEXT NOT NULL,
  duration DECIMAL(10, 2) NOT NULL,
  estimated_duration DECIMAL(10, 2) NOT NULL,
  tts_audio_url VARCHAR(512),
  selected_asset_id UUID,
  asset_status VARCHAR(50) NOT NULL DEFAULT 'needs_selection' CHECK (asset_status IN ('has_asset', 'needs_selection', 'placeholder')),
  placeholder_color VARCHAR(7) NOT NULL DEFAULT '#E5E7EB',
  speed_adjusted BOOLEAN NOT NULL DEFAULT FALSE,
  speed_factor DECIMAL(10, 4),
  is_silent BOOLEAN NOT NULL DEFAULT FALSE,
  silent_duration DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_segment_number UNIQUE (project_id, segment_number),
  CONSTRAINT valid_speed_factor CHECK (speed_factor IS NULL OR (speed_factor >= 0.80 AND speed_factor <= 1.25))
);

CREATE INDEX segments_project_id_idx ON segments(project_id);
CREATE INDEX segments_asset_status_idx ON segments(asset_status);

-- ============================================================================
-- Assets Table (Stock Footage & Images Cache)
-- ============================================================================
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES segments(id) ON DELETE SET NULL,
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('stock', 'user_uploaded', 'placeholder')),
  provider VARCHAR(50) CHECK (provider IN ('pexels', 'pixabay')),
  provider_asset_id VARCHAR(255),
  asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('video', 'image')),
  duration DECIMAL(10, 2),
  url VARCHAR(512) NOT NULL,
  thumbnail_url VARCHAR(512),
  aspect_ratio DECIMAL(10, 4) NOT NULL,
  orientation VARCHAR(20) NOT NULL CHECK (orientation IN ('landscape', 'portrait', 'square')),
  quality_score INTEGER NOT NULL DEFAULT 50 CHECK (quality_score >= 0 AND quality_score <= 100),
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_provider CHECK (
    (source_type = 'stock' AND provider IS NOT NULL AND provider_asset_id IS NOT NULL) OR
    (source_type IN ('user_uploaded', 'placeholder') AND provider IS NULL AND provider_asset_id IS NULL)
  )
);

CREATE INDEX assets_project_id_idx ON assets(project_id);
CREATE INDEX assets_segment_id_idx ON assets(segment_id);
CREATE INDEX assets_provider_idx ON assets(provider);
CREATE INDEX assets_expires_at_idx ON assets(expires_at);

-- ============================================================================
-- Renders Table
-- ============================================================================
CREATE TABLE renders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  video_url VARCHAR(512),
  srt_url VARCHAR(512),
  error_message TEXT,
  duration_seconds DECIMAL(10, 2),
  file_size_bytes BIGINT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX renders_project_id_idx ON renders(project_id);
CREATE INDEX renders_status_idx ON renders(status);
CREATE INDEX renders_started_at_idx ON renders(started_at DESC);

-- ============================================================================
-- TTS Cache Table
-- ============================================================================
CREATE TABLE tts_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text_hash VARCHAR(64) NOT NULL,
  voice_preset_id VARCHAR(50) NOT NULL CHECK (voice_preset_id IN ('professional_narrator', 'energetic_host', 'calm_educator')),
  audio_url VARCHAR(512) NOT NULL,
  duration_seconds DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT unique_tts_hash UNIQUE (text_hash, voice_preset_id)
);

CREATE INDEX tts_cache_expires_at_idx ON tts_cache(expires_at);
CREATE INDEX tts_cache_text_hash_idx ON tts_cache(text_hash);

-- ============================================================================
-- Job Logs Table
-- ============================================================================
CREATE TABLE job_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('optimization', 'assets', 'tts', 'render')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX job_logs_project_id_idx ON job_logs(project_id);
CREATE INDEX job_logs_job_type_idx ON job_logs(job_type);
CREATE INDEX job_logs_status_idx ON job_logs(status);

-- ============================================================================
-- Refresh Tokens Table (for session management)
-- ============================================================================
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens(user_id);
CREATE INDEX refresh_tokens_expires_at_idx ON refresh_tokens(expires_at);

-- ============================================================================
-- Rate Limiting State Table
-- ============================================================================
CREATE TABLE rate_limit_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  renders_count INTEGER NOT NULL DEFAULT 0,
  concurrent_renders INTEGER NOT NULL DEFAULT 0,
  reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX rate_limit_state_user_id_idx ON rate_limit_state(user_id);
CREATE INDEX rate_limit_state_reset_date_idx ON rate_limit_state(reset_date);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE renders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own profile
CREATE POLICY users_own_profile ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Users can only access their own projects
CREATE POLICY projects_own_projects ON projects
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY projects_create_own ON projects
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY projects_update_own ON projects
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY projects_delete_own ON projects
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Users can only access segments in their own projects
CREATE POLICY segments_own_segments ON segments
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY segments_update_own ON segments
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id::text = auth.uid()::text
    )
  );

-- Users can only access assets in their own projects
CREATE POLICY assets_own_assets ON assets
  FOR SELECT USING (
    project_id IS NULL OR project_id IN (
      SELECT id FROM projects WHERE user_id::text = auth.uid()::text
    )
  );

-- Users can only access renders for their own projects
CREATE POLICY renders_own_renders ON renders
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id::text = auth.uid()::text
    )
  );

-- Job logs accessible only for own projects
CREATE POLICY job_logs_own_logs ON job_logs
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id::text = auth.uid()::text
    )
  );

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- Project summary with segment count and status
CREATE VIEW project_summary AS
SELECT
  p.id,
  p.user_id,
  p.title,
  p.status,
  p.created_at,
  p.updated_at,
  COUNT(s.id) as segment_count,
  SUM(CASE WHEN s.asset_status = 'has_asset' THEN 1 ELSE 0 END) as assets_selected,
  SUM(CASE WHEN s.asset_status = 'placeholder' THEN 1 ELSE 0 END) as placeholders_used
FROM projects p
LEFT JOIN segments s ON p.id = s.project_id
GROUP BY p.id, p.user_id, p.title, p.status, p.created_at, p.updated_at;

-- Render history with video info
CREATE VIEW render_history AS
SELECT
  r.id,
  r.project_id,
  r.status,
  r.duration_seconds,
  r.file_size_bytes,
  r.started_at,
  r.completed_at,
  p.title as project_title,
  EXTRACT(EPOCH FROM (r.completed_at - r.started_at)) as processing_time_seconds
FROM renders r
JOIN projects p ON r.project_id = p.id
WHERE r.status IN ('completed', 'failed');
