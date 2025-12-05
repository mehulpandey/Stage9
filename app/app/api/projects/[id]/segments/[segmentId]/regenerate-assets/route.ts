/**
 * POST /api/projects/:id/segments/:segmentId/regenerate-assets
 * Regenerate asset suggestions for a segment using Pipeline B
 */

import { NextRequest } from 'next/server'
import {
  asyncHandler,
  success,
  getUserId,
  requireAuth,
  ErrorResponses
} from '@/lib/api-utils'
import { getProjectById, getSegmentById } from '@/lib/database'
import { canEditProject } from '@/lib/validators'
import { regenerateSegmentAssets } from '@/lib/pipeline-b'

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

  // Verify segment exists
  const segment = await getSegmentById(segmentId, projectId, userId)
  if (!segment) {
    return ErrorResponses.notFound('Segment')[0]
  }

  // Run Pipeline B for this segment
  const result = await regenerateSegmentAssets(projectId, segmentId, userId)

  if (!result.success) {
    return ErrorResponses.internalError(result.error || 'Failed to regenerate assets')[0]
  }

  const [response] = success({
    segmentId,
    projectId,
    status: 'completed',
    assetsFound: result.assetsFound,
    assetIds: result.assetIds,
    isPlaceholder: result.isPlaceholder,
    message: result.assetsFound > 0
      ? `Found ${result.assetsFound} asset suggestions`
      : 'No assets found - segment set as placeholder'
  })

  return response
})
