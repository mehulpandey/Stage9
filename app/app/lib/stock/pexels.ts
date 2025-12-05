/**
 * Pexels API Client
 * Searches for stock videos and images from Pexels
 * Rate limit: 200 requests/hour
 */

import { StockAsset } from './types'

const PEXELS_API_KEY = process.env.PEXELS_API_KEY
const PEXELS_BASE_URL = 'https://api.pexels.com'

interface PexelsVideo {
  id: number
  width: number
  height: number
  duration: number
  image: string
  video_files: Array<{
    id: number
    quality: string
    file_type: string
    width: number
    height: number
    link: string
  }>
}

interface PexelsPhoto {
  id: number
  width: number
  height: number
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    portrait: string
    landscape: string
    tiny: string
  }
}

interface PexelsVideoResponse {
  page: number
  per_page: number
  total_results: number
  videos: PexelsVideo[]
}

interface PexelsPhotoResponse {
  page: number
  per_page: number
  total_results: number
  photos: PexelsPhoto[]
}

/**
 * Search Pexels for videos
 */
export async function searchPexelsVideos(
  query: string,
  options: {
    minDuration?: number
    maxDuration?: number
    perPage?: number
  } = {}
): Promise<StockAsset[]> {
  if (!PEXELS_API_KEY) {
    console.error('[Pexels] API key not configured')
    return []
  }

  const { minDuration = 5, maxDuration = 60, perPage = 10 } = options

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(perPage),
      orientation: 'landscape',
    })

    const response = await fetch(
      `${PEXELS_BASE_URL}/videos/search?${params}`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    )

    if (!response.ok) {
      console.error(`[Pexels] API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data: PexelsVideoResponse = await response.json()

    // Filter by duration and map to StockAsset format
    const assets: StockAsset[] = data.videos
      .filter(video => video.duration >= minDuration && video.duration <= maxDuration)
      .map(video => {
        // Get best quality video file (prefer HD)
        const hdFile = video.video_files.find(f => f.quality === 'hd' && f.width >= 1280)
        const sdFile = video.video_files.find(f => f.quality === 'sd')
        const videoFile = hdFile || sdFile || video.video_files[0]

        return {
          id: `pexels_video_${video.id}`,
          provider: 'pexels' as const,
          providerAssetId: String(video.id),
          assetType: 'video' as const,
          url: videoFile?.link || '',
          thumbnailUrl: video.image,
          duration: video.duration,
          width: video.width,
          height: video.height,
          aspectRatio: video.width / video.height,
          orientation: (video.width > video.height ? 'landscape' : (video.width < video.height ? 'portrait' : 'square')) as 'landscape' | 'portrait' | 'square',
          metadata: {
            query,
            quality: videoFile?.quality || 'unknown',
            fileType: videoFile?.file_type || 'video/mp4',
          },
        }
      })
      .filter(asset => asset.url) // Filter out any without valid URLs

    console.log(`[Pexels] Found ${assets.length} videos for query: "${query}"`)
    return assets
  } catch (error) {
    console.error('[Pexels] Search error:', error)
    return []
  }
}

/**
 * Search Pexels for photos (used as fallback when videos aren't available)
 */
export async function searchPexelsPhotos(
  query: string,
  options: {
    perPage?: number
  } = {}
): Promise<StockAsset[]> {
  if (!PEXELS_API_KEY) {
    console.error('[Pexels] API key not configured')
    return []
  }

  const { perPage = 10 } = options

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(perPage),
      orientation: 'landscape',
    })

    const response = await fetch(
      `${PEXELS_BASE_URL}/v1/search?${params}`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    )

    if (!response.ok) {
      console.error(`[Pexels] API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data: PexelsPhotoResponse = await response.json()

    const assets: StockAsset[] = data.photos.map(photo => ({
      id: `pexels_photo_${photo.id}`,
      provider: 'pexels' as const,
      providerAssetId: String(photo.id),
      assetType: 'image' as const,
      url: photo.src.large2x || photo.src.large,
      thumbnailUrl: photo.src.medium,
      duration: null,
      width: photo.width,
      height: photo.height,
      aspectRatio: photo.width / photo.height,
      orientation: (photo.width > photo.height ? 'landscape' : (photo.width < photo.height ? 'portrait' : 'square')) as 'landscape' | 'portrait' | 'square',
      metadata: {
        query,
        sizes: Object.keys(photo.src),
      },
    }))

    console.log(`[Pexels] Found ${assets.length} photos for query: "${query}"`)
    return assets
  } catch (error) {
    console.error('[Pexels] Search error:', error)
    return []
  }
}

/**
 * Search Pexels for both videos and photos
 * Videos are preferred, photos are used as fallback
 */
export async function searchPexels(
  query: string,
  options: {
    minDuration?: number
    maxDuration?: number
    perPage?: number
    includePhotos?: boolean
  } = {}
): Promise<StockAsset[]> {
  const { includePhotos = true, ...videoOptions } = options

  // First try videos
  const videos = await searchPexelsVideos(query, videoOptions)

  // If we have enough videos, return them
  if (videos.length >= 3) {
    return videos
  }

  // Otherwise, also search for photos as fallback
  if (includePhotos) {
    const photos = await searchPexelsPhotos(query, { perPage: videoOptions.perPage })
    return [...videos, ...photos]
  }

  return videos
}
