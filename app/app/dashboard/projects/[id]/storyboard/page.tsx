'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AssetCarousel from '@/components/storyboard/AssetCarousel'
import SegmentEditor from '@/components/storyboard/SegmentEditor'

interface Asset {
  id: string
  sourceType: string
  provider: string | null
  providerAssetId: string
  assetType: 'video' | 'image'
  duration: number | null
  url: string
  thumbnailUrl: string | null
  aspectRatio: number
  orientation: string
  qualityScore: number
  width: number
  height: number
}

interface Segment {
  id: string
  segmentNumber: number
  originalText: string
  optimizedText: string
  duration: number
  estimatedDuration: number
  ttsAudioUrl: string | null
  selectedAssetId: string | null
  assetStatus: 'has_asset' | 'needs_selection' | 'placeholder'
  placeholderColor: string
  speedAdjusted: boolean
  speedFactor: number | null
  isSilent: boolean
  silentDuration: number | null
  createdAt: string
  assets?: Asset[]
}

interface StoryboardSummary {
  totalSegments: number
  assetCounts: {
    hasAsset: number
    needsSelection: number
    placeholder: number
  }
  silentSegments: number
  duration: {
    estimatedTotalSeconds: number
    formatted: string
  }
  visualCompletion: {
    percentage: number
    isComplete: boolean
  }
  placeholderThreshold: {
    percentage: number
    isValid: boolean
    message?: string
  }
  canRender: boolean
  renderBlockReason: string | null
}

interface Project {
  id: string
  title: string
  status: string
  voice_preset_id: string
}

