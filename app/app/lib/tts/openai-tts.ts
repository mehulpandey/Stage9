/**
 * OpenAI TTS Client
 * Fallback TTS provider when ElevenLabs is unavailable
 */

import OpenAI from 'openai'
import { VoicePreset } from './types'
import { getVoiceConfig, TTS_CONFIG } from './config'

interface OpenAITTSResponse {
  success: boolean
  audioBuffer: ArrayBuffer | null
  error?: string
}

let openaiClient: OpenAI | null = null

/**
 * Get or create OpenAI client instance
 */
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return null
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey })
  }

  return openaiClient
}

/**
 * Generate TTS audio using OpenAI API
 * Used as fallback when ElevenLabs fails
 */
export async function generateOpenAITTS(
  text: string,
  voicePreset: VoicePreset
): Promise<OpenAITTSResponse> {
  const client = getOpenAIClient()

  if (!client) {
    return {
      success: false,
      audioBuffer: null,
      error: 'OpenAI API key not configured',
    }
  }

  const config = getVoiceConfig(voicePreset)
  const { openAI } = config

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      TTS_CONFIG.openAI.timeout
    )

    const response = await client.audio.speech.create(
      {
        model: TTS_CONFIG.openAI.model as 'tts-1' | 'tts-1-hd',
        voice: openAI.voice,
        input: text,
        speed: openAI.speed,
        response_format: TTS_CONFIG.openAI.responseFormat as 'mp3',
      },
      { signal: controller.signal }
    )

    clearTimeout(timeoutId)

    // Convert the response to an ArrayBuffer
    const audioBuffer = await response.arrayBuffer()

    if (audioBuffer.byteLength === 0) {
      return {
        success: false,
        audioBuffer: null,
        error: 'OpenAI returned empty audio',
      }
    }

    console.log(`[OpenAI TTS] Generated ${audioBuffer.byteLength} bytes of audio`)

    return {
      success: true,
      audioBuffer,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[OpenAI TTS] Request timeout')
        return {
          success: false,
          audioBuffer: null,
          error: 'OpenAI TTS request timed out',
        }
      }

      console.error(`[OpenAI TTS] Error: ${error.message}`)
      return {
        success: false,
        audioBuffer: null,
        error: error.message,
      }
    }

    return {
      success: false,
      audioBuffer: null,
      error: 'Unknown OpenAI TTS error',
    }
  }
}
