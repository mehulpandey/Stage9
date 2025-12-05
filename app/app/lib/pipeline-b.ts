/**
 * Pipeline B: Stock Asset Fetching & Ranking
 *
 * For each segment:
 * 1. Get search queries (generated during Pipeline A)
 * 2. Search Pexels and Pixabay
 * 3. Rank candidates using weighted algorithm
 * 4. Select top 3 and store in database
 * 5. If all fail, set as placeholder with fallback query
 */

import { searchAndRankAssets, RankedAsset } from './stock'
import { getSupabaseServerClient } from './database'
import { SegmentRow } from './database.types'

// Extended segment type that includes new columns from migrations
interface SegmentWithQueries extends SegmentRow {
  search_queries?: string[] | null
  fallback_query?: string | null
}

interface SegmentForPipelineB {
  id: string
  segment_number: number
  optimized_text: string
  estimated_duration: number
  search_queries: string[] | null
  fallback_query: string | null
}

interface PipelineBResult {
  success: boolean
  segmentId: string
  assetsFound: number
  assetIds: string[]
  isPlaceholder: boolean
  error?: string
}

/**
 * Save ranked assets to database for a segment
 */
async function saveAssetsForSegment(
  projectId: string,
  segmentId: string,
  assets: RankedAsset[]
): Promise<string[]> {
  const db = getSupabaseServerClient()
  const assetIds: string[] = []

  // Delete existing assets for this segment first
  await db
    .from('assets')
    .delete()
    .eq('segment_id', segmentId)

  // Insert new assets
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]

    const { data, error } = await db
      .from('assets')
      .insert({
        project_id: projectId,
        segment_id: segmentId,
        source_type: 'stock',
        provider: asset.provider,
        provider_asset_id: asset.providerAssetId,
        asset_type: asset.assetType,
        duration: asset.duration,
        url: asset.url,
        thumbnail_url: asset.thumbnailUrl,
        aspect_ratio: asset.aspectRatio,
        orientation: asset.orientation,
        metadata_json: asset.metadata,
        is_ranked: true,
        rank_position: i + 1,
        ranking_score: asset.rankingScore,
        keyword_score: asset.keywordScore,
        duration_score: asset.durationScore,
        orientation_score: asset.orientationScore,
        quality_score: asset.qualityScore,
        width: asset.width,
        height: asset.height,
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      })
      .select('id')
      .single()

    if (error) {
      console.error(`[Pipeline B] Error saving asset: ${error.message}`)
      continue
    }

    if (data) {
      assetIds.push(data.id)
    }
  }

  return assetIds
}

/**
 * Update segment status after asset fetching
 */
async function updateSegmentAssetStatus(
  segmentId: string,
  status: 'has_asset' | 'needs_selection' | 'placeholder',
  selectedAssetId: string | null = null
): Promise<void> {
  const db = getSupabaseServerClient()

  await db
    .from('segments')
    .update({
      asset_status: status,
      selected_asset_id: selectedAssetId,
    })
    .eq('id', segmentId)
}

/**
 * Process a single segment - fetch and rank assets
 */
