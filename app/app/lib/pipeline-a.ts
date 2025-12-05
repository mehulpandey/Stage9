/**
 * Pipeline A: Script Optimization Service
 *
 * Orchestrates the full script optimization workflow:
 * 1. Validate script length
 * 2. Check content moderation
 * 3. Segment script (LLM)
 * 4. Optimize each segment (LLM)
 * 5. Generate visual queries for each segment (LLM)
 * 6. Score quality (LLM)
 * 7. Save segments to database
 * 8. Update project status to 'ready'
 */

import { createClient } from '@supabase/supabase-js'
import {
  moderateContent,
  segmentScript,
  optimizeSegment,
  generateVisualQueries,
  scoreQuality,
  validateScriptLength,
  autoOptimizeScript,
  getQualityLevel,
  type Segment,
  type QualityScore
} from './llm'
import { runPipelineB } from './pipeline-b'

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineAResult {
  success: boolean
  projectId: string
  status: 'ready' | 'failed'
  segments?: ProcessedSegment[]
  qualityScore?: QualityScore
  error?: string
  moderation?: {
    flagged: boolean
    categories: string[]
  }
}

export interface ProcessedSegment {
  segmentNumber: number
  originalText: string
  optimizedText: string
  estimatedDuration: number
  energy: number
  intent: string
  searchQueries: string[]
  fallbackQuery: string
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// ============================================================================
// PIPELINE A MAIN FUNCTION
// ============================================================================

/**
 * Run the full Pipeline A workflow for a project
 * This should be called when a project is created
 */
export async function runPipelineA(projectId: string): Promise<PipelineAResult> {
  const supabase = getSupabaseServiceClient()

  try {
    console.log(`[Pipeline A] Starting optimization for project ${projectId}`)

    // 1. Fetch the project
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (fetchError || !project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    const originalScript = project.original_script

    // 2. Update project status to 'processing'
    await supabase
      .from('projects')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', projectId)

    console.log(`[Pipeline A] Project status set to 'processing'`)

    // 3. Validate script length
    const lengthValidation = validateScriptLength(originalScript)
    console.log(`[Pipeline A] Script length: ${lengthValidation.wordCount} words, status: ${lengthValidation.status}`)

    // 4. Check content moderation
    const moderation = await moderateContent(originalScript)
    if (moderation.flagged) {
      console.log(`[Pipeline A] Content flagged: ${moderation.categories.join(', ')}`)

      // Update project to failed status
      await supabase
        .from('projects')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)

      return {
        success: false,
        projectId,
        status: 'failed',
        error: `Content moderation failed: ${moderation.categories.join(', ')}`,
        moderation
      }
    }

    console.log(`[Pipeline A] Content moderation passed`)

    // 5. Segment the script
    console.log(`[Pipeline A] Segmenting script...`)
    const segments = await segmentScript(originalScript)
    console.log(`[Pipeline A] Created ${segments.length} segments`)

    // 6. Optimize each segment and generate visual queries
    console.log(`[Pipeline A] Optimizing segments...`)
    const processedSegments: ProcessedSegment[] = []

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]

      // Optimize text
      const optimizedText = await optimizeSegment(
        segment.text,
        segment.est_duration_hint,
        segment.energy
      )

      // Generate visual queries
      const visualQueries = await generateVisualQueries(optimizedText)

      processedSegments.push({
        segmentNumber: i + 1,
        originalText: segment.text,
        optimizedText,
        estimatedDuration: segment.est_duration_hint,
        energy: segment.energy,
        intent: segment.intent,
        searchQueries: visualQueries.queries,
        fallbackQuery: visualQueries.fallback
      })

      console.log(`[Pipeline A] Segment ${i + 1}/${segments.length} processed`)
    }

    // 7. Score quality
    const fullOptimizedScript = processedSegments.map(s => s.optimizedText).join('\n\n')
    console.log(`[Pipeline A] Scoring quality...`)
    const qualityScore = await scoreQuality(fullOptimizedScript)
    console.log(`[Pipeline A] Quality score: ${qualityScore.overall} (${getQualityLevel(qualityScore.overall)})`)

    // 8. Save segments to database (including search queries for Pipeline B)
    console.log(`[Pipeline A] Saving segments to database...`)
    const segmentInserts = processedSegments.map(seg => ({
      project_id: projectId,
      segment_number: seg.segmentNumber,
      original_text: seg.originalText,
      optimized_text: seg.optimizedText,
      duration: seg.estimatedDuration,
      estimated_duration: seg.estimatedDuration,
      search_queries: seg.searchQueries,
      fallback_query: seg.fallbackQuery,
      asset_status: 'needs_selection',
      placeholder_color: '#1a1a1a',
      speed_adjusted: false,
      is_silent: false,
      created_at: new Date().toISOString()
    }))

