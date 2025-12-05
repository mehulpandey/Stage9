'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AuthLayout from '@/components/layout/AuthLayout'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (!data.user) {
        setError('Login failed. Please try again.')
        setLoading(false)
        return
      }

      // Supabase Auth handles session management automatically via cookies
      // Navigate to dashboard
      router.push('/dashboard')
      router.refresh() // Refresh to update server-side session
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to continue creating"
    >
      <form onSubmit={handleSubmit} className="space-y-lg">
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-md text-sm text-red-400 animate-[fadeIn_200ms_ease-in]">
            {error}
          </div>
        )}

        {/* Email Field */}
        <div className="space-y-sm">
          <label htmlFor="email" className="block text-sm font-medium text-secondary">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-lg py-md bg-black-900 border border-black-700 rounded-lg text-primary placeholder:text-gray-400 focus:border-orange-glow focus:outline-none focus:ring-1 focus:ring-orange-glow/20 transition-all duration-300"
            placeholder="you@example.com"
          />
        </div>

        {/* Password Field */}
        <div className="space-y-sm">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-secondary">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-orange-glow hover:text-orange-light transition-colors duration-200"
            >
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-lg py-md bg-black-900 border border-black-700 rounded-lg text-primary placeholder:text-gray-400 focus:border-orange-glow focus:outline-none focus:ring-1 focus:ring-orange-glow/20 transition-all duration-300"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-lg top-1/2 -translate-y-1/2 text-gray-400 hover:text-secondary transition-colors duration-200"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-2xl py-md bg-orange-glow border-2 border-orange-glow text-primary font-medium rounded-lg hover:bg-orange-light hover:border-orange-light hover:shadow-glow-orange hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300"
        >
          {loading ? (
            <span className="flex items-center justify-center space-x-sm">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Signing in...</span>
            </span>
          ) : (
            'Sign In'
          )}
        </button>

        {/* Divider */}
        <div className="relative py-md">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-black-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-md bg-black-850 text-tertiary">New to Stage9?</span>
          </div>
        </div>

        {/* Sign Up Link */}
        <Link
          href="/auth/signup"
          className="block w-full text-center px-2xl py-md bg-transparent border-2 border-black-700 text-secondary font-medium rounded-lg hover:border-orange-glow hover:text-primary hover:shadow-glow-orange hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
        >
          Create Account
        </Link>
      </form>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AuthLayout>
  )
}
