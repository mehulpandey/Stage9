/**
 * Supabase Database Client
 * Centralized database access with type safety
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

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
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return data || null;
}

/**
 * Create new user
 */
export async function createUser(email: string) {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('users')
    .insert([{ email, plan_type: 'free' }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get project with authorization check
 */
export async function getProjectById(projectId: string, userId: string) {
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
  return data;
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
export async function createProject(userId: string, title: string, originalScript: string, voicePresetId: string) {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('projects')
    .insert([
      {
        user_id: userId,
        title,
        original_script: originalScript,
        voice_preset_id: voicePresetId,
        status: 'draft',
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update project status
 */
export async function updateProjectStatus(projectId: string, userId: string, status: string) {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('projects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get segments for project
 */
export async function getProjectSegments(projectId: string, userId: string) {
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
  return data || [];
}

/**
 * Update segment
 */
export async function updateSegment(
  segmentId: string,
  projectId: string,
  userId: string,
  updates: Record<string, unknown>
) {
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
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', segmentId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create segments from optimization pipeline
 */
export async function createSegments(projectId: string, segments: any[]) {
  const db = getSupabaseServerClient();

  const segmentData = segments.map((seg, index) => ({
    project_id: projectId,
    segment_number: index + 1,
    original_text: seg.text,
    optimized_text: seg.text,
    duration: 0,
    estimated_duration: seg.estimated_duration,
    asset_status: 'needs_selection',
    placeholder_color: '#E5E7EB',
  }));

  const { data, error } = await db.from('segments').insert(segmentData).select();

  if (error) throw error;
  return data || [];
}

/**
 * Get asset by ID
 */
export async function getAssetById(assetId: string) {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .single();

  if (error) throw error;
  return data;
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
export async function cacheAsset(assetData: any) {
  const db = getSupabaseServerClient();

  // Check if already cached by provider ID
  const { data: existing } = await db
    .from('assets')
    .select('id')
    .eq('provider_asset_id', assetData.provider_asset_id)
    .eq('provider', assetData.provider)
    .eq('project_id', null) // Global cache
    .single();

  if (existing) return existing; // Already cached

  const { data, error } = await db
    .from('assets')
    .insert([
      {
        ...assetData,
        project_id: null, // Global cache
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get TTS from cache
 */
export async function getTTSFromCache(textHash: string, voicePresetId: string) {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('tts_cache')
    .select('*')
    .eq('text_hash', textHash)
    .eq('voice_preset_id', voicePresetId)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Cache TTS audio
 */
export async function cacheTTS(textHash: string, voicePresetId: string, audioUrl: string, durationSeconds: number) {
  const db = getSupabaseServerClient();

  const { data, error } = await db
    .from('tts_cache')
    .insert([
      {
        text_hash: textHash,
        voice_preset_id: voicePresetId,
        audio_url: audioUrl,
        duration_seconds: durationSeconds,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create render job
 */
export async function createRender(projectId: string) {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('renders')
    .insert([
      {
        project_id: projectId,
        status: 'queued',
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update render job
 */
export async function updateRender(renderId: string, updates: Record<string, unknown>) {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from('renders')
    .update({ ...updates, completed_at: updates.status === 'completed' || updates.status === 'failed' ? new Date().toISOString() : null })
    .eq('id', renderId)
    .select()
    .single();

  if (error) throw error;
  return data;
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
export async function logJob(projectId: string, jobType: string, status: string, metadata?: Record<string, unknown>, errorMessage?: string) {
  const db = getSupabaseServerClient();
  const { error } = await db.from('job_logs').insert([
    {
      project_id: projectId,
      job_type: jobType,
      status,
      metadata: metadata || {},
      error_message: errorMessage,
    },
  ]);

  if (error) throw error;
}