    const { error: insertError } = await supabase
      .from('segments')
      .insert(segmentInserts)

    if (insertError) {
      throw new Error(`Failed to save segments: ${insertError.message}`)
    }

    // 9. Run Pipeline B to fetch stock assets for each segment
    console.log(`[Pipeline A] Starting Pipeline B for asset fetching...`)
    const pipelineBResult = await runPipelineB(projectId)

    if (!pipelineBResult.success) {
      console.warn(`[Pipeline A] Pipeline B had issues: ${pipelineBResult.errors.join(', ')}`)
      // Note: We continue even if some assets failed - placeholders will be used
    }

    console.log(`[Pipeline A] Pipeline B complete: ${pipelineBResult.assetsFound} assets found, ${pipelineBResult.placeholderCount} placeholders`)

    // 10. Update project with optimized script and quality scores
    await supabase
      .from('projects')
      .update({
        status: 'ready',
        optimized_script: fullOptimizedScript,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    console.log(`[Pipeline A] Optimization complete! Project status set to 'ready'`)

    return {
      success: true,
      projectId,
      status: 'ready',
      segments: processedSegments,
      qualityScore
    }

  } catch (error) {
    console.error(`[Pipeline A] Error:`, error)

    // Update project to failed status
    await supabase
      .from('projects')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    return {
      success: false,
      projectId,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// ============================================================================
// AUTO-OPTIMIZE RETRY
// ============================================================================

/**
 * Attempt to auto-optimize a project's script based on quality feedback
 * Limited to 3 attempts
 */
export async function runAutoOptimize(
  projectId: string,
  attemptNumber: number = 1
): Promise<PipelineAResult> {
  const MAX_ATTEMPTS = 3

  if (attemptNumber > MAX_ATTEMPTS) {
    return {
      success: false,
      projectId,
      status: 'failed',
      error: `Auto-optimize failed after ${MAX_ATTEMPTS} attempts. Consider manual editing.`
    }
  }

  const supabase = getSupabaseServiceClient()

  try {
    console.log(`[Auto-Optimize] Attempt ${attemptNumber}/${MAX_ATTEMPTS} for project ${projectId}`)

    // Fetch current project
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (fetchError || !project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    const currentScript = project.optimized_script || project.original_script

    // Score current quality
    const currentScore = await scoreQuality(currentScript)
    console.log(`[Auto-Optimize] Current score: ${currentScore.overall}`)

    // If already good, no need to optimize
    if (currentScore.overall >= 75) {
      console.log(`[Auto-Optimize] Score already good, no optimization needed`)
      return {
        success: true,
        projectId,
        status: 'ready',
        qualityScore: currentScore
      }
    }

    // Run auto-optimization
    const improvedScript = await autoOptimizeScript(currentScript, currentScore.suggestions)

    // Score the improved version
    const newScore = await scoreQuality(improvedScript)
    console.log(`[Auto-Optimize] New score: ${newScore.overall}`)

    // If improved, update the script
    if (newScore.overall > currentScore.overall) {
      // Delete existing segments
      await supabase
        .from('segments')
        .delete()
        .eq('project_id', projectId)

      // Re-run pipeline with improved script
      await supabase
        .from('projects')
        .update({
          original_script: improvedScript,
          optimized_script: null,
          status: 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)

      // Run full pipeline again
      return runPipelineA(projectId)
    }

    // If not improved, try again
    if (attemptNumber < MAX_ATTEMPTS) {
      return runAutoOptimize(projectId, attemptNumber + 1)
    }

    // Max attempts reached
    return {
      success: false,
      projectId,
      status: 'failed',
      error: `Auto-optimize couldn't improve score after ${MAX_ATTEMPTS} attempts. Score: ${newScore.overall}. Consider manual editing.`,
      qualityScore: newScore
    }

  } catch (error) {
    console.error(`[Auto-Optimize] Error:`, error)
    return {
      success: false,
      projectId,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// ============================================================================
// PREVIEW OPTIMIZATION
// ============================================================================

/**
 * Preview script optimization without saving to database
 * Returns side-by-side comparison of original vs optimized
 */
export async function previewOptimization(
  script: string
): Promise<{
  original: string
  optimized: string
  segments: Segment[]
  qualityScore: QualityScore
}> {
  // Segment the script
  const segments = await segmentScript(script)

  // Optimize each segment
  const optimizedTexts: string[] = []
  for (const segment of segments) {
    const optimized = await optimizeSegment(
      segment.text,
      segment.est_duration_hint,
      segment.energy
    )
    optimizedTexts.push(optimized)
  }

  const optimizedScript = optimizedTexts.join('\n\n')

  // Score quality
  const qualityScore = await scoreQuality(optimizedScript)

  return {
    original: script,
    optimized: optimizedScript,
    segments,
    qualityScore
  }
}
