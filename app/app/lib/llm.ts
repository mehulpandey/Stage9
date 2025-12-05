/**
 * LLM Utilities for Script Optimization Pipeline
 * Uses OpenAI gpt-4o-mini for all LLM operations
 */

import OpenAI from 'openai'

// ============================================================================
// CONFIGURATION
// ============================================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_TEMPERATURE = 0.3
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// ============================================================================
// TYPES
// ============================================================================

export interface Segment {
  text: string
  energy: number
  intent: 'hook' | 'explain' | 'transition' | 'conclude'
  est_duration_hint: number
  search_queries?: string[]
  fallback_query?: string
}

export interface QualityScore {
  clarity: number
  pacing: number
  hook: number
  overall: number
  suggestions: string[]
}

export interface ModerationResult {
  flagged: boolean
  categories: string[]
}

export interface VisualQueries {
  queries: string[]
  fallback: string
}

// ============================================================================
// CORE LLM FUNCTION
// ============================================================================

/**
 * Call OpenAI LLM with retry logic
 */
export async function callLLM(
  systemMessage: string,
  userMessage: string,
  options: {
    maxTokens?: number
    temperature?: number
    model?: string
  } = {}
): Promise<string> {
  const {
    maxTokens = 2000,
    temperature = DEFAULT_TEMPERATURE,
    model = DEFAULT_MODEL
  } = options

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('Empty response from LLM')
      }

      // Log token usage for cost tracking
      console.log(`[LLM] Tokens used: prompt=${response.usage?.prompt_tokens}, completion=${response.usage?.completion_tokens}`)

      return content
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`[LLM] Attempt ${attempt} failed:`, lastError.message)

      if (attempt < MAX_RETRIES) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)))
      }
    }
  }

  throw lastError || new Error('LLM call failed after retries')
}

/**
 * Parse JSON from LLM response (handles markdown code blocks)
 */
function parseJsonResponse<T>(response: string): T {
  // Remove markdown code blocks if present
  let cleaned = response.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }

  return JSON.parse(cleaned.trim())
}

// ============================================================================
// CONTENT MODERATION
// ============================================================================

/**
 * Content moderation thresholds
 * Only block truly severe content - educational/historical/mythological content should pass
 * OpenAI moderation scores range from 0 to 1
 *
 * We use HIGH thresholds (0.8+) because:
 * - Educational content about history/mythology often mentions violence
 * - YouTube allows this type of content
 * - We only want to block genuinely harmful content
 */
const MODERATION_THRESHOLDS = {
  // Always block at any score
  'sexual/minors': 0.01,
  'self-harm/intent': 0.3,
  'self-harm/instructions': 0.3,

  // Block only at high scores (truly graphic/promoting content)
  'hate/threatening': 0.7,
  'violence/graphic': 0.7,

  // Very high threshold - educational violence is fine
  'violence': 0.85,
  'hate': 0.8,
  'harassment/threatening': 0.7,
  'harassment': 0.8,
  'self-harm': 0.6,
  'sexual': 0.7,
}

/**
 * Check content for moderation flags using OpenAI Moderation API
 * Uses score thresholds to avoid blocking educational/historical content
 */
export async function moderateContent(text: string): Promise<ModerationResult> {
  try {
    const response = await openai.moderations.create({
      input: text,
    })

    const result = response.results[0]
    const flaggedCategories: string[] = []
    const scores = result.category_scores

    // Check each category against our thresholds
    for (const [category, threshold] of Object.entries(MODERATION_THRESHOLDS)) {
      const score = scores[category as keyof typeof scores]
      if (score !== undefined && score >= threshold) {
        flaggedCategories.push(category)
        console.log(`[Moderation] Category "${category}" flagged: score=${score.toFixed(3)}, threshold=${threshold}`)
      }
    }

    // Log all scores for debugging
    console.log('[Moderation] Scores:', JSON.stringify(scores, null, 2))

    return {
      flagged: flaggedCategories.length > 0,
      categories: flaggedCategories,
    }
  } catch (error) {
    console.error('[Moderation] Error:', error)
    // On error, allow content through but log warning
    return { flagged: false, categories: [] }
  }
}

// ============================================================================
// SCRIPT SEGMENTATION
// ============================================================================

