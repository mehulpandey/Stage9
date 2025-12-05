import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black-950 flex flex-col items-center justify-center px-xl">
      <div className="text-center space-y-2xl max-w-3xl">
        <h1 className="text-6xl font-display font-bold text-primary mb-lg">
          Stage<span className="text-orange-glow">9</span>
        </h1>
        <p className="text-2xl text-secondary font-heading">
          AI-Powered Video Generation Platform
        </p>
        <p className="text-lg text-tertiary max-w-2xl mx-auto">
          Transform your script into a polished long-form YouTube video with AI voiceover,
          stock-sourced visuals, and professional rendering.
        </p>
        <div className="flex items-center justify-center space-x-lg pt-xl">
          <Link
            href="/auth/signup"
            className="px-2xl py-md bg-orange-glow border-2 border-orange-glow text-primary font-medium rounded-lg hover:bg-orange-light hover:border-orange-light hover:shadow-glow-orange hover:scale-105 transition-all duration-300"
          >
            Get Started
          </Link>
          <Link
            href="/auth/login"
            className="px-2xl py-md bg-transparent border-2 border-black-700 text-secondary font-medium rounded-lg hover:border-orange-glow hover:text-primary hover:shadow-glow-orange hover:scale-105 transition-all duration-300"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
