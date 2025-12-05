/**
 * GET /api/projects/:id/segments
 * Get all segments for a project
 */

import { NextRequest } from 'next/server'
import {
  asyncHandler,
  success,
  getUserId,
  requireAuth,
  ErrorResponses
} from '@/lib/api-utils'
import { getProjectById, getProjectSegments } from '@/lib/database'

export const GET = asyncHandler(async (request: NextRequest) => {
  const userId = getUserId(request)
  if (!requireAuth(userId)) {
    return ErrorResponses.unauthorized()[0]
  }

  // Extract project ID from URL
  const url = new URL(request.url)
  const pathParts = url.pathname.split('/')
  const projectId = pathParts[pathParts.indexOf('projects') + 1]

  if (!projectId) {
    return ErrorResponses.badRequest('Project ID is required')[0]
  }

  // Verify project exists and user owns it
  const project = await getProjectById(projectId, userId)
  if (!project) {
    return ErrorResponses.notFound('Project')[0]
  }

  // Only allow retrieving segments if project is in ready, rendering, or completed state
  const allowedStatuses = ['ready', 'rendering', 'completed']
  if (!allowedStatuses.includes(project.status)) {
    return ErrorResponses.badRequest(
      `Cannot retrieve segments for project in "${project.status}" status. Project must be in ready, rendering, or completed state.`
    )[0]
  }

  // Get all segments for the project
  const segments = await getProjectSegments(projectId, userId)

  const [response] = success({
    projectId,
    segments: segments.map(seg => ({
      id: seg.id,
      segmentNumber: seg.segment_number,
      originalText: seg.original_text,
      optimizedText: seg.optimized_text,
      duration: seg.duration,
      estimatedDuration: seg.estimated_duration,
      ttsAudioUrl: seg.tts_audio_url,
      selectedAssetId: seg.selected_asset_id,
      assetStatus: seg.asset_status,
      placeholderColor: seg.placeholder_color,
      speedAdjusted: seg.speed_adjusted,
      speedFactor: seg.speed_factor,
      isSilent: seg.is_silent,
      silentDuration: seg.silent_duration,
      createdAt: seg.created_at
    })),
    count: segments.length
  })

  return response
})
