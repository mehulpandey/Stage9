/**
 * TTS Voice Configuration
 * Maps voice presets to ElevenLabs and OpenAI voice settings
 */

import { VoiceConfig, VoicePreset } from './types'

/**
 * Voice preset configurations
 *
 * ElevenLabs voice IDs are placeholders - replace with actual voice IDs from your ElevenLabs account
 * You can find voice IDs in the ElevenLabs dashboard under "Voices"
 */
export const VOICE_CONFIGS: Record<VoicePreset, VoiceConfig> = {
  professional_narrator: {
    elevenLabs: {
      // Default to "Adam" voice - deep, clear male voice
      // Replace with your preferred ElevenLabs voice ID
      voiceId: process.env.ELEVENLABS_VOICE_PROFESSIONAL || '21m00Tcm4TlvDq8ikWAM',
      stability: 0.75,      // Higher stability for consistency
      similarityBoost: 0.75,
      style: 0.4,           // Moderate style for natural delivery
      useSpeakerBoost: true,
    },
    openAI: {
      voice: 'onyx',        // Deep, authoritative male voice
      speed: 1.0,
    },
    description: 'Deep, clear, authoritative voice for professional narration',
  },

  energetic_host: {
    elevenLabs: {
      // Default to "Josh" voice - upbeat, conversational
      // Replace with your preferred ElevenLabs voice ID
      voiceId: process.env.ELEVENLABS_VOICE_ENERGETIC || 'TxGEqnHWrfWFTfGW9XjX',
      stability: 0.5,       // Lower stability for more dynamic delivery
      similarityBoost: 0.8,
      style: 0.7,           // Higher style for more expression
      useSpeakerBoost: true,
    },
    openAI: {
      voice: 'nova',        // Upbeat, conversational female voice
      speed: 1.05,          // Slightly faster for energy
    },
    description: 'Upbeat, conversational voice for engaging content',
  },

  calm_educator: {
    elevenLabs: {
      // Default to "Rachel" voice - warm, measured delivery
      // Replace with your preferred ElevenLabs voice ID
      voiceId: process.env.ELEVENLABS_VOICE_CALM || '21m00Tcm4TlvDq8ikWAM',
      stability: 0.8,       // Higher stability for measured delivery
      similarityBoost: 0.65,
      style: 0.3,           // Lower style for calm tone
      useSpeakerBoost: false,
    },
    openAI: {
      voice: 'shimmer',     // Warm, soothing voice
      speed: 0.95,          // Slightly slower for thoughtful delivery
    },
    description: 'Warm, measured, thoughtful voice for educational content',
  },
}

/**
 * TTS provider configuration
 */
export const TTS_CONFIG = {
  // ElevenLabs settings
  elevenLabs: {
    baseUrl: 'https://api.elevenlabs.io/v1',
    model: 'eleven_turbo_v2',    // Fast, high-quality model
    outputFormat: 'mp3_44100_128', // High quality MP3
    timeout: 30000,              // 30 second timeout per request
  },

  // OpenAI TTS settings
  openAI: {
    model: 'tts-1',              // Standard quality (use 'tts-1-hd' for higher quality)
    responseFormat: 'mp3',
    timeout: 30000,
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,          // 1 second initial delay
    maxDelay: 10000,             // 10 second max delay
    backoffMultiplier: 2,
  },

  // Cache configuration
  cache: {
    expirationDays: 30,          // Cache expires after 30 days
    bucketName: 'tts-audio',     // Supabase storage bucket
  },

  // Duration validation
  durationValidation: {
    warnThreshold: 0.2,          // Warn if differs by more than 20%
    blockThreshold: 0.5,         // Block if differs by more than 50% (severe mismatch)
  },

  // Concurrency
  maxConcurrent: 5,              // Max 5 concurrent TTS calls
}

/**
 * Get voice configuration for a preset
 */
export function getVoiceConfig(preset: VoicePreset): VoiceConfig {
  return VOICE_CONFIGS[preset]
}

/**
 * Check if ElevenLabs is configured
 */
export function isElevenLabsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY
}

/**
 * Check if OpenAI TTS is configured
 */
export function isOpenAITTSConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}