export async function processSegmentAssets(
  projectId: string,
  segment: SegmentForPipelineB
): Promise<PipelineBResult> {
  console.log(`[Pipeline B] Processing segment ${segment.segment_number} (${segment.id})`)

  // Get search queries
  let queries = segment.search_queries || []

  // If no queries, use fallback or generate from text
  if (queries.length === 0) {
    if (segment.fallback_query) {
      queries = [segment.fallback_query]
    } else {
      // Generate simple queries from first few words of text
      const words = segment.optimized_text.split(/\s+/).slice(0, 5).join(' ')
      queries = [words]
    }
  }

  console.log(`[Pipeline B] Using queries: ${queries.join(', ')}`)

  try {
    // Search and rank assets
    const rankedAssets = await searchAndRankAssets(
      queries,
      {
        segmentDuration: segment.estimated_duration,
        segmentText: segment.optimized_text,
        searchQuery: queries[0],
      },
      {
        minDuration: Math.max(3, segment.estimated_duration * 0.5),
        maxDuration: segment.estimated_duration * 2,
        perPage: 5,
        includePhotos: true,
      }
    )

    if (rankedAssets.length === 0) {
      console.log(`[Pipeline B] No assets found for segment ${segment.segment_number}, setting as placeholder`)

      // Update segment as needs selection (no assets)
      await updateSegmentAssetStatus(segment.id, 'needs_selection')

      return {
        success: true,
        segmentId: segment.id,
        assetsFound: 0,
        assetIds: [],
        isPlaceholder: true,
      }
    }

    // Save assets to database
    const assetIds = await saveAssetsForSegment(projectId, segment.id, rankedAssets)

    // Update segment status - needs_selection means user must pick from options
    await updateSegmentAssetStatus(segment.id, 'needs_selection')

    console.log(`[Pipeline B] Saved ${assetIds.length} assets for segment ${segment.segment_number}`)

    return {
      success: true,
      segmentId: segment.id,
      assetsFound: assetIds.length,
      assetIds,
      isPlaceholder: false,
    }
  } catch (error) {
    console.error(`[Pipeline B] Error processing segment ${segment.segment_number}:`, error)

    return {
      success: false,
      segmentId: segment.id,
      assetsFound: 0,
      assetIds: [],
      isPlaceholder: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Run Pipeline B for all segments of a project
 */
export async function runPipelineB(projectId: string): Promise<{
  success: boolean
  totalSegments: number
  processedSegments: number
  assetsFound: number
  placeholderCount: number
  errors: string[]
}> {
  console.log(`[Pipeline B] Starting for project ${projectId}`)

  const db = getSupabaseServerClient()

  // Fetch all segments with search queries
  // Note: search_queries column is added via migration 0004
  const { data: segmentsData, error: segmentsError } = await db
    .from('segments')
    .select('*')
    .eq('project_id', projectId)
    .order('segment_number')

  if (segmentsError) {
    console.error('[Pipeline B] Error fetching segments:', segmentsError)
    return {
      success: false,
      totalSegments: 0,
      processedSegments: 0,
      assetsFound: 0,
      placeholderCount: 0,
      errors: [segmentsError.message],
    }
  }

  if (!segmentsData || segmentsData.length === 0) {
    console.log('[Pipeline B] No segments found')
    return {
      success: true,
      totalSegments: 0,
      processedSegments: 0,
      assetsFound: 0,
      placeholderCount: 0,
      errors: [],
    }
  }

  // Map to our internal type (handles columns added via migration)
  const segments: SegmentForPipelineB[] = (segmentsData as unknown as SegmentWithQueries[]).map(s => ({
    id: s.id,
    segment_number: s.segment_number,
    optimized_text: s.optimized_text,
    estimated_duration: Number(s.estimated_duration),
    search_queries: s.search_queries || null,
    fallback_query: s.fallback_query || null,
  }))

  console.log(`[Pipeline B] Processing ${segments.length} segments`)

  const results: PipelineBResult[] = []
  const errors: string[] = []

  // Process segments sequentially (to avoid rate limit issues)
  for (const segment of segments) {
    const result = await processSegmentAssets(projectId, segment)
    results.push(result)

    if (!result.success && result.error) {
      errors.push(`Segment ${segment.segment_number}: ${result.error}`)
    }

    // Small delay between segments to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  const totalAssetsFound = results.reduce((sum, r) => sum + r.assetsFound, 0)
  const placeholderCount = results.filter(r => r.isPlaceholder).length

  console.log(`[Pipeline B] Complete: ${totalAssetsFound} assets found, ${placeholderCount} placeholders`)

  return {
    success: errors.length === 0,
    totalSegments: segments.length,
    processedSegments: results.filter(r => r.success).length,
    assetsFound: totalAssetsFound,
    placeholderCount,
    errors,
  }
}

/**
 * Regenerate assets for a single segment
 * Used when user wants to refresh suggestions
 */
export async function regenerateSegmentAssets(
  projectId: string,
  segmentId: string,
  userId: string
): Promise<PipelineBResult> {
  const db = getSupabaseServerClient()

  // Verify project ownership
  const { data: project, error: projectError } = await db
    .from('projects')
    .select('id, status')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (projectError || !project) {
    return {
      success: false,
      segmentId,
      assetsFound: 0,
      assetIds: [],
      isPlaceholder: false,
      error: 'Project not found or unauthorized',
    }
  }

  if (project.status !== 'ready') {
    return {
      success: false,
      segmentId,
      assetsFound: 0,
      assetIds: [],
      isPlaceholder: false,
      error: `Cannot regenerate assets for project in "${project.status}" status`,
    }
  }

  // Fetch the segment
  const { data: segmentData, error: segmentError } = await db
    .from('segments')
    .select('*')
    .eq('id', segmentId)
    .eq('project_id', projectId)
    .single()

  if (segmentError || !segmentData) {
    return {
      success: false,
      segmentId,
      assetsFound: 0,
      assetIds: [],
      isPlaceholder: false,
      error: 'Segment not found',
    }
  }

  // Map to our internal type (handles columns added via migration)
  const s = segmentData as unknown as SegmentWithQueries
  const segment: SegmentForPipelineB = {
    id: s.id,
    segment_number: s.segment_number,
    optimized_text: s.optimized_text,
    estimated_duration: Number(s.estimated_duration),
    search_queries: s.search_queries || null,
    fallback_query: s.fallback_query || null,
  }

  // Process the segment
  return processSegmentAssets(projectId, segment)
}
