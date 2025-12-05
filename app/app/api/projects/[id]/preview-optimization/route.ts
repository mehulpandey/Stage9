/**
 * POST /api/projects/:id/preview-optimization
 * Preview script optimization without saving to database
 */

import { NextRequest } from 'next/server'
import {
  asyncHandler,
  success,
  getUserId,
  requireAuth,
  ErrorResponses
} from '@/lib/api-utils'
import { getProjectById } from '@/lib/database'
import { previewOptimization } from '@/lib/pipeline-a'

export const POST = asyncHandler(async (request: NextRequest) => {
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

  if (!project.original_script) {
    return ErrorResponses.badRequest('Project has no script to optimize')[0]
  }

  // Run preview optimization (doesn't save to database)
  const preview = await previewOptimization(project.original_script)

  const [response] = success({
    projectId,
    original: preview.original,
    optimized: preview.optimized,
    segments: preview.segments.map((seg, index) => ({
      number: index + 1,
      text: seg.text,
      energy: seg.energy,
      intent: seg.intent,
      estimatedDuration: seg.est_duration_hint
    })),
    qualityScore: preview.qualityScore
  })

  return response
})
