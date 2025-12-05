-- Add ranking and caching fields to assets table for Pipeline B

-- Ranking fields
ALTER TABLE assets ADD COLUMN IF NOT EXISTS is_ranked BOOLEAN DEFAULT FALSE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS rank_position INTEGER;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS ranking_score DECIMAL(10, 4);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS keyword_score DECIMAL(10, 4);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS duration_score DECIMAL(10, 4);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS orientation_score DECIMAL(10, 4);

-- Extended metadata
ALTER TABLE assets ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}';

-- Caching fields
ALTER TABLE assets ADD COLUMN IF NOT EXISTS cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create index for cache lookups by provider asset id
CREATE INDEX IF NOT EXISTS assets_provider_asset_id_idx ON assets(provider, provider_asset_id);

-- Create index for ranked assets
CREATE INDEX IF NOT EXISTS assets_is_ranked_idx ON assets(is_ranked) WHERE is_ranked = TRUE;
