/**
 * TTS Caching System
 * Caches TTS audio to avoid regenerating identical audio
 * Cache key: hash(optimized_text + voice_preset_id)
 */

import { createHash } from 'crypto'
import { getSupabaseServerClient } from '../database'
import { TTSCacheRow } from '../database.types'
import { VoicePreset, CachedTTS } from './types'
import { TTS_CONFIG } from './config'

/**
 * Generate a hash for cache key
 * Combines text and voice preset to create unique identifier
 */
export function generateTextHash(text: string, voicePreset: VoicePreset): string {
  const combined = `${text.trim()}::${voicePreset}`
  return createHash('sha256').update(combined).digest('hex').substring(0, 32)
}

/**
 * Check if TTS is cached for given text and voice preset
 */
export async function getCachedTTS(
  textHash: string,
  voicePreset: VoicePreset
): Promise<CachedTTS | null> {
  const db = getSupabaseServerClient()
  const now = new Date().toISOString()

  const { data, error } = await db
    .from('tts_cache')
    .select('*')
    .eq('text_hash', textHash)
    .eq('voice_preset_id', voicePreset)
    .gt('expires_at', now)
    .single()

  if (error || !data) {
    return null
  }

  // Cast to TTSCacheRow since select('*') returns `{}`
  const row = data as unknown as TTSCacheRow

  console.log(`[TTS Cache] Cache hit for hash: ${textHash.substring(0, 8)}...`)

  return {
    id: row.id,
    textHash: row.text_hash,
    voicePresetId: row.voice_preset_id,
    audioUrl: row.audio_url,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }
}

/**
 * Save TTS audio to cache
 */
export async function saveTTSToCache(
  textHash: string,
  voicePreset: VoicePreset,
  audioUrl: string,
  durationSeconds: number
): Promise<CachedTTS | null> {
  const db = getSupabaseServerClient()
  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + TTS_CONFIG.cache.expirationDays * 24 * 60 * 60 * 1000
  )

  const { data, error } = await db
    .from('tts_cache')
    .insert({
      text_hash: textHash,
      voice_preset_id: voicePreset,
      audio_url: audioUrl,
      duration_seconds: durationSeconds,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    // Check for duplicate (race condition)
    if (error.code === '23505') {
      console.log(`[TTS Cache] Entry already exists for hash: ${textHash.substring(0, 8)}...`)
      return getCachedTTS(textHash, voicePreset)
    }
    console.error(`[TTS Cache] Error saving to cache: ${error.message}`)
    return null
  }

  // Cast to TTSCacheRow since select() returns `{}`
  const row = data as unknown as TTSCacheRow

  console.log(`[TTS Cache] Cached TTS for hash: ${textHash.substring(0, 8)}...`)

  return {
    id: row.id,
    textHash: row.text_hash,
    voicePresetId: row.voice_preset_id,
    audioUrl: row.audio_url,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }
}

/**
 * Upload audio buffer to Supabase storage
 */
export async function uploadTTSAudio(
  projectId: string,
  textHash: string,
  audioBuffer: ArrayBuffer
): Promise<string | null> {
  const db = getSupabaseServerClient()

  const fileName = `${projectId}/${textHash}.mp3`

  // Convert ArrayBuffer to Uint8Array for Supabase upload
  const uint8Array = new Uint8Array(audioBuffer)

  const { data, error } = await db.storage
    .from(TTS_CONFIG.cache.bucketName)
    .upload(fileName, uint8Array, {
      contentType: 'audio/mpeg',
      upsert: true,
    })

  if (error) {
    console.error(`[TTS Cache] Error uploading audio: ${error.message}`)
    return null
  }

  // Get public URL
  const { data: urlData } = db.storage
    .from(TTS_CONFIG.cache.bucketName)
    .getPublicUrl(data.path)

  console.log(`[TTS Cache] Uploaded audio to: ${data.path}`)

  return urlData.publicUrl
}

/**
 * Delete TTS audio from storage
 */
export async function deleteTTSAudio(audioUrl: string): Promise<boolean> {
  const db = getSupabaseServerClient()

  // Extract file path from URL
  const bucketName = TTS_CONFIG.cache.bucketName
  const pathMatch = audioUrl.match(new RegExp(`${bucketName}/(.+)$`))

  if (!pathMatch) {
    console.error('[TTS Cache] Could not extract path from URL')
    return false
  }

  const filePath = pathMatch[1]

  const { error } = await db.storage
    .from(bucketName)
    .remove([filePath])

  if (error) {
    console.error(`[TTS Cache] Error deleting audio: ${error.message}`)
    return false
  }

  return true
}

/**
 * Clean up expired TTS cache entries
 * Should be called periodically (via cron or scheduled job)
 */
export async function cleanExpiredTTSCache(): Promise<number> {
  const db = getSupabaseServerClient()
  const now = new Date().toISOString()

  // First, get expired entries to delete their storage files
  const { data: expiredEntries, error: selectError } = await db
    .from('tts_cache')
    .select('id, audio_url')
    .lt('expires_at', now)

  if (selectError) {
    console.error(`[TTS Cache] Error fetching expired entries: ${selectError.message}`)
    return 0
  }

  if (!expiredEntries || expiredEntries.length === 0) {
    console.log('[TTS Cache] No expired entries to clean')
    return 0
  }

  // Delete storage files
  for (const entry of expiredEntries) {
    await deleteTTSAudio(entry.audio_url)
  }

  // Delete cache entries
  const { data: deletedData, error: deleteError } = await db
    .from('tts_cache')
    .delete()
    .lt('expires_at', now)
    .select('id')

  if (deleteError) {
    console.error(`[TTS Cache] Error deleting expired entries: ${deleteError.message}`)
    return 0
  }

  const count = deletedData?.length || 0
  console.log(`[TTS Cache] Cleaned ${count} expired cache entries`)

  return count
}

/**
 * Get cache statistics
 */
export async function getTTSCacheStats(): Promise<{
  totalEntries: number
  totalSizeEstimate: string
}> {
  const db = getSupabaseServerClient()

  const { count, error } = await db
    .from('tts_cache')
    .select('*', { count: 'exact', head: true })

  if (error) {
    return {
      totalEntries: 0,
      totalSizeEstimate: '0 KB',
    }
  }

  // Rough estimate: average 100KB per TTS file
  const estimatedBytes = (count || 0) * 100 * 1024
  const sizeInMB = (estimatedBytes / (1024 * 1024)).toFixed(2)

  return {
    totalEntries: count || 0,
    totalSizeEstimate: estimatedBytes > 1024 * 1024
      ? `${sizeInMB} MB`
      : `${Math.round(estimatedBytes / 1024)} KB`,
  }
}
