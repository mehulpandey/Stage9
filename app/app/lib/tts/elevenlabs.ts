/**
 * ElevenLabs TTS Client
 * Primary TTS provider with high-quality voice synthesis
 */

import { VoicePreset } from './types'
import { getVoiceConfig, TTS_CONFIG } from './config'

interface ElevenLabsResponse {
  success: boolean
  audioBuffer: ArrayBuffer | null
  error?: string
}

/**
 * Generate TTS audio using ElevenLabs API
 * Returns the raw audio buffer for storage/processing
 */
export async function generateElevenLabsTTS(
  text: string,
  voicePreset: VoicePreset
): Promise<ElevenLabsResponse> {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    return {
      success: false,
      audioBuffer: null,
      error: 'ElevenLabs API key not configured',
    }
  }

  const config = getVoiceConfig(voicePreset)
  const { elevenLabs } = config

  const url = `${TTS_CONFIG.elevenLabs.baseUrl}/text-to-speech/${elevenLabs.voiceId}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      TTS_CONFIG.elevenLabs.timeout
    )

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: TTS_CONFIG.elevenLabs.model,
        voice_settings: {
          stability: elevenLabs.stability,
          similarity_boost: elevenLabs.similarityBoost,
          style: elevenLabs.style,
          use_speaker_boost: elevenLabs.useSpeakerBoost,
        },
        output_format: TTS_CONFIG.elevenLabs.outputFormat,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      let errorMessage = `ElevenLabs API error: ${response.status}`

      // Parse error message if JSON
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.detail?.message) {
          errorMessage = errorJson.detail.message
        } else if (errorJson.message) {
          errorMessage = errorJson.message
        }
      } catch {
        // Use raw error text
        if (errorText.length < 200) {
          errorMessage = errorText
        }
      }

      console.error(`[ElevenLabs] API error: ${errorMessage}`)
      return {
        success: false,
        audioBuffer: null,
        error: errorMessage,
      }
    }

    const audioBuffer = await response.arrayBuffer()

    if (audioBuffer.byteLength === 0) {
      return {
        success: false,
        audioBuffer: null,
        error: 'ElevenLabs returned empty audio',
      }
    }

    console.log(`[ElevenLabs] Generated ${audioBuffer.byteLength} bytes of audio`)

    return {
      success: true,
      audioBuffer,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[ElevenLabs] Request timeout')
        return {
          success: false,
          audioBuffer: null,
          error: 'ElevenLabs request timed out',
        }
      }
      console.error(`[ElevenLabs] Error: ${error.message}`)
      return {
        success: false,
        audioBuffer: null,
        error: error.message,
      }
    }

    return {
      success: false,
      audioBuffer: null,
      error: 'Unknown ElevenLabs error',
    }
  }
}

/**
 * Get ElevenLabs usage/quota info (optional helper)
 */
export async function getElevenLabsUsage(): Promise<{
  characterCount: number
  characterLimit: number
  remainingCharacters: number
} | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    return null
  }

  try {
    const response = await fetch(
      `${TTS_CONFIG.elevenLabs.baseUrl}/user/subscription`,
      {
        headers: {
          'xi-api-key': apiKey,
        },
      }
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    return {
      characterCount: data.character_count || 0,
      characterLimit: data.character_limit || 0,
      remainingCharacters: (data.character_limit || 0) - (data.character_count || 0),
    }
  } catch {
    return null
  }
}
