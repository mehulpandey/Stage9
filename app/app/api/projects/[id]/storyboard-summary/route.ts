/**
 * GET /api/projects/:id/storyboard-summary
 * Get summary statistics for the project storyboard
 */

import { NextRequest } from 'next/server'
import {
  asyncHandler,
  success,
  getUserId,
  requireAuth,
  ErrorResponses
} from '@/lib/api-utils'
import { getProjectById, getStoryboardSummary } from '@/lib/database'
import { validatePlaceholderThreshold } from '@/lib/validators'

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

  // Only allow retrieving summary if project is in ready, rendering, or completed state
  const allowedStatuses = ['ready', 'rendering', 'completed']
  if (!allowedStatuses.includes(project.status)) {
    return ErrorResponses.badRequest(
      `Cannot retrieve storyboard summary for project in "${project.status}" status. Project must be in ready, rendering, or completed state.`
    )[0]
  }

  // Get summary data
  const summary = await getStoryboardSummary(projectId, userId)

  // Calculate placeholder percentage and validate threshold
  const placeholderValidation = validatePlaceholderThreshold(
    summary.placeholderCount,
    summary.totalSegments
  )

  // Calculate visual completion percentage
  const visualCompletionPercent = summary.totalSegments > 0
    ? ((summary.hasAssetCount / summary.totalSegments) * 100)
    : 0

  // Calculate estimated duration in formatted time
  const totalSeconds = summary.estimatedTotalDuration
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)
  const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`

  // Check if ready to render
  const canRender = placeholderValidation.valid && summary.totalSegments > 0

  const [response] = success({
    projectId,
    totalSegments: summary.totalSegments,
    assetCounts: {
      hasAsset: summary.hasAssetCount,
      needsSelection: summary.needsSelectionCount,
      placeholder: summary.placeholderCount
    },
    silentSegments: summary.silentSegments,
    duration: {
      estimatedTotalSeconds: summary.estimatedTotalDuration,
      formatted: formattedDuration
    },
    visualCompletion: {
      percentage: Math.round(visualCompletionPercent * 10) / 10,
      isComplete: visualCompletionPercent >= 70
    },
    placeholderThreshold: {
      percentage: Math.round(placeholderValidation.percentage * 10) / 10,
      isValid: placeholderValidation.valid,
      message: placeholderValidation.message
    },
    canRender,
    renderBlockReason: !canRender
      ? (summary.totalSegments === 0
        ? 'No segments in project'
        : placeholderValidation.message)
      : null
  })

  return response
})
