'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function NewProjectPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [script, setScript] = useState('')
  const [voicePreset, setVoicePreset] = useState('professional_narrator')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const characterCount = script.length
  const minChars = 100
  const maxChars = 50000

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login')
        return
      }

      // Insert project directly into Supabase
      const { data: project, error: insertError } = await supabase
        .from('projects')
        .insert({
          user_id: session.user.id,
          title,
          original_script: script,
          voice_preset_id: voicePreset,
          status: 'draft'
        })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }

      // Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black-950">
      {/* Header */}
      <header className="border-b border-black-800 bg-black-900">
        <div className="max-w-6xl mx-auto px-2xl py-lg flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-display font-bold text-orange-glow">
            Stage9
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-2xl py-3xl">
        {/* Page Header */}
        <div className="mb-2xl">
          <Link
            href="/dashboard"
            className="text-sm text-secondary hover:text-orange-glow transition-colors duration-200 mb-md inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-display font-bold text-primary mb-sm">
            New Project
          </h1>
          <p className="text-base text-secondary">Create a new video project from your script</p>
        </div>

        {/* Form */}
        <div className="bg-black-850 border border-black-800 rounded-xl p-2xl">
          <form onSubmit={handleSubmit} className="space-y-2xl">
            {/* Error Message */}
            {error && (
              <div className="bg-error/10 border border-error/20 rounded-lg p-lg text-sm text-error">
                {error}
              </div>
            )}

            {/* Title Field */}
            <div className="space-y-md">
              <label htmlFor="title" className="block text-base font-medium text-secondary">
                Project Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={255}
                className="w-full px-lg py-lg bg-black-900 border border-black-700 rounded-lg text-primary placeholder:text-gray-400 focus:border-orange-glow focus:outline-none focus:ring-1 focus:ring-orange-glow/20 transition-all duration-300"
                placeholder="My Awesome Video"
              />
            </div>

            {/* Script Field */}
            <div className="space-y-md">
              <div className="flex items-center justify-between">
                <label htmlFor="script" className="block text-base font-medium text-secondary">
                  Script
                </label>
                <span className={`text-sm ${characterCount < minChars || characterCount > maxChars ? 'text-error' : 'text-tertiary'}`}>
                  {characterCount.toLocaleString()} / {maxChars.toLocaleString()} characters
                </span>
              </div>
              <textarea
                id="script"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                required
                rows={14}
                className="w-full px-lg py-lg bg-black-900 border border-black-700 rounded-lg text-primary placeholder:text-gray-400 focus:border-orange-glow focus:outline-none focus:ring-1 focus:ring-orange-glow/20 transition-all duration-300 resize-none font-mono text-sm leading-relaxed"
                placeholder="Enter your video script here..."
              />
              {characterCount < minChars && (
                <p className="text-xs text-error">
                  Script must be at least {minChars} characters ({minChars - characterCount} more needed)
                </p>
              )}
              {characterCount > maxChars && (
                <p className="text-xs text-error">
                  Script exceeds maximum length by {characterCount - maxChars} characters
                </p>
              )}
            </div>

            {/* Voice Preset Field */}
            <div className="space-y-md">
              <label htmlFor="voice" className="block text-base font-medium text-secondary">
                Voice Style
              </label>
              <select
                id="voice"
                value={voicePreset}
                onChange={(e) => setVoicePreset(e.target.value)}
                className="w-full px-lg py-lg bg-black-900 border border-black-700 rounded-lg text-primary focus:border-orange-glow focus:outline-none focus:ring-1 focus:ring-orange-glow/20 transition-all duration-300"
              >
                <option value="professional_narrator">Professional Narrator</option>
                <option value="energetic_host">Energetic Host</option>
                <option value="calm_educator">Calm Educator</option>
              </select>
              <p className="text-sm text-tertiary">
                Choose the voice style that best fits your content
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex items-center space-x-md pt-lg">
              <button
                type="submit"
                disabled={loading || characterCount < minChars || characterCount > maxChars}
                className="flex-1 px-2xl py-md bg-orange-glow border-2 border-orange-glow text-primary font-medium rounded-lg hover:bg-orange-light hover:border-orange-light hover:shadow-glow-orange hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-sm">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Creating project...</span>
                  </span>
                ) : (
                  'Create Project'
                )}
              </button>
              <Link
                href="/dashboard"
                className="px-2xl py-md bg-transparent border-2 border-black-700 text-secondary font-medium rounded-lg hover:border-orange-glow hover:text-primary hover:shadow-glow-orange hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
