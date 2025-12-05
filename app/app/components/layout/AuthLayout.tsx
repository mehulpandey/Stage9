'use client'

import Link from 'next/link'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-black-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-black-800 py-lg px-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-sm">
            <div className="text-2xl font-display font-bold text-orange-glow">
              Stage9
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-xl py-5xl">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-2xl">
            <h1 className="text-4xl font-display font-bold mb-md text-primary">
              {title}
            </h1>
            {subtitle && (
              <p className="text-secondary text-lg">
                {subtitle}
              </p>
            )}
          </div>

          {/* Form Card */}
          <div className="bg-black-850 border border-black-800 rounded-xl p-2xl shadow-lg">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black-800 py-lg px-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-center space-x-xl text-sm text-tertiary">
          <Link href="/privacy" className="hover:text-secondary transition-colors duration-200">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-secondary transition-colors duration-200">
            Terms
          </Link>
          <Link href="/contact" className="hover:text-secondary transition-colors duration-200">
            Contact
          </Link>
        </div>
      </footer>
    </div>
  )
}
