/**
 * PATCH /api/projects/:id/segments/:segmentId/silence
 * Toggle silent mode for a segment (skips TTS)
 */

import { NextRequest } from 'next/server'
import {
  asyncHandler,
  success,
  getUserId,
  requireAuth,
  parseJsonBody,
  ErrorResponses
} from '@/lib/api-utils'
import { getProjectById, setSegmentSilence } from '@/lib/database'
import { validateDuration, canEditProject } from '@/lib/validators'

export const PATCH = asyncHandler(async (request: NextRequest) => {
  const userId = getUserId(request)
  if (!requireAuth(userId)) {
    return ErrorResponses.unauthorized()[0]
  }

  // Extract IDs from URL
  const url = new URL(request.url)
  const pathParts = url.pathname.split('/')
  const projectId = pathParts[pathParts.indexOf('projects') + 1]
  const segmentId = pathParts[pathParts.indexOf('segments') + 1]

  if (!projectId || !segmentId) {
    return ErrorResponses.badRequest('Project ID and Segment ID are required')[0]
  }

  // Verify project exists and check status
  const project = await getProjectById(projectId, userId)
  if (!project) {
    return ErrorResponses.notFound('Project')[0]
  }

  // Check if project can be edited
  const editCheck = canEditProject(project.status)
  if (!editCheck.valid) {
    return ErrorResponses.conflict(editCheck.reason || 'Cannot edit project')[0]
  }

  // Parse request body
  const body = await parseJsonBody<{ isSilent: boolean; duration?: number }>(request)

  if (typeof body.isSilent !== 'boolean') {
    return ErrorResponses.badRequest('isSilent (boolean) is required')[0]
  }

  // If setting to silent, duration is required
  let silentDuration: number | null = null
  if (body.isSilent) {
    if (typeof body.duration !== 'number') {
      return ErrorResponses.badRequest('Duration is required when setting silent mode')[0]
    }

    // Validate duration
    const durationError = validateDuration(body.duration, 0.5, 60)
    if (durationError) {
      return ErrorResponses.badRequest(durationError.message)[0]
    }

    silentDuration = body.duration
  }

  // Update the segment
  const updatedSegment = await setSegmentSilence(
    segmentId,
    projectId,
    userId,
    body.isSilent,
    silentDuration
  )

  const [response] = success({
    segment: {
      id: updatedSegment.id,
      segmentNumber: updatedSegment.segment_number,
      isSilent: updatedSegment.is_silent,
      silentDuration: updatedSegment.silent_duration,
      optimizedText: updatedSegment.optimized_text
    }
  })

  return response
})
