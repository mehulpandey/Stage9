/**
 * Supabase Database Client
 * Centralized database access with type safety
 */

import { createClient } from '@supabase/supabase-js';
import { Database, ProjectRow, SegmentRow, AssetRow, TTSCacheRow, RenderRow, JobLogRow, Json } from './database.types';

// Server-side Supabase client (uses service role key)
export function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Client-side Supabase client (uses anon key)
export function createSupabaseClientClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, anonKey);
}

// Singleton pattern for server client
let serverClient: ReturnType<typeof createSupabaseServerClient> | null = null;

export function getSupabaseServerClient() {
  if (!serverClient) {
    serverClient = createSupabaseServerClient();
  }
  return serverClient;
}

// ============================================================================
// Database Query Helpers
// ============================================================================

/**
 * Get user by ID with role checking
 */
export async function getUserById(userId: string) {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}


/**
 * Get project with authorization check
 */
export async function getProjectById(projectId: string, userId: string): Promise<ProjectRow | null> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as ProjectRow;
}

/**
 * List user's projects
 */
export async function listProjects(userId: string, limit = 50, offset = 0) {
  const db = getSupabaseServerClient();
  const { data, error, count } = await db
    .from('projects')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { projects: data || [], total: count || 0 };
}

/**
 * Create project
 */
