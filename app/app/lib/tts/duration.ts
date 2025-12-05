/**
 * Audio Duration Measurement
 * Uses ffprobe to measure actual audio duration
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { DurationValidation } from './types'
import { TTS_CONFIG } from './config'

const execAsync = promisify(exec)

/**
 * Get audio duration using ffprobe
 * Supports both file paths and buffers
 */
export async function getAudioDuration(
  audioBuffer: ArrayBuffer
): Promise<number | null> {
  const tempFile = join(tmpdir(), `tts_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`)

  try {
    // Write buffer to temp file
    const uint8Array = new Uint8Array(audioBuffer)
    await writeFile(tempFile, uint8Array)

    // Get ffprobe path from env or use default
    const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe'

    // Run ffprobe to get duration
    const { stdout } = await execAsync(
      `${ffprobePath} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempFile}"`,
      { timeout: 10000 } // 10 second timeout
    )

    const duration = parseFloat(stdout.trim())

    if (isNaN(duration)) {
      console.error('[Duration] Could not parse duration from ffprobe output')
      return null
    }

    console.log(`[Duration] Measured audio duration: ${duration.toFixed(2)}s`)

    return duration
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[Duration] Error measuring duration: ${error.message}`)
    }
    return null
  } finally {
    // Clean up temp file
    try {
      await unlink(tempFile)
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Estimate duration from text
 * Uses average speaking rate of 150 words per minute
 */
export function estimateDurationFromText(text: string): number {
  const words = text.trim().split(/\s+/).length
  const wordsPerSecond = 150 / 60 // 2.5 words per second
  return words / wordsPerSecond
}

/**
 * Validate TTS duration against expected segment duration
 */
export function validateDuration(
  actualDuration: number,
  expectedDuration: number
): DurationValidation {
  const difference = Math.abs(actualDuration - expectedDuration)
  const differencePercent = difference / expectedDuration

  // Check if beyond block threshold (severe mismatch)
  if (differencePercent > TTS_CONFIG.durationValidation.blockThreshold) {
    return {
      isValid: false,
      actualDuration,
      expectedDuration,
      differencePercent: differencePercent * 100,
      shouldWarn: true,
      message: `Severe duration mismatch: ${(differencePercent * 100).toFixed(1)}% difference. Expected ${expectedDuration.toFixed(1)}s, got ${actualDuration.toFixed(1)}s`,
    }
  }

  // Check if beyond warn threshold
  if (differencePercent > TTS_CONFIG.durationValidation.warnThreshold) {
    return {
      isValid: true,
      actualDuration,
      expectedDuration,
      differencePercent: differencePercent * 100,
      shouldWarn: true,
      message: `Duration mismatch detected: ${(differencePercent * 100).toFixed(1)}% difference. Expected ${expectedDuration.toFixed(1)}s, got ${actualDuration.toFixed(1)}s`,
    }
  }

  // Within acceptable range
  return {
    isValid: true,
    actualDuration,
    expectedDuration,
    differencePercent: differencePercent * 100,
    shouldWarn: false,
  }
}

/**
 * Calculate adjusted duration accounting for speed changes
 * Returns the duration needed to match a target
 */
export function calculateSpeedAdjustment(
  actualDuration: number,
  targetDuration: number
): {
  speedFactor: number
  adjustedDuration: number
  isAcceptable: boolean
} {
  const speedFactor = actualDuration / targetDuration

  // Speed factor limits: 0.8x to 1.5x for reasonable playback
  const isAcceptable = speedFactor >= 0.8 && speedFactor <= 1.5

  return {
    speedFactor,
    adjustedDuration: targetDuration,
    isAcceptable,
  }
}

/**
 * Check if ffprobe is available
 */
export async function isFFprobeAvailable(): Promise<boolean> {
  const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe'

  try {
    await execAsync(`${ffprobePath} -version`, { timeout: 5000 })
    return true
  } catch {
    return false
  }
}
