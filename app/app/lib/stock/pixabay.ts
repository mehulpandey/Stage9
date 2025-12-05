/**
 * Pixabay API Client
 * Searches for stock videos and images from Pixabay
 * Rate limit: 100 requests/minute
 */

import { StockAsset } from './types'

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY
const PIXABAY_BASE_URL = 'https://pixabay.com/api'

interface PixabayVideo {
  id: number
  pageURL: string
  type: string
  tags: string
  duration: number
  picture_id: string
  videos: {
    large: { url: string; width: number; height: number; size: number }
    medium: { url: string; width: number; height: number; size: number }
    small: { url: string; width: number; height: number; size: number }
    tiny: { url: string; width: number; height: number; size: number }
  }
  views: number
  downloads: number
  likes: number
  comments: number
  user_id: number
  user: string
  userImageURL: string
}

interface PixabayPhoto {
  id: number
  pageURL: string
  type: string
  tags: string
  previewURL: string
  previewWidth: number
  previewHeight: number
  webformatURL: string
  webformatWidth: number
  webformatHeight: number
  largeImageURL: string
  imageWidth: number
  imageHeight: number
  views: number
  downloads: number
  likes: number
  comments: number
  user_id: number
  user: string
  userImageURL: string
}

interface PixabayVideoResponse {
  total: number
  totalHits: number
  hits: PixabayVideo[]
}

interface PixabayPhotoResponse {
  total: number
  totalHits: number
  hits: PixabayPhoto[]
}

/**
 * Search Pixabay for videos
 */
export async function searchPixabayVideos(
  query: string,
  options: {
    minDuration?: number
    maxDuration?: number
    perPage?: number
  } = {}
): Promise<StockAsset[]> {
  if (!PIXABAY_API_KEY) {
    console.error('[Pixabay] API key not configured')
    return []
  }

  const { minDuration = 5, maxDuration = 60, perPage = 10 } = options

  try {
    const params = new URLSearchParams({
      key: PIXABAY_API_KEY,
      q: query,
      per_page: String(perPage),
      video_type: 'film', // film, animation, all
      safesearch: 'true',
    })

    const response = await fetch(`${PIXABAY_BASE_URL}/videos/?${params}`)

    if (!response.ok) {
      console.error(`[Pixabay] API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data: PixabayVideoResponse = await response.json()

    // Filter by duration and map to StockAsset format
    const assets: StockAsset[] = data.hits
      .filter(video => video.duration >= minDuration && video.duration <= maxDuration)
      .map(video => {
        // Prefer large or medium quality
        const videoFile = video.videos.large || video.videos.medium || video.videos.small
        const width = videoFile.width
        const height = videoFile.height

        return {
          id: `pixabay_video_${video.id}`,
          provider: 'pixabay' as const,
          providerAssetId: String(video.id),
          assetType: 'video' as const,
          url: videoFile.url,
          thumbnailUrl: `https://i.vimeocdn.com/video/${video.picture_id}_295x166.jpg`,
          duration: video.duration,
          width,
          height,
          aspectRatio: width / height,
          orientation: width > height ? 'landscape' : (width < height ? 'portrait' : 'square'),
          metadata: {
            query,
            tags: video.tags,
            views: video.views,
            downloads: video.downloads,
            likes: video.likes,
            user: video.user,
          },
        }
      })

    console.log(`[Pixabay] Found ${assets.length} videos for query: "${query}"`)
    return assets
  } catch (error) {
    console.error('[Pixabay] Search error:', error)
    return []
  }
}

/**
 * Search Pixabay for photos (used as fallback when videos aren't available)
 */
export async function searchPixabayPhotos(
  query: string,
  options: {
    perPage?: number
  } = {}
): Promise<StockAsset[]> {
  if (!PIXABAY_API_KEY) {
    console.error('[Pixabay] API key not configured')
    return []
  }

  const { perPage = 10 } = options

  try {
    const params = new URLSearchParams({
      key: PIXABAY_API_KEY,
      q: query,
      per_page: String(perPage),
      image_type: 'photo',
      orientation: 'horizontal',
      safesearch: 'true',
    })

    const response = await fetch(`${PIXABAY_BASE_URL}/?${params}`)

    if (!response.ok) {
      console.error(`[Pixabay] API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data: PixabayPhotoResponse = await response.json()

    const assets: StockAsset[] = data.hits.map(photo => ({
      id: `pixabay_photo_${photo.id}`,
      provider: 'pixabay' as const,
      providerAssetId: String(photo.id),
      assetType: 'image' as const,
      url: photo.largeImageURL,
      thumbnailUrl: photo.webformatURL,
      duration: null,
      width: photo.imageWidth,
      height: photo.imageHeight,
      aspectRatio: photo.imageWidth / photo.imageHeight,
      orientation: photo.imageWidth > photo.imageHeight ? 'landscape' : (photo.imageWidth < photo.imageHeight ? 'portrait' : 'square'),
      metadata: {
        query,
        tags: photo.tags,
        views: photo.views,
        downloads: photo.downloads,
        likes: photo.likes,
        user: photo.user,
      },
    }))

    console.log(`[Pixabay] Found ${assets.length} photos for query: "${query}"`)
    return assets
  } catch (error) {
    console.error('[Pixabay] Search error:', error)
    return []
  }
}

/**
 * Search Pixabay for both videos and photos
 * Videos are preferred, photos are used as fallback
 */
export async function searchPixabay(
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
  const videos = await searchPixabayVideos(query, videoOptions)

  // If we have enough videos, return them
  if (videos.length >= 3) {
    return videos
  }

  // Otherwise, also search for photos as fallback
  if (includePhotos) {
    const photos = await searchPixabayPhotos(query, { perPage: videoOptions.perPage })
    return [...videos, ...photos]
  }

  return videos
}
