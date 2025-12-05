'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Segment {
  id: string
  segment_number: number
  text: string
  duration: number
  asset_status: string
  tts_audio_url: string | null
}

interface Project {
  id: string
  title: string
  status: 'draft' | 'processing' | 'ready' | 'rendering' | 'completed' | 'failed'
  original_script: string
  optimized_script: string | null
  voice_preset_id: string
  created_at: string
  updated_at: string
  segments: Segment[]
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showScript, setShowScript] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processError, setProcessError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editScript, setEditScript] = useState('')
  const [editVoice, setEditVoice] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const VOICE_PRESETS = [
    { id: 'professional_narrator', label: 'Professional Narrator' },
    { id: 'energetic_host', label: 'Energetic Host' },
    { id: 'calm_educator', label: 'Calm Educator' },
  ]

  useEffect(() => {
    fetchProject()
  }, [])

  const fetchProject = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login')
        return
      }

      // Fetch project directly from Supabase
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .single()

      if (projectError) {
        setError('Failed to load project')
        return
      }

      setProject(projectData)
    } catch (err) {
      setError('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }

    setDeleting(true)
    try {
      const supabase = createClient()

      // Delete project directly from Supabase
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', params.id)

      if (deleteError) {
        setError('Failed to delete project')
        setDeleting(false)
        setDeleteConfirm(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('Failed to delete project')
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  const handleProcessScript = async () => {
    if (!project) return

    setProcessing(true)
    setProcessError('')

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(`/api/projects/${project.id}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session.user.id
        }
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setProcessError(result.error?.message || 'Failed to process script')
        return
      }

      // Refresh project data to get new status
      await fetchProject()
    } catch (err) {
      setProcessError('Failed to process script. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleStartEdit = () => {
    if (!project) return
    setEditTitle(project.title)
    setEditScript(project.original_script)
    setEditVoice(project.voice_preset_id)
    setSaveError('')
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setSaveError('')
  }

  const handleSaveEdit = async () => {
    if (!project) return

    setSaving(true)
    setSaveError('')

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('projects')
        .update({
          title: editTitle.trim(),
          original_script: editScript.trim(),
          voice_preset_id: editVoice,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id)

      if (updateError) {
        setSaveError('Failed to save changes')
        return
      }

      setIsEditing(false)
      await fetchProject()
    } catch (err) {
      setSaveError('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
      case 'processing': return 'text-info bg-info/10 border-info/20'
      case 'ready': return 'text-success bg-success/10 border-success/20'
      case 'rendering': return 'text-warning bg-warning/10 border-warning/20'
      case 'completed': return 'text-success bg-success/10 border-success/20'
      case 'failed': return 'text-error bg-error/10 border-error/20'
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black-950 flex items-center justify-center">
        <div className="text-secondary">Loading...</div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-black-950">
        <header className="border-b border-black-800 bg-black-900">
          <div className="max-w-7xl mx-auto px-2xl py-lg">
            <Link href="/dashboard" className="text-2xl font-display font-bold text-orange-glow">
              Stage9
            </Link>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-2xl py-5xl">
          <div className="bg-error/10 border border-error/20 rounded-lg p-xl text-center">
            <p className="text-error">{error || 'Project not found'}</p>
            <Link
              href="/dashboard"
              className="inline-block mt-lg text-sm text-secondary hover:text-primary transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black-950">
      {/* Header */}
      <header className="border-b border-black-800 bg-black-900">
        <div className="max-w-7xl mx-auto px-3xl py-xl flex items-center justify-between">
          <Link href="/dashboard" className="text-3xl font-display font-bold text-orange-glow">
            Stage9
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-3xl py-4xl">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="text-sm text-secondary hover:text-orange-glow hover:scale-105 transition-all duration-200 mb-3xl inline-block"
        >
          ← Back to Dashboard
        </Link>

        {/* Project Header */}
        <div className="bg-black-850 border border-black-800 rounded-xl p-3xl mb-3xl">
          <div className="flex items-start justify-between mb-xl">
            <div className="flex-1">
              <h1 className="text-4xl font-display font-bold text-primary mb-lg">
                {project.title}
              </h1>
              <div className="flex items-center space-x-xl">
                <span className={`text-sm px-lg py-sm border rounded-md ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                <span className="text-sm text-tertiary">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            {/* Edit button - only for draft projects */}
            {project.status === 'draft' && !isEditing && (
              <button
                onClick={handleStartEdit}
                className="px-lg py-sm bg-transparent border border-black-700 text-secondary text-sm font-medium rounded-lg hover:border-orange-glow hover:text-orange-glow transition-all duration-200"
              >
                Edit Project
              </button>
            )}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl pt-xl border-t border-black-700">
            <div>
              <p className="text-sm text-tertiary mb-sm">Voice Style</p>
              <p className="text-base text-primary font-medium">{project.voice_preset_id.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-tertiary mb-sm">Last Updated</p>
              <p className="text-base text-primary font-medium">{new Date(project.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Edit Form - Only for draft projects */}
        {isEditing && project.status === 'draft' && (
          <div className="bg-black-850 border border-orange-glow/50 rounded-xl p-3xl mb-3xl animate-[fadeIn_200ms_ease-in]">
            <h2 className="text-2xl font-heading font-semibold text-primary mb-xl">Edit Project</h2>

            {saveError && (
              <div className="bg-error/10 border border-error/20 rounded-lg p-lg mb-xl">
                <p className="text-error text-sm">{saveError}</p>
              </div>
            )}

            <div className="space-y-xl">
              {/* Title */}
              <div>
                <label className="block text-sm text-tertiary mb-md">Project Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-lg py-md bg-black-900 border border-black-700 rounded-lg text-primary placeholder:text-tertiary focus:border-orange-glow focus:outline-none transition-colors"
                  placeholder="Enter project title..."
                />
              </div>

              {/* Voice Preset */}
              <div>
                <label className="block text-sm text-tertiary mb-md">Voice Style</label>
                <select
                  value={editVoice}
                  onChange={(e) => setEditVoice(e.target.value)}
                  className="w-full px-lg py-md bg-black-900 border border-black-700 rounded-lg text-primary focus:border-orange-glow focus:outline-none transition-colors"
                >
                  {VOICE_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Script */}
              <div>
                <label className="block text-sm text-tertiary mb-md">Script</label>
                <textarea
                  value={editScript}
                  onChange={(e) => setEditScript(e.target.value)}
                  rows={10}
                  className="w-full px-lg py-md bg-black-900 border border-black-700 rounded-lg text-primary placeholder:text-tertiary focus:border-orange-glow focus:outline-none transition-colors resize-none font-mono text-sm leading-relaxed"
                  placeholder="Enter your script..."
                />
                <p className="text-xs text-tertiary mt-sm">{editScript.length} characters</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-lg pt-lg border-t border-black-700">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editTitle.trim() || !editScript.trim()}
                  className="px-3xl py-md bg-orange-glow border-2 border-orange-glow text-black-950 font-medium rounded-lg hover:bg-orange-light hover:border-orange-light hover:shadow-glow-orange hover:scale-105 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-3xl py-md bg-transparent border-2 border-black-700 text-secondary font-medium rounded-lg hover:border-orange-glow hover:text-primary transition-all duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Script Section */}
        <div className="bg-black-850 border border-black-800 rounded-xl p-3xl mb-3xl">
          <button
            onClick={() => setShowScript(!showScript)}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-2xl font-heading font-semibold text-primary">Script</h2>
            <svg
              className={`w-6 h-6 text-secondary transition-transform duration-200 ${showScript ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showScript && (
            <div className="mt-xl pt-xl border-t border-black-700 animate-[fadeIn_200ms_ease-in]">
              <pre className="text-sm text-secondary whitespace-pre-wrap font-mono bg-black-900 p-xl rounded-lg leading-relaxed">
                {project.optimized_script || project.original_script}
              </pre>
            </div>
          )}
        </div>

        {/* Segments (if ready) */}
        {project.segments && project.segments.length > 0 && (
          <div className="bg-black-850 border border-black-800 rounded-xl p-3xl mb-3xl">
            <h2 className="text-2xl font-heading font-semibold text-primary mb-xl">
              Segments ({project.segments.length})
            </h2>
            <div className="space-y-lg">
              {project.segments.map((segment) => (
                <div key={segment.id} className="bg-black-900 p-xl rounded-lg border border-black-700">
                  <div className="flex items-center justify-between mb-md">
                    <span className="text-sm text-tertiary font-medium">Segment {segment.segment_number}</span>
                    <span className="text-xs text-tertiary px-md py-xs bg-black-800 rounded-md">{segment.duration}s</span>
                  </div>
                  <p className="text-sm text-secondary leading-relaxed">{segment.text.substring(0, 100)}...</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Process Error */}
        {processError && (
          <div className="bg-error/10 border border-error/20 rounded-lg p-xl mb-xl">
            <p className="text-error text-sm">{processError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-lg flex-wrap gap-y-lg">
          {/* Process Script Button - Show when project is in draft */}
          {project.status === 'draft' && (
            <button
              onClick={handleProcessScript}
              disabled={processing}
              className="px-3xl py-lg bg-orange-glow border-2 border-orange-glow text-black-950 font-medium rounded-lg hover:bg-orange-light hover:border-orange-light hover:shadow-glow-orange hover:scale-105 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {processing ? (
                <span className="flex items-center space-x-md">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Processing...</span>
                </span>
              ) : (
                'Process Script'
              )}
            </button>
          )}

          {/* Processing indicator */}
          {project.status === 'processing' && (
            <div className="px-3xl py-lg bg-info/10 border-2 border-info text-info font-medium rounded-lg flex items-center space-x-md">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Processing Script...</span>
            </div>
          )}

          {/* Storyboard Button - Show when project is ready */}
          {(project.status === 'ready' || project.status === 'rendering' || project.status === 'completed') && (
            <Link
              href={`/dashboard/projects/${project.id}/storyboard`}
              className="px-3xl py-lg bg-transparent border-2 border-orange-glow text-orange-glow font-medium rounded-lg hover:bg-orange-glow/10 hover:shadow-glow-orange hover:scale-105 active:scale-[0.98] transition-all duration-300"
            >
              Edit Storyboard
            </Link>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting || project.status === 'rendering'}
            className={`px-3xl py-lg border-2 font-medium rounded-lg transition-all duration-300 ${
              deleteConfirm
                ? 'bg-error border-error text-primary hover:bg-red-600 hover:border-red-600 hover:scale-105'
                : 'bg-transparent border-black-700 text-secondary hover:border-error hover:text-error hover:scale-105'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
          >
            {deleting ? 'Deleting...' : deleteConfirm ? 'Confirm Delete?' : 'Delete Project'}
          </button>
          {deleteConfirm && (
            <button
              onClick={() => setDeleteConfirm(false)}
              className="px-3xl py-lg bg-transparent border-2 border-black-700 text-secondary font-medium rounded-lg hover:border-orange-glow hover:text-primary hover:shadow-glow-orange hover:scale-105 active:scale-[0.98] transition-all duration-300"
            >
              Cancel
            </button>
          )}
        </div>
      </main>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
