/**
 * POST /api/projects/:id/segments/:segmentId/set-placeholder
 * Set a segment to use a placeholder (colored background)
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
import { getProjectById, setSegmentPlaceholder } from '@/lib/database'
import { validateColor, canEditProject } from '@/lib/validators'

export const POST = asyncHandler(async (request: NextRequest) => {
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
  const body = await parseJsonBody<{ color?: string }>(request)

  // Default placeholder color from design system
  const color = body.color || '#E5E7EB'

  // Validate color if provided
  if (body.color) {
    const colorError = validateColor(body.color)
    if (colorError) {
      return ErrorResponses.badRequest(colorError.message)[0]
    }
  }

  // Set segment as placeholder
  const updatedSegment = await setSegmentPlaceholder(segmentId, projectId, userId, color)

  const [response] = success({
    segment: {
      id: updatedSegment.id,
      segmentNumber: updatedSegment.segment_number,
      assetStatus: updatedSegment.asset_status,
      placeholderColor: updatedSegment.placeholder_color,
      selectedAssetId: updatedSegment.selected_asset_id
    }
  })

  return response
})
