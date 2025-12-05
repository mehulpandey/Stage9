/**
 * Supabase Database Types
 * Type definitions for database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Define table row types for convenience
export type ProjectRow = {
  id: string
  user_id: string
  title: string
  status: 'draft' | 'processing' | 'ready' | 'rendering' | 'completed' | 'failed'
  original_script: string
  optimized_script: string | null
  voice_preset_id: 'professional_narrator' | 'energetic_host' | 'calm_educator'
  editing_style_preset_id: string | null
  created_at: string
  updated_at: string
}

export type SegmentRow = {
  id: string
  project_id: string
  segment_number: number
  original_text: string
  optimized_text: string
  duration: number
  estimated_duration: number
  tts_audio_url: string | null
  selected_asset_id: string | null
  asset_status: 'has_asset' | 'needs_selection' | 'placeholder'
  placeholder_color: string
  speed_adjusted: boolean
  speed_factor: number | null
  is_silent: boolean
  silent_duration: number | null
  created_at: string
}

export type UserRow = {
  id: string
  email: string
  password_hash: string
  created_at: string
  plan_type: 'free' | 'pro' | 'enterprise'
  renders_used_this_month: number
  renders_reset_date: string
  storage_used_bytes: number
}

export type AssetRow = {
  id: string
  project_id: string | null
  segment_id: string | null
  source_type: 'stock' | 'user_uploaded' | 'placeholder'
  provider: 'pexels' | 'pixabay' | null
  provider_asset_id: string
  asset_type: 'video' | 'image'
  duration: number | null
  url: string
  thumbnail_url: string | null
  aspect_ratio: number
  orientation: 'landscape' | 'portrait' | 'square'
  quality_score: number
  width: number
  height: number
  created_at: string
  expires_at: string | null
}

export type RenderRow = {
  id: string
  project_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  video_url: string | null
  srt_url: string | null
  error_message: string | null
  duration_seconds: number | null
  file_size_bytes: number | null
  started_at: string
  completed_at: string | null
}

export type TTSCacheRow = {
  id: string
  text_hash: string
  voice_preset_id: 'professional_narrator' | 'energetic_host' | 'calm_educator'
  audio_url: string
  duration_seconds: number
  created_at: string
  expires_at: string
}

export type JobLogRow = {
  id: string
  project_id: string
  job_type: 'optimization' | 'assets' | 'tts' | 'render'
  status: 'pending' | 'running' | 'success' | 'failed'
  error_message: string | null
  metadata: Json
  started_at: string
  completed_at: string | null
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: Partial<UserRow> & { email: string; password_hash: string }
        Update: Partial<UserRow>
        Relationships: []
      }
      projects: {
        Row: ProjectRow
        Insert: Partial<ProjectRow> & { user_id: string; title: string; original_script: string }
        Update: Partial<ProjectRow>
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      segments: {
        Row: SegmentRow
        Insert: Partial<SegmentRow> & { project_id: string; segment_number: number; original_text: string; optimized_text: string; duration: number; estimated_duration: number }
        Update: Partial<SegmentRow>
        Relationships: [
          {
            foreignKeyName: "segments_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      assets: {
        Row: AssetRow
        Insert: Partial<AssetRow> & { source_type: AssetRow['source_type']; provider_asset_id: string; asset_type: AssetRow['asset_type']; url: string; aspect_ratio: number; orientation: AssetRow['orientation']; width: number; height: number }
        Update: Partial<AssetRow>
        Relationships: []
      }
      renders: {
        Row: RenderRow
        Insert: Partial<RenderRow> & { project_id: string }
        Update: Partial<RenderRow>
        Relationships: [
          {
            foreignKeyName: "renders_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      tts_cache: {
        Row: TTSCacheRow
        Insert: Partial<TTSCacheRow> & { text_hash: string; voice_preset_id: TTSCacheRow['voice_preset_id']; audio_url: string; duration_seconds: number; expires_at: string }
        Update: Partial<TTSCacheRow>
        Relationships: []
      }
      job_logs: {
        Row: JobLogRow
        Insert: Partial<JobLogRow> & { project_id: string; job_type: JobLogRow['job_type'] }
        Update: Partial<JobLogRow>
        Relationships: [
          {
            foreignKeyName: "job_logs_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      refresh_tokens: {
        Row: {
          id: string
          user_id: string
          token_hash: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token_hash: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token_hash?: string
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      rate_limit_state: {
        Row: {
          id: string
          user_id: string
          renders_count: number
          concurrent_renders: number
          reset_date: string
          last_updated: string
        }
        Insert: {
          id?: string
          user_id: string
          renders_count?: number
          concurrent_renders?: number
          reset_date?: string
          last_updated?: string
        }
        Update: {
          id?: string
          user_id?: string
          renders_count?: number
          concurrent_renders?: number
          reset_date?: string
          last_updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_state_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      project_summary: {
        Row: {
          id: string
          user_id: string
          title: string
          status: string
          created_at: string
          updated_at: string
          segment_count: number
          assets_selected: number
          placeholders_used: number
        }
        Relationships: []
      }
      render_history: {
        Row: {
          id: string
          project_id: string
          status: string
          duration_seconds: number | null
          file_size_bytes: number | null
          started_at: string
          completed_at: string | null
          project_title: string
          processing_time_seconds: number | null
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: {
      plan_type: 'free' | 'pro' | 'enterprise'
      project_status: 'draft' | 'processing' | 'ready' | 'rendering' | 'completed' | 'failed'
      voice_preset: 'professional_narrator' | 'energetic_host' | 'calm_educator'
      asset_status: 'has_asset' | 'needs_selection' | 'placeholder'
      source_type: 'stock' | 'user_uploaded' | 'placeholder'
      provider: 'pexels' | 'pixabay'
      asset_type: 'video' | 'image'
      orientation: 'landscape' | 'portrait' | 'square'
      render_status: 'queued' | 'processing' | 'completed' | 'failed'
      job_type: 'optimization' | 'assets' | 'tts' | 'render'
      job_status: 'pending' | 'running' | 'success' | 'failed'
    }
    CompositeTypes: Record<string, never>
  }
}

// Helper types for Supabase operations
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
