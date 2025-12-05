/**
 * TTS Module
 * Exports all TTS-related utilities
 */

// Types
export * from './types'

// Configuration
export {
  VOICE_CONFIGS,
  TTS_CONFIG,
  getVoiceConfig,
  isElevenLabsConfigured,
  isOpenAITTSConfigured,
} from './config'

// Providers
export { generateElevenLabsTTS, getElevenLabsUsage } from './elevenlabs'
export { generateOpenAITTS } from './openai-tts'

// Caching
export {
  generateTextHash,
  getCachedTTS,
  saveTTSToCache,
  uploadTTSAudio,
  deleteTTSAudio,
  cleanExpiredTTSCache,
  getTTSCacheStats,
} from './cache'

// Duration
export {
  getAudioDuration,
  estimateDurationFromText,
  validateDuration,
  calculateSpeedAdjustment,
  isFFprobeAvailable,
} from './duration'

// Main generation function
export {
  generateTTS,
  generateTTSBatch,
  shouldSkipTTS,
} from './generate'
