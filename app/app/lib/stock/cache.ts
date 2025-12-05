/**
 * Asset Caching Service
 *
 * Caches stock assets globally (shared across projects) with 90-day expiration.
 * Before fetching from Pexels/Pixabay, check cache first.
 */

import { getSupabaseServerClient } from '../database'
import { StockAsset, RankedAsset } from './types'

interface CachedAsset {
  id: string
  provider: 'pexels' | 'pixabay'
  provider_asset_id: string
  asset_type: 'video' | 'image'
  url: string
  thumbnail_url: string | null
  duration: number | null
  width: number
  height: number
  aspect_ratio: number
  orientation: 'landscape' | 'portrait' | 'square'
  metadata_json: Record<string, unknown>
  ranking_score: number | null
  keyword_score: number | null
  duration_score: number | null
  orientation_score: number | null
  quality_score: number | null
  cached_at: string
  expires_at: string
}

/**
 * Check if assets are cached for a given query
 * Returns cached assets if found and not expired
 */
export async function getCachedAssets(
  provider: 'pexels' | 'pixabay',
  providerAssetIds: string[]
): Promise<Map<string, CachedAsset>> {
  if (providerAssetIds.length === 0) {
    return new Map()
  }

  const db = getSupabaseServerClient()
  const now = new Date().toISOString()

  const { data, error } = await db
    .from('assets')
    .select('*')
    .eq('provider', provider)
    .in('provider_asset_id', providerAssetIds)
    .gt('expires_at', now)
    .is('project_id', null) // Global cache entries have no project_id

  if (error || !data) {
    console.warn('[Cache] Error fetching cached assets:', error?.message)
    return new Map()
  }

  const cacheMap = new Map<string, CachedAsset>()
  for (const asset of data as unknown as CachedAsset[]) {
    if (asset.provider_asset_id) {
      cacheMap.set(asset.provider_asset_id, asset)
    }
  }

  console.log(`[Cache] Found ${cacheMap.size} cached assets for ${provider}`)
  return cacheMap
}

/**
 * Save assets to global cache
 * These are shared across all projects to avoid redundant API calls
 */
export async function cacheAssets(
  assets: StockAsset[]
): Promise<void> {
  if (assets.length === 0) return

  const db = getSupabaseServerClient()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days

  const inserts = assets.map(asset => ({
    provider: asset.provider as 'pexels' | 'pixabay',
    provider_asset_id: asset.providerAssetId,
    source_type: 'stock' as const,
    asset_type: asset.assetType as 'video' | 'image',
    url: asset.url,
    thumbnail_url: asset.thumbnailUrl,
    duration: asset.duration,
    width: asset.width,
    height: asset.height,
    aspect_ratio: asset.aspectRatio,
    orientation: asset.orientation as 'landscape' | 'portrait' | 'square',
    quality_score: 50, // Default quality score
    cached_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  }))

  // Insert new cache entries - skip duplicates
  let cached = 0
  for (const insert of inserts) {
    const { error } = await db
      .from('assets')
      .insert(insert)
      .select('id')
      .single()

    if (!error) {
      cached++
    } else if (!error.message.includes('duplicate')) {
      console.warn('[Cache] Error caching asset:', error.message)
    }
  }

  console.log(`[Cache] Cached ${cached}/${assets.length} assets`)
}

/**
 * Convert cached asset to StockAsset format
 */
export function cachedToStockAsset(cached: CachedAsset): StockAsset {
  return {
    id: `${cached.provider}_${cached.asset_type}_${cached.provider_asset_id}`,
    provider: cached.provider,
    providerAssetId: cached.provider_asset_id,
    assetType: cached.asset_type,
    url: cached.url,
    thumbnailUrl: cached.thumbnail_url,
    duration: cached.duration,
    width: cached.width,
    height: cached.height,
    aspectRatio: cached.aspect_ratio,
    orientation: cached.orientation,
    metadata: cached.metadata_json || {},
  }
}

/**
 * Clean up expired cache entries
 * Should be called periodically (e.g., via cron job)
 */
export async function cleanExpiredCache(): Promise<number> {
  const db = getSupabaseServerClient()
  const now = new Date().toISOString()

  const { data, error } = await db
    .from('assets')
    .delete()
    .lt('expires_at', now)
    .is('project_id', null) // Only delete global cache entries
    .select('id')

  if (error) {
    console.error('[Cache] Error cleaning expired cache:', error.message)
    return 0
  }

  const count = data?.length || 0
  console.log(`[Cache] Cleaned ${count} expired cache entries`)
  return count
}
