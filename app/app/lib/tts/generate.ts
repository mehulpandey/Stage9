/**
 * TTS Generation Service
 * Main entry point for generating TTS with caching, fallback, and retry logic
 */

import { VoicePreset, TTSResult, TTSOptions } from './types'
import { TTS_CONFIG, isElevenLabsConfigured, isOpenAITTSConfigured } from './config'
import { generateElevenLabsTTS } from './elevenlabs'
import { generateOpenAITTS } from './openai-tts'
import {
  generateTextHash,
  getCachedTTS,
  saveTTSToCache,
  uploadTTSAudio,
} from './cache'
import { getAudioDuration } from './duration'

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generate TTS with retry logic
 */
async function generateWithRetry(
  text: string,
  voicePreset: VoicePreset
): Promise<{ audioBuffer: ArrayBuffer; provider: 'elevenlabs' | 'openai' } | null> {
  const { retry } = TTS_CONFIG
  let lastError: string | undefined

  // Try ElevenLabs first if configured
  if (isElevenLabsConfigured()) {
    for (let attempt = 1; attempt <= retry.maxAttempts; attempt++) {
      console.log(`[TTS] ElevenLabs attempt ${attempt}/${retry.maxAttempts}`)

      const result = await generateElevenLabsTTS(text, voicePreset)

      if (result.success && result.audioBuffer) {
        return { audioBuffer: result.audioBuffer, provider: 'elevenlabs' }
      }

      lastError = result.error
      console.warn(`[TTS] ElevenLabs attempt ${attempt} failed: ${lastError}`)

      // Wait before retry (exponential backoff)
      if (attempt < retry.maxAttempts) {
        const delay = Math.min(
          retry.initialDelay * Math.pow(retry.backoffMultiplier, attempt - 1),
          retry.maxDelay
        )
        console.log(`[TTS] Waiting ${delay}ms before retry...`)
        await sleep(delay)
      }
    }

    console.warn('[TTS] All ElevenLabs attempts failed, trying OpenAI fallback...')
  }

  // Fallback to OpenAI if configured
  if (isOpenAITTSConfigured()) {
    for (let attempt = 1; attempt <= retry.maxAttempts; attempt++) {
      console.log(`[TTS] OpenAI attempt ${attempt}/${retry.maxAttempts}`)

      const result = await generateOpenAITTS(text, voicePreset)

      if (result.success && result.audioBuffer) {
        return { audioBuffer: result.audioBuffer, provider: 'openai' }
      }

      lastError = result.error
      console.warn(`[TTS] OpenAI attempt ${attempt} failed: ${lastError}`)

      // Wait before retry
      if (attempt < retry.maxAttempts) {
        const delay = Math.min(
          retry.initialDelay * Math.pow(retry.backoffMultiplier, attempt - 1),
          retry.maxDelay
        )
        console.log(`[TTS] Waiting ${delay}ms before retry...`)
        await sleep(delay)
      }
    }
  }

  console.error(`[TTS] All providers failed. Last error: ${lastError}`)
  return null
}

/**
 * Generate TTS audio for text
 *
 * This is the main function used by Pipeline C.
 * It handles:
 * 1. Cache checking (skip generation if cached)
 * 2. Provider selection (ElevenLabs primary, OpenAI fallback)
 * 3. Retry logic (3 attempts per provider)
 * 4. Audio storage (upload to Supabase)
 * 5. Duration measurement (via ffprobe)
 * 6. Cache storage (for future reuse)
 */
export async function generateTTS(
  text: string,
  options: TTSOptions
): Promise<TTSResult> {
  const { voicePreset, projectId, skipCache = false } = options

  // Validate input
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      audioUrl: null,
      duration: null,
      provider: 'elevenlabs',
      cached: false,
      textHash: '',
      error: 'Text is required for TTS generation',
    }
  }

  // Check provider availability
  if (!isElevenLabsConfigured() && !isOpenAITTSConfigured()) {
    return {
      success: false,
      audioUrl: null,
      duration: null,
      provider: 'elevenlabs',
      cached: false,
      textHash: '',
      error: 'No TTS provider configured. Set ELEVENLABS_API_KEY or OPENAI_API_KEY.',
    }
  }

  const textHash = generateTextHash(text, voicePreset)

  // Check cache first (unless skipped)
  if (!skipCache) {
    const cached = await getCachedTTS(textHash, voicePreset)

    if (cached) {
      console.log(`[TTS] Using cached audio for text hash: ${textHash.substring(0, 8)}...`)
      return {
        success: true,
        audioUrl: cached.audioUrl,
        duration: cached.durationSeconds,
        provider: 'elevenlabs', // We don't track which provider was used for cached
        cached: true,
        textHash,
      }
    }
  }

  console.log(`[TTS] Generating new audio for text hash: ${textHash.substring(0, 8)}...`)
  console.log(`[TTS] Text length: ${text.length} chars, Voice: ${voicePreset}`)

  // Generate TTS with retry logic
  const result = await generateWithRetry(text, voicePreset)

  if (!result) {
    return {
      success: false,
      audioUrl: null,
      duration: null,
      provider: 'elevenlabs',
      cached: false,
      textHash,
      error: 'Failed to generate TTS after all retries',
    }
  }

  const { audioBuffer, provider } = result

  // Measure audio duration
  let duration = await getAudioDuration(audioBuffer)

  // If ffprobe fails, estimate duration
  if (duration === null) {
    // Rough estimate: MP3 at 128kbps
    // bytes = bitrate (bits/sec) * duration / 8
    // duration = bytes * 8 / bitrate
    // 128kbps = 128000 bits/sec
    duration = (audioBuffer.byteLength * 8) / 128000
    console.log(`[TTS] Estimated duration from file size: ${duration.toFixed(2)}s`)
  }

  // Upload to storage
  const audioUrl = await uploadTTSAudio(projectId, textHash, audioBuffer)

  if (!audioUrl) {
    return {
      success: false,
      audioUrl: null,
      duration,
      provider,
      cached: false,
      textHash,
      error: 'Failed to upload TTS audio to storage',
    }
  }

  // Save to cache
  await saveTTSToCache(textHash, voicePreset, audioUrl, duration)

  console.log(`[TTS] Successfully generated TTS: ${audioUrl} (${duration.toFixed(2)}s)`)

  return {
    success: true,
    audioUrl,
    duration,
    provider,
    cached: false,
    textHash,
  }
}

/**
 * Generate TTS for multiple texts concurrently
 * Respects maxConcurrent limit
 */
export async function generateTTSBatch(
  items: Array<{ text: string; options: TTSOptions }>
): Promise<TTSResult[]> {
  const results: TTSResult[] = []
  const { maxConcurrent } = TTS_CONFIG

  // Process in batches
  for (let i = 0; i < items.length; i += maxConcurrent) {
    const batch = items.slice(i, i + maxConcurrent)

    console.log(`[TTS Batch] Processing batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(items.length / maxConcurrent)}`)

    const batchResults = await Promise.all(
      batch.map(item => generateTTS(item.text, item.options))
    )

    results.push(...batchResults)
  }

  return results
}

/**
 * Check if text should skip TTS (e.g., for silent segments)
 */
export function shouldSkipTTS(isSilent: boolean, text: string): boolean {
  // Skip if segment is marked as silent
  if (isSilent) {
    return true
  }

  // Skip if text is empty or whitespace only
  if (!text || text.trim().length === 0) {
    return true
  }

  return false
}
