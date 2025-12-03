/**
 * Core type definitions for Stage9
 * Generated from technical-spec.md and functional-spec.md
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum UserPlanType {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export enum ProjectStatus {
  DRAFT = 'draft',
  PROCESSING = 'processing',      // Running Pipeline A (optimization)
  READY = 'ready',               // User can edit in storyboard (Pipelines B+C)
  RENDERING = 'rendering',       // Running Pipeline D (video rendering)
  COMPLETED = 'completed',       // Video ready for download
  FAILED = 'failed'              // Error during processing
}

export enum SegmentAssetStatus {
  HAS_ASSET = 'has_asset',
  NEEDS_SELECTION = 'needs_selection',
  PLACEHOLDER = 'placeholder'
}

export enum AssetSourceType {
  STOCK = 'stock',
  USER_UPLOADED = 'user_uploaded',
  PLACEHOLDER = 'placeholder'
}

export enum AssetProvider {
  PEXELS = 'pexels',
  PIXABAY = 'pixabay'
}

export enum AssetType {
  VIDEO = 'video',
  IMAGE = 'image'
}

export enum VoicePreset {
  PROFESSIONAL_NARRATOR = 'professional_narrator',
  ENERGETIC_HOST = 'energetic_host',
  CALM_EDUCATOR = 'calm_educator'
}

export enum RenderJobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// ============================================================================
// DATABASE MODELS
// ============================================================================

export interface User {
  id: string;
  email: string;
  created_at: string;
  plan_type: UserPlanType;
  renders_used_this_month: number;
  renders_reset_date: string;
  storage_used_bytes: number;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  status: ProjectStatus;
  original_script: string;
  optimized_script: string | null;
  voice_preset_id: VoicePreset;
  editing_style_preset_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Segment {
  id: string;
  project_id: string;
  segment_number: number;
  original_text: string;
  optimized_text: string;
  duration: number; // in seconds
  estimated_duration: number;
  tts_audio_url: string | null;
  selected_asset_id: string | null;
  asset_status: SegmentAssetStatus;
  placeholder_color: string;
  speed_adjusted: boolean;
  speed_factor: number | null;
  is_silent: boolean;
  silent_duration: number | null;
  created_at: string;
}

export interface Asset {
  id: string;
  project_id: string | null; // null for global cache
  segment_id: string | null;
  source_type: AssetSourceType;
  provider: AssetProvider | null;
  provider_asset_id: string;
  asset_type: AssetType;
  duration: number | null; // in seconds
  url: string;
  thumbnail_url: string | null;
  aspect_ratio: number;
  orientation: 'landscape' | 'portrait' | 'square';
  quality_score: number; // 0-100
  width: number;
  height: number;
  created_at: string;
  expires_at: string | null;
}

export interface Render {
  id: string;
  project_id: string;
  status: RenderJobStatus;
  video_url: string | null;
  srt_url: string | null;
  error_message: string | null;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface TTSCache {
  id: string;
  text_hash: string;
  voice_preset_id: VoicePreset;
  audio_url: string;
  duration_seconds: number;
  created_at: string;
  expires_at: string;
}

export interface JobLog {
  id: string;
  project_id: string;
  job_type: 'optimization' | 'assets' | 'tts' | 'render';
  status: 'pending' | 'running' | 'success' | 'failed';
  error_message: string | null;
  metadata: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Authentication
export interface SignupRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

// Projects
export interface CreateProjectRequest {
  title: string;
  original_script: string;
  voice_preset_id: VoicePreset;
}

export interface UpdateProjectRequest {
  title?: string;
  voice_preset_id?: VoicePreset;
  editing_style_preset_id?: string;
}

export interface ProjectResponse {
  id: string;
  title: string;
  status: ProjectStatus;
  segments: Segment[];
  created_at: string;
  updated_at: string;
}

// Segments
export interface UpdateSegmentRequest {
  optimized_text?: string;
  selected_asset_id?: string | null;
  placeholder_color?: string;
}

export interface SegmentResponse extends Segment {
  selected_asset?: Asset | null;
  asset_suggestions?: Asset[]; // Top 3 suggestions
}

// Assets
export interface SearchAssetsRequest {
  segment_id: string;
  segment_text: string;
  desired_duration: number;
}

export interface SearchAssetsResponse {
  assets: Asset[];
  total_results: number;
  search_time_ms: number;
}

// Renders
export interface StartRenderRequest {
  title?: string; // for final video metadata
}

export interface RenderResponse {
  id: string;
  status: RenderJobStatus;
  progress_percent?: number;
  video_url?: string;
  srt_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface RenderDownloadResponse {
  video_url: string;
  srt_url: string;
  expires_in_seconds: number;
}

// ============================================================================
// PIPELINE TYPES
// ============================================================================

export interface PipelineAInput {
  projectId: string;
  originalScript: string;
}

export interface PipelineAOutput {
  projectId: string;
  optimizedScript: string;
  segments: Array<{
    segment_number: number;
    text: string;
    estimated_duration: number;
  }>;
}

export interface PipelineBInput {
  projectId: string;
  segments: Array<{
    segmentId: string;
    text: string;
    desiredDuration: number;
  }>;
}

export interface PipelineBOutput {
  projectId: string;
  assets: Array<{
    segmentId: string;
    candidates: Asset[];
  }>;
}

export interface PipelineCInput {
  projectId: string;
  segments: Array<{
    segmentId: string;
    selectedAssetId: string;
  }>;
}

export interface PipelineCOutput {
  projectId: string;
  ttsAudio: Array<{
    segmentId: string;
    audioUrl: string;
    durationSeconds: number;
  }>;
}

export interface PipelineDInput {
  projectId: string;
  renderId: string;
}

export interface PipelineDOutput {
  projectId: string;
  renderId: string;
  videoUrl: string;
  srtUrl: string;
  durationSeconds: number;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

export interface RateLimitConfig {
  plan: UserPlanType;
  renders_per_month: number;
  max_duration_minutes: number;
  max_concurrent_renders: number;
  storage_quota_gb: number;
}

export const RATE_LIMIT_CONFIG: Record<UserPlanType, RateLimitConfig> = {
  [UserPlanType.FREE]: {
    plan: UserPlanType.FREE,
    renders_per_month: 2,
    max_duration_minutes: 10,
    max_concurrent_renders: 1,
    storage_quota_gb: 1
  },
  [UserPlanType.PRO]: {
    plan: UserPlanType.PRO,
    renders_per_month: 30,
    max_duration_minutes: 30,
    max_concurrent_renders: 2,
    storage_quota_gb: 100
  },
  [UserPlanType.ENTERPRISE]: {
    plan: UserPlanType.ENTERPRISE,
    renders_per_month: 999999,
    max_duration_minutes: 999999,
    max_concurrent_renders: 5,
    storage_quota_gb: 999999
  }
};

// ============================================================================
// ERROR CODES
// ============================================================================

export enum ErrorCode {
  // Authentication
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_PROJECT_STATE = 'INVALID_PROJECT_STATE',

  // Resources
  NOT_FOUND = 'NOT_FOUND',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  SEGMENT_NOT_FOUND = 'SEGMENT_NOT_FOUND',
  ASSET_NOT_FOUND = 'ASSET_NOT_FOUND',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  STORAGE_EXCEEDED = 'STORAGE_EXCEEDED',

  // Duration Mismatch
  DURATION_MISMATCH_BLOCKED = 'DURATION_MISMATCH_BLOCKED',
  DURATION_MISMATCH_WARNING = 'DURATION_MISMATCH_WARNING',

  // Rendering
  RENDER_FAILED = 'RENDER_FAILED',
  FFMPEG_ERROR = 'FFMPEG_ERROR',
  PLACEHOLDER_THRESHOLD_EXCEEDED = 'PLACEHOLDER_THRESHOLD_EXCEEDED',

  // External Services
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  TTS_GENERATION_FAILED = 'TTS_GENERATION_FAILED',
  ASSET_FETCH_FAILED = 'ASSET_FETCH_FAILED',

  // Server
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}