export default function StoryboardPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [summary, setSummary] = useState<StoryboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null)
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login')
        return
      }

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, title, status, voice_preset_id')
        .eq('id', params.id)
        .single()

      if (projectError || !projectData) {
        setError('Project not found')
        return
      }

      setProject(projectData)

      // Check if project is in valid state
      if (!['ready', 'rendering', 'completed'].includes(projectData.status)) {
        setError(`Project must be in "ready" state to view storyboard. Current status: ${projectData.status}`)
        return
      }

      // Fetch segments with assets
      const { data: segmentsData, error: segmentsError } = await supabase
        .from('segments')
        .select(`
          *,
          assets (*)
        `)
        .eq('project_id', params.id)
        .order('segment_number', { ascending: true })

      if (segmentsError) {
        setError('Failed to load segments')
        return
      }

      const formattedSegments: Segment[] = (segmentsData || []).map((seg: any) => ({
        id: seg.id,
        segmentNumber: seg.segment_number,
        originalText: seg.original_text,
        optimizedText: seg.optimized_text,
        duration: seg.duration,
        estimatedDuration: seg.estimated_duration,
        ttsAudioUrl: seg.tts_audio_url,
        selectedAssetId: seg.selected_asset_id,
        assetStatus: seg.asset_status,
        placeholderColor: seg.placeholder_color,
        speedAdjusted: seg.speed_adjusted,
        speedFactor: seg.speed_factor,
        isSilent: seg.is_silent,
        silentDuration: seg.silent_duration,
        createdAt: seg.created_at,
        assets: (seg.assets || []).map((asset: any) => ({
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
      }))

      setSegments(formattedSegments)

      // Calculate summary
      const totalSegments = formattedSegments.length
      let hasAsset = 0, needsSelection = 0, placeholder = 0, silentSegments = 0
      let estimatedTotalSeconds = 0

      formattedSegments.forEach(seg => {
        if (seg.assetStatus === 'has_asset') hasAsset++
        else if (seg.assetStatus === 'placeholder') placeholder++
        else needsSelection++

        if (seg.isSilent) {
          silentSegments++
          estimatedTotalSeconds += seg.silentDuration || 0
        } else {
          estimatedTotalSeconds += seg.estimatedDuration || 0
        }
      })

      const placeholderPercentage = totalSegments > 0 ? (placeholder / totalSegments) * 100 : 0
      const visualPercentage = totalSegments > 0 ? (hasAsset / totalSegments) * 100 : 0

      const minutes = Math.floor(estimatedTotalSeconds / 60)
      const seconds = Math.round(estimatedTotalSeconds % 60)

      setSummary({
        totalSegments,
        assetCounts: { hasAsset, needsSelection, placeholder },
        silentSegments,
        duration: {
          estimatedTotalSeconds,
          formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`
        },
        visualCompletion: {
          percentage: Math.round(visualPercentage * 10) / 10,
          isComplete: visualPercentage >= 70
        },
        placeholderThreshold: {
          percentage: Math.round(placeholderPercentage * 10) / 10,
          isValid: placeholderPercentage <= 30,
          message: placeholderPercentage > 30 ? `Too many placeholders (${placeholderPercentage.toFixed(1)}%). Maximum is 30%.` : undefined
        },
        canRender: placeholderPercentage <= 30 && totalSegments > 0,
        renderBlockReason: totalSegments === 0 ? 'No segments' : placeholderPercentage > 30 ? `Too many placeholders (${placeholderPercentage.toFixed(1)}%)` : null
      })

    } catch (err) {
      setError('Failed to load storyboard')
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSelectAsset = async (segmentId: string, assetId: string) => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/projects/${params.id}/segments/${segmentId}/select-asset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session.user.id
        },
        body: JSON.stringify({ assetId })
      })

      if (response.ok) {
        fetchData()
      }
    } catch (err) {
      console.error('Failed to select asset', err)
    }
  }

  const handleRegenerateAssets = async (segmentId: string) => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch(`/api/projects/${params.id}/segments/${segmentId}/regenerate-assets`, {
        method: 'POST',
        headers: {
          'x-user-id': session.user.id
        }
      })
    } catch (err) {
      console.error('Failed to regenerate assets', err)
    }
  }

  const handleSaveText = async (segmentId: string, text: string) => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/projects/${params.id}/segments/${segmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session.user.id
        },
        body: JSON.stringify({ text })
      })

      if (response.ok) {
        fetchData()
      }
    } catch (err) {
      console.error('Failed to save text', err)
    }
  }

  const handleSetSilent = async (segmentId: string, isSilent: boolean, duration?: number) => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/projects/${params.id}/segments/${segmentId}/silence`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session.user.id
        },
        body: JSON.stringify({ isSilent, duration })
      })

      if (response.ok) {
        fetchData()
      }
    } catch (err) {
      console.error('Failed to set silent', err)
    }
  }

  const handleSetPlaceholder = async (segmentId: string, color: string) => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/projects/${params.id}/segments/${segmentId}/set-placeholder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session.user.id
        },
        body: JSON.stringify({ color })
      })

      if (response.ok) {
        fetchData()
      }
    } catch (err) {
      console.error('Failed to set placeholder', err)
    }
  }

  const toggleExpanded = (segmentId: string) => {
    const newExpanded = new Set(expandedSegments)
    if (newExpanded.has(segmentId)) {
      newExpanded.delete(segmentId)
    } else {
      newExpanded.add(segmentId)
    }
    setExpandedSegments(newExpanded)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'has_asset': return 'bg-success/20 text-success border-success/30'
      case 'placeholder': return 'bg-warning/20 text-warning border-warning/30'
      case 'needs_selection': return 'bg-tertiary/20 text-tertiary border-tertiary/30'
      default: return 'bg-black-800 text-secondary border-black-700'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-orange-glow border-t-transparent rounded-full animate-spin mx-auto mb-lg"></div>
          <p className="text-secondary">Loading storyboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black-950">
        <header className="border-b border-black-800 bg-black-900">
          <div className="max-w-7xl mx-auto px-3xl py-xl">
            <Link href="/dashboard" className="text-3xl font-display font-bold text-orange-glow">
              Stage9
            </Link>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-3xl py-5xl">
          <div className="bg-error/10 border border-error/20 rounded-xl p-3xl text-center">
            <svg className="w-12 h-12 text-error mx-auto mb-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-error text-lg font-medium mb-md">{error}</p>
            <Link
              href={`/dashboard/projects/${params.id}`}
              className="inline-block mt-lg text-sm text-secondary hover:text-orange-glow transition-colors"
            >
              ← Back to Project
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black-950">
      {/* Header */}
      <header className="border-b border-black-800 bg-black-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3xl py-xl flex items-center justify-between">
          <div className="flex items-center space-x-3xl">
            <Link href="/dashboard" className="text-3xl font-display font-bold text-orange-glow">
              Stage9
            </Link>
            <div className="h-8 w-px bg-black-700" />
            <div>
              <h1 className="text-lg font-heading font-semibold text-primary">{project?.title}</h1>
              <p className="text-xs text-tertiary">Storyboard Editor</p>
            </div>
          </div>
          <Link
            href={`/dashboard/projects/${params.id}`}
            className="px-xl py-md bg-transparent border border-black-700 text-secondary text-sm font-medium rounded-lg hover:border-orange-glow hover:text-primary transition-all duration-200"
          >
            Back to Project
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3xl py-4xl">
        {/* Segments List */}
        <div className="space-y-xl mb-4xl">
          {segments.map((segment, index) => {
            const isExpanded = expandedSegments.has(segment.id)

            return (
              <div
                key={segment.id}
                className="bg-black-850 border border-black-800 rounded-xl overflow-hidden transition-all duration-300 hover:border-black-700"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeSlideIn 400ms ease forwards'
                }}
              >
                {/* Segment Header */}
                <div className="px-xl py-lg flex items-center justify-between border-b border-black-800">
                  <div className="flex items-center space-x-lg">
                    <div className="w-10 h-10 rounded-lg bg-black-900 border border-black-700 flex items-center justify-center">
                      <span className="text-sm font-mono text-orange-glow">{segment.segmentNumber}</span>
                    </div>
                    <div>
                      <span className={`text-xs px-md py-xs rounded-md border ${getStatusColor(segment.assetStatus)}`}>
                        {segment.assetStatus === 'has_asset' && 'Asset Selected'}
                        {segment.assetStatus === 'placeholder' && 'Placeholder'}
                        {segment.assetStatus === 'needs_selection' && 'Needs Selection'}
                      </span>
                      {segment.isSilent && (
                        <span className="ml-md text-xs px-md py-xs rounded-md bg-info/20 text-info border border-info/30">
                          Silent ({segment.silentDuration}s)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-lg">
                    <span className="text-sm text-tertiary font-mono">
                      {segment.estimatedDuration.toFixed(1)}s
                    </span>
                    <button
                      onClick={() => setEditingSegment(segment)}
                      className="p-md rounded-lg bg-black-900 border border-black-700 text-secondary hover:text-orange-glow hover:border-orange-glow transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => toggleExpanded(segment.id)}
                      className="p-md rounded-lg bg-black-900 border border-black-700 text-secondary hover:text-primary hover:border-orange-glow transition-all duration-200"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Segment Content */}
                <div className="px-xl py-lg">
                  {/* Text Preview */}
                  <p className={`text-sm text-secondary leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {segment.optimizedText}
                  </p>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-xl pt-xl border-t border-black-700 animate-[fadeIn_200ms_ease]">
                      {/* Asset Carousel */}
                      <AssetCarousel
                        assets={segment.assets || []}
                        selectedAssetId={segment.selectedAssetId}
                        segmentDuration={segment.estimatedDuration}
                        onSelect={(assetId) => handleSelectAsset(segment.id, assetId)}
                        onRegenerate={() => handleRegenerateAssets(segment.id)}
                        disabled={project?.status !== 'ready'}
                      />

                      {/* Placeholder Preview */}
                      {segment.assetStatus === 'placeholder' && (
                        <div className="mt-lg flex items-center space-x-md">
                          <div
                            className="w-16 h-10 rounded-md border border-black-600"
                            style={{ backgroundColor: segment.placeholderColor }}
                          />
                          <span className="text-xs text-tertiary">Placeholder color: {segment.placeholderColor}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {segments.length === 0 && (
            <div className="bg-black-850 border border-black-800 rounded-xl p-5xl text-center">
              <svg className="w-16 h-16 text-tertiary mx-auto mb-xl" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-lg text-secondary font-medium mb-md">No segments yet</p>
              <p className="text-sm text-tertiary">Run the optimization pipeline to generate segments</p>
            </div>
          )}
        </div>

        {/* Summary Bar - Fixed at bottom */}
        {summary && summary.totalSegments > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-black-900 border-t border-black-700 px-3xl py-xl z-30">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              {/* Stats */}
              <div className="flex items-center space-x-4xl">
                <div>
                  <span className="text-xs text-tertiary block">Duration</span>
                  <span className="text-lg font-mono text-primary">{summary.duration.formatted}</span>
                </div>
                <div className="h-8 w-px bg-black-700" />
                <div>
                  <span className="text-xs text-tertiary block">Visual Completion</span>
                  <span className={`text-lg font-mono ${summary.visualCompletion.isComplete ? 'text-success' : 'text-warning'}`}>
                    {summary.visualCompletion.percentage}%
                  </span>
                </div>
                <div className="h-8 w-px bg-black-700" />
                <div>
                  <span className="text-xs text-tertiary block">Placeholders</span>
                  <span className={`text-lg font-mono ${summary.placeholderThreshold.isValid ? 'text-secondary' : 'text-error'}`}>
                    {summary.assetCounts.placeholder}/{summary.totalSegments}
                  </span>
                </div>
                {summary.silentSegments > 0 && (
                  <>
                    <div className="h-8 w-px bg-black-700" />
                    <div>
                      <span className="text-xs text-tertiary block">Silent</span>
                      <span className="text-lg font-mono text-info">{summary.silentSegments}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Render Button */}
              <div className="flex items-center space-x-lg">
                {!summary.canRender && summary.renderBlockReason && (
                  <span className="text-xs text-error">{summary.renderBlockReason}</span>
                )}
                <Link
                  href={summary.canRender ? `/dashboard/projects/${params.id}/render` : '#'}
                  className={`px-3xl py-lg font-medium rounded-lg transition-all duration-300 ${
                    summary.canRender
                      ? 'bg-orange-glow text-black-950 hover:bg-orange-light hover:shadow-glow-orange hover:scale-105 active:scale-[0.98]'
                      : 'bg-black-800 text-tertiary cursor-not-allowed'
                  }`}
                  onClick={(e) => !summary.canRender && e.preventDefault()}
                >
                  Ready to Render
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Padding for Fixed Bar */}
        {summary && summary.totalSegments > 0 && <div className="h-24" />}
      </main>

      {/* Segment Editor Modal */}
      <SegmentEditor
        isOpen={!!editingSegment}
        onClose={() => setEditingSegment(null)}
        segment={editingSegment}
        onSaveText={handleSaveText}
        onSetSilent={handleSetSilent}
        onSetPlaceholder={handleSetPlaceholder}
      />

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
