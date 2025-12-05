/**
 * Asset Ranking Algorithm
 *
 * Implements weighted scoring formula:
 * SCORE = (K × 0.40) + (D × 0.30) + (O × 0.20) + (Q × 0.10)
 *
 * Where:
 * K = Keyword match (0-100)
 * D = Duration match (0-100)
 * O = Orientation match (0-100)
 * Q = Quality/popularity (0-100)
 */

import { StockAsset, RankedAsset, AssetRankingParams } from './types'

// Target aspect ratio for 16:9 video
const TARGET_ASPECT_RATIO = 16 / 9 // ~1.78

// Acceptable aspect ratio range (±20% of 16:9)
const MIN_ASPECT_RATIO = TARGET_ASPECT_RATIO * 0.8 // ~1.42
const MAX_ASPECT_RATIO = TARGET_ASPECT_RATIO * 1.2 // ~2.14

/**
 * Calculate keyword match score (0-100)
 *
 * - Perfect match (all query words in tags): 100
 * - Partial match (2+ keywords): 70-90
 * - Single keyword match: 40-60
 * - Conceptually relevant: 20-40
 * - No match: 0
 */
function calculateKeywordScore(asset: StockAsset, searchQuery: string): number {
  const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2)

  // Get asset tags/metadata for matching
  const assetTags = (asset.metadata?.tags as string || '')
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(t => t.length > 2)

  const assetQuery = (asset.metadata?.query as string || '').toLowerCase()

  if (queryWords.length === 0) {
    return 50 // Default score if no query words
  }

  // Count matching keywords
  let matchCount = 0
  for (const word of queryWords) {
    if (assetTags.some(tag => tag.includes(word) || word.includes(tag))) {
      matchCount++
    } else if (assetQuery.includes(word)) {
      matchCount++
    }
  }

  const matchRatio = matchCount / queryWords.length

  if (matchRatio >= 0.9) return 100 // Perfect/near-perfect match
  if (matchRatio >= 0.7) return 85 // Strong match
  if (matchRatio >= 0.5) return 70 // Good match
  if (matchRatio >= 0.3) return 55 // Partial match
  if (matchRatio > 0) return 40 // Single keyword

  // Conceptually relevant (from same query)
  if (assetQuery === searchQuery.toLowerCase()) {
    return 30
  }

  return 10 // Minimal relevance
}

/**
 * Calculate duration match score (0-100)
 *
 * Formula: 100 × (1 - ABS(asset_duration - segment_duration) / segment_duration)
 * Capped at 0 if difference > 50%
 *
 * For images, we use a default duration assumption
 */
function calculateDurationScore(asset: StockAsset, segmentDuration: number): number {
  // Images don't have duration - give them moderate score
  // They'll be converted to video with Ken Burns effect
  if (asset.assetType === 'image' || asset.duration === null) {
    return 60 // Images are flexible - decent score
  }

  const assetDuration = asset.duration
  const difference = Math.abs(assetDuration - segmentDuration)
  const differenceRatio = difference / segmentDuration

  // If difference > 50%, cap at 0
  if (differenceRatio > 0.5) {
    return 0
  }

  // Formula: 100 × (1 - differenceRatio)
  const score = 100 * (1 - differenceRatio)

  return Math.round(score)
}

/**
 * Calculate orientation match score (0-100)
 *
 * Hard threshold: aspect ratio within ±20% of 16:9 (1.42 - 2.14 range)
 * - 16:9 exact: 100
 * - Within 10%: 90
 * - 10-20%: 60-70
 * - Outside range: 0 (reject)
 */
function calculateOrientationScore(asset: StockAsset): number {
  const aspectRatio = asset.aspectRatio

  // Hard threshold - reject if outside acceptable range
  if (aspectRatio < MIN_ASPECT_RATIO || aspectRatio > MAX_ASPECT_RATIO) {
    return 0 // Will be filtered out
  }

  // Calculate how close to target
  const deviation = Math.abs(aspectRatio - TARGET_ASPECT_RATIO) / TARGET_ASPECT_RATIO

  if (deviation <= 0.02) return 100 // Nearly exact 16:9
  if (deviation <= 0.05) return 95 // Very close
  if (deviation <= 0.10) return 85 // Within 10%
  if (deviation <= 0.15) return 70 // Within 15%

  return 60 // Within 20% threshold
}

/**
 * Calculate quality/popularity score (0-100)
 *
 * Uses provider view/download counts if available
 * Fallback: 50-100 range (don't penalize unknowns)
 */