export async function createProject(
  userId: string,
  title: string,
  originalScript: string,
  voicePresetId: 'professional_narrator' | 'energetic_host' | 'calm_educator'
): Promise<ProjectRow> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('projects')
    .insert({
      user_id: userId,
      title,
      original_script: originalScript,
      voice_preset_id: voicePresetId,
      status: 'draft' as const,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ProjectRow;
}

/**
 * Update project status
 */
export async function updateProjectStatus(
  projectId: string,
  userId: string,
  status: 'draft' | 'processing' | 'ready' | 'rendering' | 'completed' | 'failed'
): Promise<ProjectRow> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('projects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as ProjectRow;
}

/**
 * Get segments for project
 */
export async function getProjectSegments(projectId: string, userId: string): Promise<SegmentRow[]> {
  const db = getSupabaseServerClient();
  const { data: project, error: projectError } = await db
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (projectError) throw projectError;
  if (!project) return [];

  const { data, error } = await db
    .from('segments')
    .select('*')
    .eq('project_id', projectId)
    .order('segment_number', { ascending: true });

  if (error) throw error;
  return (data || []) as SegmentRow[];
}

/**
 * Update segment
 */
export async function updateSegment(
  segmentId: string,
  projectId: string,
  userId: string,
  updates: Partial<SegmentRow>
): Promise<SegmentRow> {
  const db = getSupabaseServerClient();

  // Verify authorization
  const { data: project } = await db
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (!project) throw new Error('Unauthorized');

  const { data, error } = await db
    .from('segments')
    .update(updates)
    .eq('id', segmentId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data as SegmentRow;
}

/**
 * Create segments from optimization pipeline
 */
export async function createSegments(
  projectId: string,
  segments: Array<{ text: string; estimated_duration: number }>
): Promise<SegmentRow[]> {
  const db = getSupabaseServerClient();

  const segmentData = segments.map((seg, index) => ({
    project_id: projectId,
    segment_number: index + 1,
    original_text: seg.text,
    optimized_text: seg.text,
    duration: 0,
    estimated_duration: seg.estimated_duration,
    asset_status: 'needs_selection' as const,
    placeholder_color: '#E5E7EB',
  }));

  const { data, error } = await db.from('segments').insert(segmentData).select();

  if (error) throw error;
  return (data || []) as SegmentRow[];
}

/**
 * Get asset by ID
 */
export async function getAssetById(assetId: string): Promise<AssetRow | null> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as AssetRow;
}

/**
 * Search stock assets (global cache or project-specific)
 */
export async function searchAssets(searchText: string, duration: number, limit = 3) {
  const db = getSupabaseServerClient();

  // Build query for stock assets that haven't expired
  let query = db
    .from('assets')
    .select('*')
    .eq('source_type', 'stock')
    .or('expires_at.is.null,expires_at.gt.now()');

  const { data, error } = await query
    .limit(limit)
    .order('quality_score', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Create or update asset in global cache
 */
export async function cacheAsset(assetData: Omit<AssetRow, 'id' | 'created_at' | 'expires_at'>) {
  const db = getSupabaseServerClient();

  // Check if already cached by provider ID
  let query = db
    .from('assets')
    .select('id')
    .eq('provider_asset_id', assetData.provider_asset_id)
    .is('project_id', null); // Global cache

  if (assetData.provider) {
    query = query.eq('provider', assetData.provider);
  }

  const { data: existing } = await query.single();

  if (existing) return existing; // Already cached

  const { data, error } = await db
    .from('assets')
    .insert({
      ...assetData,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get TTS from cache
 */
export async function getTTSFromCache(
  textHash: string,
  voicePresetId: 'professional_narrator' | 'energetic_host' | 'calm_educator'
): Promise<TTSCacheRow | null> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('tts_cache')
    .select('*')
    .eq('text_hash', textHash)
    .eq('voice_preset_id', voicePresetId)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as TTSCacheRow) || null;
}

/**
 * Cache TTS audio
 */
export async function cacheTTS(
  textHash: string,
  voicePresetId: 'professional_narrator' | 'energetic_host' | 'calm_educator',
  audioUrl: string,
  durationSeconds: number
): Promise<TTSCacheRow> {
  const db = getSupabaseServerClient();

  const { data, error } = await db
    .from('tts_cache')
    .insert({
      text_hash: textHash,
      voice_preset_id: voicePresetId,
      audio_url: audioUrl,
      duration_seconds: durationSeconds,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    })
    .select()
    .single();

  if (error) throw error;
  return data as TTSCacheRow;
}

/**
 * Create render job
 */
export async function createRender(projectId: string): Promise<RenderRow> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('renders')
    .insert({
      project_id: projectId,
      status: 'queued' as const,
    })
    .select()
    .single();

  if (error) throw error;
  return data as RenderRow;
}

/**
 * Update render job
 */
export async function updateRender(
  renderId: string,
  updates: Partial<RenderRow>
): Promise<RenderRow> {
  const db = getSupabaseServerClient();
  const updateData: Partial<RenderRow> = { ...updates };

  // Auto-set completed_at for terminal statuses
  if (updates.status === 'completed' || updates.status === 'failed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await db
    .from('renders')
    .update(updateData)
    .eq('id', renderId)
    .select()
    .single();

  if (error) throw error;
  return data as RenderRow;
}

/**
 * Get renders for project
 */
export async function getProjectRenders(projectId: string, userId: string) {
  const db = getSupabaseServerClient();

  // Verify authorization
  const { data: project } = await db
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (!project) throw new Error('Unauthorized');

  const { data, error } = await db
    .from('renders')
    .select('*')
    .eq('project_id', projectId)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Log job execution
 */
export async function logJob(
  projectId: string,
  jobType: 'optimization' | 'assets' | 'tts' | 'render',
  status: 'pending' | 'running' | 'success' | 'failed',
  metadata?: Json,
  errorMessage?: string
): Promise<void> {
  const db = getSupabaseServerClient();
  const { error } = await db.from('job_logs').insert({
    project_id: projectId,
    job_type: jobType,
    status,
    metadata: metadata || {},
    error_message: errorMessage || null,
  });

  if (error) throw error;
}

/**
 * Get single segment by ID with authorization check
 */
export async function getSegmentById(
  segmentId: string,
  projectId: string,
  userId: string
): Promise<SegmentRow | null> {
  const db = getSupabaseServerClient();

  // Verify authorization
  const { data: project } = await db
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (!project) return null;

  const { data, error } = await db
    .from('segments')
    .select('*')
    .eq('id', segmentId)
    .eq('project_id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as SegmentRow;
}

/**
 * Get assets for a segment (suggestions)
 */
export async function getSegmentAssets(segmentId: string): Promise<AssetRow[]> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('assets')
    .select('*')
    .eq('segment_id', segmentId)
    .order('quality_score', { ascending: false });

  if (error) throw error;
  return (data || []) as AssetRow[];
}

/**
 * Select asset for segment
 */
export async function selectAssetForSegment(
  segmentId: string,
  projectId: string,
  userId: string,
  assetId: string,
  speedAdjusted: boolean,
  speedFactor: number | null
): Promise<SegmentRow> {
  const db = getSupabaseServerClient();

  // Verify authorization
  const { data: project } = await db
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (!project) throw new Error('Unauthorized');

  const { data, error } = await db
    .from('segments')
    .update({
      selected_asset_id: assetId,
      asset_status: 'has_asset' as const,
      speed_adjusted: speedAdjusted,
      speed_factor: speedFactor,
    })
    .eq('id', segmentId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data as SegmentRow;
}

/**
 * Set segment as placeholder
 */
export async function setSegmentPlaceholder(
  segmentId: string,
  projectId: string,
  userId: string,
  color: string
): Promise<SegmentRow> {
  const db = getSupabaseServerClient();

  // Verify authorization
  const { data: project } = await db
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (!project) throw new Error('Unauthorized');

  const { data, error } = await db
    .from('segments')
    .update({
      asset_status: 'placeholder' as const,
      placeholder_color: color,
      selected_asset_id: null,
      speed_adjusted: false,
      speed_factor: null,
    })
    .eq('id', segmentId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data as SegmentRow;
}

/**
 * Set segment as silent
 */
export async function setSegmentSilence(
  segmentId: string,
  projectId: string,
  userId: string,
  isSilent: boolean,
  silentDuration: number | null
): Promise<SegmentRow> {
  const db = getSupabaseServerClient();

  // Verify authorization
  const { data: project } = await db
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (!project) throw new Error('Unauthorized');

  const { data, error } = await db
    .from('segments')
    .update({
      is_silent: isSilent,
      silent_duration: silentDuration,
    })
    .eq('id', segmentId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data as SegmentRow;
}

/**
 * Update segment text
 */
export async function updateSegmentText(
  segmentId: string,
  projectId: string,
  userId: string,
  optimizedText: string
): Promise<SegmentRow> {
  const db = getSupabaseServerClient();

  // Verify authorization
  const { data: project } = await db
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (!project) throw new Error('Unauthorized');

  const { data, error } = await db
    .from('segments')
    .update({
      optimized_text: optimizedText,
    })
    .eq('id', segmentId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data as SegmentRow;
}

/**
 * Get storyboard summary for a project
 */
export async function getStoryboardSummary(projectId: string, userId: string): Promise<{
  totalSegments: number;
  placeholderCount: number;
  hasAssetCount: number;
  needsSelectionCount: number;
  estimatedTotalDuration: number;
  silentSegments: number;
}> {
  const db = getSupabaseServerClient();

  // Verify authorization
  const { data: project } = await db
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (!project) throw new Error('Unauthorized');

  const { data: segments, error } = await db
    .from('segments')
    .select('asset_status, estimated_duration, is_silent, silent_duration')
    .eq('project_id', projectId);

  if (error) throw error;

  const totalSegments = segments?.length || 0;
  let placeholderCount = 0;
  let hasAssetCount = 0;
  let needsSelectionCount = 0;
  let estimatedTotalDuration = 0;
  let silentSegments = 0;

  for (const seg of segments || []) {
    if (seg.asset_status === 'placeholder') placeholderCount++;
    else if (seg.asset_status === 'has_asset') hasAssetCount++;
    else needsSelectionCount++;

    if (seg.is_silent) {
      silentSegments++;
      estimatedTotalDuration += seg.silent_duration || 0;
    } else {
      estimatedTotalDuration += seg.estimated_duration || 0;
    }
  }

  return {
    totalSegments,
    placeholderCount,
    hasAssetCount,
    needsSelectionCount,
    estimatedTotalDuration,
    silentSegments,
  };
}