const SEGMENTATION_SYSTEM = `You are a video script analyzer. Break scripts into segments for video production.
Each segment should be 15-30 seconds of spoken content.
Identify the energy level and intent of each segment.`

const SEGMENTATION_USER = (script: string) => `Analyze this script and break it into segments:

${script}

Return JSON array with this structure:
[
  {
    "text": "segment text",
    "energy": 0-100,
    "intent": "hook|explain|transition|conclude",
    "est_duration_hint": seconds
  }
]`

/**
 * Segment a script into individual video segments
 */
export async function segmentScript(script: string): Promise<Segment[]> {
  const response = await callLLM(
    SEGMENTATION_SYSTEM,
    SEGMENTATION_USER(script),
    { maxTokens: 4000 }
  )

  const segments = parseJsonResponse<Segment[]>(response)

  // Validate segments
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error('Invalid segmentation response: expected array of segments')
  }

  // Ensure each segment has required fields
  return segments.map((seg, index) => ({
    text: seg.text || '',
    energy: Math.min(100, Math.max(0, seg.energy || 50)),
    intent: ['hook', 'explain', 'transition', 'conclude'].includes(seg.intent)
      ? seg.intent
      : 'explain',
    est_duration_hint: seg.est_duration_hint || 20,
  }))
}

// ============================================================================
// SCRIPT OPTIMIZATION
// ============================================================================

const REWRITE_SYSTEM = `You are a script editor optimizing text for spoken video narration.
Make text conversational, punchy, and engaging while preserving meaning.
Shorten long sentences. Add verbal hooks. Maintain the author's voice.`

const REWRITE_USER = (segmentText: string, targetDuration: number, energy: number) =>
`Rewrite this segment for video narration:

Original: ${segmentText}

Requirements:
- Keep under ${targetDuration} seconds when spoken
- Maintain original meaning
- Make it more engaging and conversational
- Energy level: ${energy}/100

Return only the rewritten text.`

/**
 * Optimize a single segment's text for video narration
 */
export async function optimizeSegment(
  segmentText: string,
  targetDuration: number,
  energy: number
): Promise<string> {
  const response = await callLLM(
    REWRITE_SYSTEM,
    REWRITE_USER(segmentText, targetDuration, energy),
    { maxTokens: 500 }
  )

  return response.trim()
}

/**
 * Optimize all segments in a script
 */
export async function optimizeScript(segments: Segment[]): Promise<string[]> {
  const optimizedTexts: string[] = []

  for (const segment of segments) {
    const optimized = await optimizeSegment(
      segment.text,
      segment.est_duration_hint,
      segment.energy
    )
    optimizedTexts.push(optimized)
  }

  return optimizedTexts
}

// ============================================================================
// VISUAL QUERY GENERATION
// ============================================================================

const VISUAL_QUERY_SYSTEM = `You are a video editor generating stock footage search queries.
Create specific, visual search terms that will find relevant B-roll footage.`

const VISUAL_QUERY_USER = (segmentText: string) => `Generate 3 stock footage search queries for this narration:

"${segmentText}"

Requirements:
- 3-6 words per query
- Visual and specific (not abstract concepts)
- Suitable for Pexels/Pixabay search
- Prefer video clips over static images

Also provide 1 fallback descriptive phrase.

Return JSON:
{
  "queries": ["query1", "query2", "query3"],
  "fallback": "descriptive phrase"
}`

/**
 * Generate visual search queries for a segment
 */
export async function generateVisualQueries(segmentText: string): Promise<VisualQueries> {
  const response = await callLLM(
    VISUAL_QUERY_SYSTEM,
    VISUAL_QUERY_USER(segmentText),
    { maxTokens: 300 }
  )

  const result = parseJsonResponse<VisualQueries>(response)

  // Validate and ensure we have at least some queries
  if (!result.queries || !Array.isArray(result.queries) || result.queries.length === 0) {
    // Fallback: generate simple queries from the text
    const words = segmentText.split(' ').filter(w => w.length > 4).slice(0, 3)
    return {
      queries: [words.join(' '), 'generic footage', 'background video'],
      fallback: 'abstract background'
    }
  }

  return {
    queries: result.queries.slice(0, 3),
    fallback: result.fallback || 'generic footage'
  }
}