function calculateQualityScore(asset: StockAsset): number {
  const views = asset.metadata?.views as number | undefined
  const downloads = asset.metadata?.downloads as number | undefined
  const likes = asset.metadata?.likes as number | undefined

  // Calculate engagement score based on available metrics
  let engagementScore = 50 // Default

  if (views !== undefined && views > 0) {
    // Logarithmic scale for views (1K = 60, 10K = 70, 100K = 80, 1M = 90)
    engagementScore = Math.min(100, 50 + Math.log10(views) * 10)
  }

  if (downloads !== undefined && downloads > 0) {
    // Boost for downloads
    engagementScore = Math.min(100, engagementScore + Math.log10(downloads) * 5)
  }

  if (likes !== undefined && likes > 0) {
    // Small boost for likes
    engagementScore = Math.min(100, engagementScore + Math.log10(likes) * 2)
  }

  // Prefer videos over images (small boost)
  if (asset.assetType === 'video') {
    engagementScore = Math.min(100, engagementScore + 5)
  }

  return Math.round(engagementScore)
}

/**
 * Rank a single asset with all scoring dimensions
 */
export function rankAsset(asset: StockAsset, params: AssetRankingParams): RankedAsset {
  const keywordScore = calculateKeywordScore(asset, params.searchQuery)
  const durationScore = calculateDurationScore(asset, params.segmentDuration)
  const orientationScore = calculateOrientationScore(asset)
  const qualityScore = calculateQualityScore(asset)

  // Weighted scoring formula: K×0.40 + D×0.30 + O×0.20 + Q×0.10
  const rankingScore =
    (keywordScore * 0.40) +
    (durationScore * 0.30) +
    (orientationScore * 0.20) +
    (qualityScore * 0.10)

  return {
    ...asset,
    rankingScore: Math.round(rankingScore * 100) / 100,
    keywordScore,
    durationScore,
    orientationScore,
    qualityScore,
  }
}

/**
 * Rank and filter assets, returning top N
 *
 * Filters out:
 * - Assets with orientation score of 0 (wrong aspect ratio)
 * - Assets with duration score of 0 (>50% duration mismatch)
 * - Duplicate assets (by provider + providerAssetId)
 */
export function rankAssets(
  assets: StockAsset[],
  params: AssetRankingParams,
  topN: number = 3
): RankedAsset[] {
  // Rank all assets
  const rankedAssets = assets.map(asset => rankAsset(asset, params))

  // Filter out invalid assets
  const validAssets = rankedAssets.filter(asset => {
    // Must have valid orientation (within aspect ratio range)
    if (asset.orientationScore === 0) {
      console.log(`[Ranking] Filtered out ${asset.id}: wrong aspect ratio (${asset.aspectRatio.toFixed(2)})`)
      return false
    }
    // Must not have extreme duration mismatch
    if (asset.durationScore === 0 && asset.assetType === 'video') {
      console.log(`[Ranking] Filtered out ${asset.id}: duration mismatch too large`)
      return false
    }
    return true
  })

  // Remove duplicates (keep highest ranked)
  const uniqueAssets = new Map<string, RankedAsset>()
  for (const asset of validAssets) {
    const key = `${asset.provider}_${asset.providerAssetId}`
    const existing = uniqueAssets.get(key)
    if (!existing || asset.rankingScore > existing.rankingScore) {
      uniqueAssets.set(key, asset)
    }
  }

  // Sort by ranking score (descending)
  const sortedAssets = Array.from(uniqueAssets.values())
    .sort((a, b) => b.rankingScore - a.rankingScore)

  // Return top N
  const topAssets = sortedAssets.slice(0, topN)

  console.log(`[Ranking] Selected ${topAssets.length}/${assets.length} assets for segment`)
  topAssets.forEach((asset, index) => {
    console.log(`  ${index + 1}. ${asset.id} (score: ${asset.rankingScore}, K:${asset.keywordScore} D:${asset.durationScore} O:${asset.orientationScore} Q:${asset.qualityScore})`)
  })

  return topAssets
}

/**
 * Check if asset duration is acceptable for segment
 * Used for UI to show warnings/blocks
 */
export function checkDurationMismatch(
  assetDuration: number | null,
  segmentDuration: number
): { level: 'good' | 'warn' | 'block'; percentage: number; message: string } {
  // Images are always acceptable
  if (assetDuration === null) {
    return { level: 'good', percentage: 0, message: 'Image will be converted to video' }
  }

  const difference = Math.abs(assetDuration - segmentDuration)
  const percentage = (difference / segmentDuration) * 100

  if (percentage <= 5) {
    return { level: 'good', percentage, message: 'Good match' }
  }

  if (percentage <= 20) {
    const speedFactor = segmentDuration / assetDuration
    const speedPercent = Math.abs((speedFactor - 1) * 100).toFixed(0)
    return {
      level: 'warn',
      percentage,
      message: `Will be ${speedFactor > 1 ? 'slowed' : 'sped up'} ${speedPercent}%`
    }
  }

  return {
    level: 'block',
    percentage,
    message: `Duration mismatch too large (${percentage.toFixed(0)}%)`
  }
}
