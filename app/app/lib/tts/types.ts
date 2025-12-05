/**
 * TTS Module Type Definitions
 * Types for Text-to-Speech generation, caching, and configuration
 */

export type VoicePreset = 'professional_narrator' | 'energetic_host' | 'calm_educator'

/**
 * Voice configuration for TTS providers
 */
export interface VoiceConfig {
  elevenLabs: {
    voiceId: string
    stability: number
    similarityBoost: number
    style: number
    useSpeakerBoost: boolean
  }
  openAI: {
    voice: 'onyx' | 'nova' | 'shimmer' | 'alloy' | 'echo' | 'fable'
    speed: number
  }
  description: string
}

/**
 * TTS generation result
 */
export interface TTSResult {
  success: boolean
  audioUrl: string | null
  duration: number | null
  provider: 'elevenlabs' | 'openai'
  cached: boolean
  textHash: string
  error?: string
}

/**
 * TTS generation options
 */
export interface TTSOptions {
  voicePreset: VoicePreset
  projectId: string
  segmentId?: string
  skipCache?: boolean
}

/**
 * Cached TTS entry
 */
export interface CachedTTS {
  id: string
  textHash: string
  voicePresetId: VoicePreset
  audioUrl: string
  durationSeconds: number
  createdAt: string
  expiresAt: string
}

/**
 * Duration validation result
 */
export interface DurationValidation {
  isValid: boolean
  actualDuration: number
  expectedDuration: number
  differencePercent: number
  shouldWarn: boolean
  message?: string
}