// ============================================================================
// QUALITY SCORING
// ============================================================================

const VALIDATION_SYSTEM = `You are a script quality analyzer for video production.
Score scripts on clarity, pacing, and hook effectiveness.`

const VALIDATION_USER = (optimizedScript: string) => `Analyze this optimized script and provide quality scores:

${optimizedScript}

Score 0-100 on:
- Clarity: Is it easy to understand?
- Pacing: Good rhythm and flow?
- Hook: Does it grab attention?

Return JSON:
{
  "clarity": score,
  "pacing": score,
  "hook": score,
  "overall": average_score,
  "suggestions": ["suggestion1", "suggestion2"]
}`

/**
 * Score the quality of an optimized script
 * Returns scores for clarity, pacing, hook, and overall
 *
 * Quality thresholds:
 * - >= 75: Green (proceed)
 * - 60-74: Yellow (warning with tips)
 * - < 60: Red (require confirmation)
 */
export async function scoreQuality(optimizedScript: string): Promise<QualityScore> {
  const response = await callLLM(
    VALIDATION_SYSTEM,
    VALIDATION_USER(optimizedScript),
    { maxTokens: 500 }
  )

  const result = parseJsonResponse<QualityScore>(response)

  // Validate and clamp scores
  const clarity = Math.min(100, Math.max(0, result.clarity || 50))
  const pacing = Math.min(100, Math.max(0, result.pacing || 50))
  const hook = Math.min(100, Math.max(0, result.hook || 50))

  // Calculate overall using weighted formula: (clarity * 0.4) + (pacing * 0.35) + (hook * 0.25)
  const overall = Math.round((clarity * 0.4) + (pacing * 0.35) + (hook * 0.25))

  return {
    clarity,
    pacing,
    hook,
    overall,
    suggestions: Array.isArray(result.suggestions) ? result.suggestions.slice(0, 5) : []
  }
}

/**
 * Get quality level based on score
 */
export function getQualityLevel(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 75) return 'green'
  if (score >= 60) return 'yellow'
  return 'red'
}

// ============================================================================
// SCRIPT LENGTH VALIDATION
// ============================================================================

/**
 * Validate script length and return recommendations
 */
export function validateScriptLength(script: string): {
  wordCount: number
  charCount: number
  estimatedDuration: number
  status: 'too_short' | 'optimal' | 'too_long'
  message: string
} {
  const words = script.trim().split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length
  const charCount = script.length

  // Estimate duration: ~150 words per minute for narration
  const estimatedDuration = Math.round(wordCount / 150 * 60)

  let status: 'too_short' | 'optimal' | 'too_long'
  let message: string

  if (wordCount < 300) {
    status = 'too_short'
    message = `Your script is quite short (${wordCount} words). Consider expanding it for a more engaging video, or proceed with a shorter video.`
  } else if (wordCount > 5000) {
    status = 'too_long'
    message = `Your script is quite long (${wordCount} words). Consider trimming it for optimal viewer engagement, or proceed with a longer video.`
  } else {
    status = 'optimal'
    message = `Script length is optimal (${wordCount} words, ~${Math.round(estimatedDuration / 60)} minutes).`
  }

  return {
    wordCount,
    charCount,
    estimatedDuration,
    status,
    message
  }
}

// ============================================================================
// AUTO-OPTIMIZE
// ============================================================================

const AUTO_OPTIMIZE_SYSTEM = `You are an expert script editor. Improve this script based on quality feedback.
Focus on the specific areas mentioned in the suggestions.
Make targeted improvements without changing the overall structure or meaning.`

const AUTO_OPTIMIZE_USER = (script: string, suggestions: string[]) =>
`Improve this script based on the following feedback:

Script:
${script}

Suggestions to address:
${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Return only the improved script text.`

/**
 * Auto-optimize script based on quality score suggestions
 * Will attempt up to 3 times to improve the score
 */
export async function autoOptimizeScript(
  script: string,
  suggestions: string[]
): Promise<string> {
  if (suggestions.length === 0) {
    return script
  }

  const response = await callLLM(
    AUTO_OPTIMIZE_SYSTEM,
    AUTO_OPTIMIZE_USER(script, suggestions),
    { maxTokens: 4000 }
  )

  return response.trim()
}
