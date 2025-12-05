'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Project {
  id: string
  title: string
  status: 'draft' | 'processing' | 'ready' | 'rendering' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    checkAuthAndFetchProjects()
  }, [])

  const checkAuthAndFetchProjects = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login')
        return
      }

      // Fetch projects directly from Supabase
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, title, status, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (projectsError) {
        setError('Failed to load projects')
        return
      }

      setProjects(projectsData || [])
    } catch (err) {
      setError('Failed to load projects')
    } finally {
      setLoading(false)
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

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black-950 flex items-center justify-center">
        <div className="text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black-950">
      {/* Header */}
      <header className="border-b border-black-800 bg-black-900">
        <div className="max-w-6xl mx-auto px-2xl py-lg flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-display font-bold text-orange-glow">
            Stage9
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-secondary hover:text-orange-glow transition-colors duration-200"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-2xl py-3xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-2xl">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary mb-sm">
              Your Projects
            </h1>
            <p className="text-base text-secondary">Create and manage your video projects</p>
          </div>
          <Link
            href="/dashboard/new"
            className="px-xl py-md bg-orange-glow text-primary font-medium rounded-lg hover:bg-orange-light hover:shadow-glow-orange transition-all duration-300"
          >
            New Project
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-error/10 border border-error/20 rounded-lg p-md text-sm text-error mb-xl">
            {error}
          </div>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-4xl">
            <div className="bg-black-850 border border-black-800 rounded-xl p-3xl max-w-md mx-auto">
              <h3 className="text-2xl font-heading font-semibold text-primary mb-md">
                No projects yet
              </h3>
              <p className="text-base text-secondary mb-2xl">
                Get started by creating your first video project
              </p>
              <Link
                href="/dashboard/new"
                className="inline-block px-2xl py-md bg-orange-glow text-primary font-medium rounded-lg hover:bg-orange-light hover:shadow-glow-orange transition-all duration-300"
              >
                Create First Project
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-xl">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="bg-black-850 border border-black-800 rounded-xl p-xl hover:border-orange-glow hover:shadow-glow-orange transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-md">
                  <h3 className="text-xl font-heading font-semibold text-primary group-hover:text-orange-glow transition-colors duration-300">
                    {project.title}
                  </h3>
                  <span className={`text-xs px-sm py-xs border rounded whitespace-nowrap ml-md ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                <p className="text-sm text-tertiary">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
