/**
 * POST /api/projects/:id/validate-script
 * Run content moderation on project script
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
import { moderateContent } from '@/lib/llm'

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
    return ErrorResponses.badRequest('Project has no script to validate')[0]
  }

  // Run content moderation
  const moderation = await moderateContent(project.original_script)

  const [response] = success({
    projectId,
    flagged: moderation.flagged,
    categories: moderation.categories,
    safe: !moderation.flagged,
    message: moderation.flagged
      ? `Content flagged for: ${moderation.categories.join(', ')}`
      : 'Content passed moderation checks'
  })

  return response
})
