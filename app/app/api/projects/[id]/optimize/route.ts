/**
 * POST /api/projects/:id/optimize
 * Run the full Pipeline A optimization on a project
 * This is the main endpoint that triggers script optimization
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
import { runPipelineA } from '@/lib/pipeline-a'
import { getQualityLevel } from '@/lib/llm'

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

  // Check if project is already being processed
  if (project.status === 'processing') {
    return ErrorResponses.conflict('Project is already being processed')[0]
  }

  // Run Pipeline A
  const result = await runPipelineA(projectId)

  if (!result.success) {
    // Check if it's a moderation failure
    if (result.moderation?.flagged) {
      return ErrorResponses.badRequest(
        `Content moderation failed: ${result.moderation.categories.join(', ')}`
      )[0]
    }
    return ErrorResponses.badRequest(result.error || 'Optimization failed')[0]
  }

  const [response] = success({
    projectId,
    success: result.success,
    status: result.status,
    qualityScore: result.qualityScore ? {
      ...result.qualityScore,
      level: getQualityLevel(result.qualityScore.overall)
    } : undefined,
    segmentCount: result.segments?.length || 0,
    segments: result.segments?.map(seg => ({
      number: seg.segmentNumber,
      originalText: seg.originalText,
      optimizedText: seg.optimizedText,
      estimatedDuration: seg.estimatedDuration,
      energy: seg.energy,
      intent: seg.intent,
      searchQueries: seg.searchQueries,
      fallbackQuery: seg.fallbackQuery
    }))
  })

  return response
})
