/**
 * Stock Asset Types
 * Shared types for Pexels and Pixabay integrations
 */

export interface StockAsset {
  id: string
  provider: 'pexels' | 'pixabay'
  providerAssetId: string
  assetType: 'video' | 'image'
  url: string
  thumbnailUrl: string | null
  duration: number | null // in seconds, null for images
  width: number
  height: number
  aspectRatio: number
  orientation: 'landscape' | 'portrait' | 'square'
  metadata: Record<string, unknown>
}

export interface RankedAsset extends StockAsset {
  rankingScore: number
  keywordScore: number
  durationScore: number
  orientationScore: number
  qualityScore: number
}

export interface AssetSearchOptions {
  minDuration?: number
  maxDuration?: number
  perPage?: number
  includePhotos?: boolean
}

export interface AssetRankingParams {
  segmentDuration: number
  segmentText: string
  searchQuery: string
  targetAspectRatio?: number // defaults to 16:9 (1.78)
}
