import type { Metadata } from 'next'
import { Playfair_Display, Lora } from 'next/font/google'
import '../styles/globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Stage9 - AI-Powered Video Generation',
  description: 'Transform your script into a polished YouTube video with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${lora.variable}`}>
      <body>{children}</body>
    </html>
  )
}
