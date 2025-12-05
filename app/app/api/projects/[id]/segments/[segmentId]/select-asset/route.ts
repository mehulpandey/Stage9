/**
 * POST /api/projects/:id/segments/:segmentId/select-asset
 * Select an asset for a segment with duration mismatch validation
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
import { getProjectById, getSegmentById, getAssetById, selectAssetForSegment } from '@/lib/database'
import { validateDurationMismatch, canEditProject } from '@/lib/validators'

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
  const body = await parseJsonBody<{ assetId: string }>(request)

  if (!body.assetId) {
    return ErrorResponses.badRequest('Asset ID is required')[0]
  }

  // Get the segment
  const segment = await getSegmentById(segmentId, projectId, userId)
  if (!segment) {
    return ErrorResponses.notFound('Segment')[0]
  }

  // Get the asset
  const asset = await getAssetById(body.assetId)
  if (!asset) {
    return ErrorResponses.notFound('Asset')[0]
  }

  // Calculate duration to compare
  const segmentDuration = segment.estimated_duration || segment.duration
  const assetDuration = asset.duration || segmentDuration // If no asset duration, assume it matches

  // Validate duration mismatch
  const durationCheck = validateDurationMismatch(assetDuration, segmentDuration)

  if (!durationCheck.valid) {
    return ErrorResponses.badRequest(durationCheck.message || 'Duration mismatch too large')[0]
  }

  // Determine if speed adjustment is needed
  const speedAdjusted = durationCheck.level !== 'silent' || durationCheck.speedFactor !== 1
  const speedFactor = durationCheck.speedFactor || null

  // Select the asset for the segment
  const updatedSegment = await selectAssetForSegment(
    segmentId,
    projectId,
    userId,
    body.assetId,
    speedAdjusted,
    speedFactor
  )

  const [response] = success({
    segment: {
      id: updatedSegment.id,
      segmentNumber: updatedSegment.segment_number,
      selectedAssetId: updatedSegment.selected_asset_id,
      assetStatus: updatedSegment.asset_status,
      speedAdjusted: updatedSegment.speed_adjusted,
      speedFactor: updatedSegment.speed_factor
    },
    durationValidation: {
      level: durationCheck.level,
      speedFactor: durationCheck.speedFactor,
      message: durationCheck.message
    }
  })

  return response
})
