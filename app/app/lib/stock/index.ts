/**
 * Stock Asset Module
 * Exports all stock-related utilities
 */

export * from './types'
export * from './pexels'
export * from './pixabay'
export * from './ranking'
export * from './cache'

import { searchPexels } from './pexels'
import { searchPixabay } from './pixabay'
import { rankAssets } from './ranking'
import { StockAsset, RankedAsset, AssetSearchOptions, AssetRankingParams } from './types'

/**
 * Search both Pexels and Pixabay for assets
 * Combines results from both providers
 */
export async function searchAllProviders(
  query: string,
  options: AssetSearchOptions = {}
): Promise<StockAsset[]> {
  const { minDuration = 5, maxDuration = 60, perPage = 5, includePhotos = true } = options

  // Search both providers in parallel
  const [pexelsResults, pixabayResults] = await Promise.all([
    searchPexels(query, { minDuration, maxDuration, perPage, includePhotos }),
    searchPixabay(query, { minDuration, maxDuration, perPage, includePhotos }),
  ])

  // Combine results
  const allResults = [...pexelsResults, ...pixabayResults]

  console.log(`[Stock] Combined ${allResults.length} results from Pexels (${pexelsResults.length}) and Pixabay (${pixabayResults.length})`)

  return allResults
}

/**
 * Search and rank assets for a segment
 * This is the main function used by Pipeline B
 */
export async function searchAndRankAssets(
  queries: string[],
  params: AssetRankingParams,
  options: AssetSearchOptions = {}
): Promise<RankedAsset[]> {
  const allAssets: StockAsset[] = []

  // Search for each query
  for (const query of queries) {
    const results = await searchAllProviders(query, options)
    allAssets.push(...results)
  }

  if (allAssets.length === 0) {
    console.log('[Stock] No assets found for any query')
    return []
  }

  // Rank and return top 3
  const rankedAssets = rankAssets(allAssets, params, 3)

  return rankedAssets
}
