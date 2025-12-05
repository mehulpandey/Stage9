/**
 * GET /api/projects/:id/quality-score
 * Get quality score for project's optimized script
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
import { scoreQuality, getQualityLevel } from '@/lib/llm'

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

  // Use optimized script if available, otherwise original
  const scriptToScore = project.optimized_script || project.original_script

  if (!scriptToScore) {
    return ErrorResponses.badRequest('Project has no script to score')[0]
  }

  // Score quality
  const qualityScore = await scoreQuality(scriptToScore)
  const level = getQualityLevel(qualityScore.overall)

  const [response] = success({
    projectId,
    scores: {
      clarity: qualityScore.clarity,
      pacing: qualityScore.pacing,
      hook: qualityScore.hook,
      overall: qualityScore.overall
    },
    level,
    suggestions: qualityScore.suggestions,
    isOptimized: !!project.optimized_script
  })

  return response
})
