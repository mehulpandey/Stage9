/**
 * GET /api/projects/:id/segments/:segmentId
 * PATCH /api/projects/:id/segments/:segmentId
 * Get or update a single segment
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
import { getProjectById, getSegmentById, getSegmentAssets, updateSegmentText } from '@/lib/database'
import { validateSegmentText, canEditProject } from '@/lib/validators'

/**
 * GET - Get single segment with details
 */
export const GET = asyncHandler(async (request: NextRequest) => {
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

  // Get the segment
  const segment = await getSegmentById(segmentId, projectId, userId)
  if (!segment) {
    return ErrorResponses.notFound('Segment')[0]
  }

  // Get asset suggestions for this segment
  const assets = await getSegmentAssets(segmentId)

  const [response] = success({
    segment: {
      id: segment.id,
      segmentNumber: segment.segment_number,
      originalText: segment.original_text,
      optimizedText: segment.optimized_text,
      duration: segment.duration,
      estimatedDuration: segment.estimated_duration,
      ttsAudioUrl: segment.tts_audio_url,
      selectedAssetId: segment.selected_asset_id,
      assetStatus: segment.asset_status,
      placeholderColor: segment.placeholder_color,
      speedAdjusted: segment.speed_adjusted,
      speedFactor: segment.speed_factor,
      isSilent: segment.is_silent,
      silentDuration: segment.silent_duration,
      createdAt: segment.created_at
    },
    assetSuggestions: assets.map(asset => ({
      id: asset.id,
      sourceType: asset.source_type,
      provider: asset.provider,
      providerAssetId: asset.provider_asset_id,
      assetType: asset.asset_type,
      duration: asset.duration,
      url: asset.url,
      thumbnailUrl: asset.thumbnail_url,
      aspectRatio: asset.aspect_ratio,
      orientation: asset.orientation,
      qualityScore: asset.quality_score,
      width: asset.width,
      height: asset.height
    }))
  })

  return response
})

/**
 * PATCH - Update segment text
 */
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
  const body = await parseJsonBody<{ text?: string }>(request)

  if (!body.text) {
    return ErrorResponses.badRequest('Text is required')[0]
  }

  // Validate segment text
  const textError = validateSegmentText(body.text)
  if (textError) {
    return ErrorResponses.badRequest(textError.message)[0]
  }

  // Update the segment
  const updatedSegment = await updateSegmentText(segmentId, projectId, userId, body.text)

  const [response] = success({
    segment: {
      id: updatedSegment.id,
      segmentNumber: updatedSegment.segment_number,
      originalText: updatedSegment.original_text,
      optimizedText: updatedSegment.optimized_text,
      duration: updatedSegment.duration,
      estimatedDuration: updatedSegment.estimated_duration,
      assetStatus: updatedSegment.asset_status,
      isSilent: updatedSegment.is_silent
    }
  })

  return response
})
