'use client'

import { useState } from 'react'

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

interface AssetCarouselProps {
  assets: Asset[]
  selectedAssetId: string | null
  segmentDuration: number
  onSelect: (assetId: string) => void
  onRegenerate: () => void
  disabled?: boolean
}

export default function AssetCarousel({
  assets,
  selectedAssetId,
  segmentDuration,
  onSelect,
  onRegenerate,
  disabled = false
}: AssetCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const calculateMismatch = (assetDuration: number | null) => {
    if (!assetDuration) return { percent: 0, level: 'unknown' as const }
    const diff = Math.abs(assetDuration - segmentDuration) / segmentDuration
    if (diff <= 0.05) return { percent: diff * 100, level: 'good' as const }
    if (diff <= 0.2) return { percent: diff * 100, level: 'warn' as const }
    return { percent: diff * 100, level: 'block' as const }
  }

  const getMismatchColor = (level: 'good' | 'warn' | 'block' | 'unknown') => {
    switch (level) {
      case 'good': return 'text-success'
      case 'warn': return 'text-warning'
      case 'block': return 'text-error'
      default: return 'text-tertiary'
    }
  }

  const visibleAssets = assets.slice(currentIndex, currentIndex + 3)
  const canGoBack = currentIndex > 0
  const canGoForward = currentIndex + 3 < assets.length

  if (assets.length === 0) {
    return (
      <div className="bg-black-900 border border-black-700 rounded-lg p-xl">
        <div className="text-center py-xl">
          <div className="w-16 h-16 mx-auto mb-lg rounded-full bg-black-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-secondary text-sm mb-lg">No asset suggestions yet</p>
          <button
            onClick={onRegenerate}
            disabled={disabled}
            className="px-xl py-md bg-transparent border border-orange-glow text-orange-glow text-sm font-medium rounded-lg hover:bg-orange-glow/10 hover:shadow-glow-orange transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Suggestions
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black-900 border border-black-700 rounded-lg p-lg">
      <div className="flex items-center justify-between mb-lg">
        <span className="text-sm text-tertiary font-medium">Asset Suggestions</span>
        <button
          onClick={onRegenerate}
          disabled={disabled}
          className="text-xs text-secondary hover:text-orange-glow transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4 inline mr-xs" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Regenerate
        </button>
      </div>

      <div className="flex items-center space-x-md">
        {/* Previous Button */}
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={!canGoBack || disabled}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-black-800 border border-black-700 flex items-center justify-center text-secondary hover:text-primary hover:border-orange-glow transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Asset Cards */}
        <div className="flex-1 grid grid-cols-3 gap-md">
          {visibleAssets.map((asset) => {
            const mismatch = calculateMismatch(asset.duration)
            const isSelected = selectedAssetId === asset.id
            const isBlocked = mismatch.level === 'block'

            return (
              <button
                key={asset.id}
                onClick={() => !isBlocked && !disabled && onSelect(asset.id)}
                onMouseEnter={() => setHoveredId(asset.id)}
                onMouseLeave={() => setHoveredId(null)}
                disabled={isBlocked || disabled}
                className={`relative group rounded-lg overflow-hidden transition-all duration-300 ${
                  isSelected
                    ? 'ring-2 ring-orange-glow shadow-glow-orange scale-[1.02]'
                    : isBlocked
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:ring-2 hover:ring-orange-glow/50 hover:scale-[1.02]'
                }`}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-black-800 relative">
                  {asset.thumbnailUrl ? (
                    <img
                      src={asset.thumbnailUrl}
                      alt="Asset thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Asset Type Badge */}
                  <span className="absolute top-sm left-sm px-sm py-xs bg-black-950/80 rounded text-[10px] text-secondary uppercase tracking-wide">
                    {asset.assetType}
                  </span>

                  {/* Duration Badge */}
                  {asset.duration && (
                    <span className={`absolute top-sm right-sm px-sm py-xs bg-black-950/80 rounded text-[10px] ${getMismatchColor(mismatch.level)}`}>
                      {asset.duration.toFixed(1)}s
                    </span>
                  )}

                  {/* Selected Checkmark */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-orange-glow/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-orange-glow flex items-center justify-center">
                        <svg className="w-5 h-5 text-black-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  {hoveredId === asset.id && !isSelected && !isBlocked && (
                    <div className="absolute inset-0 bg-black-950/60 flex items-center justify-center animate-[fadeIn_150ms_ease]">
                      <span className="text-xs text-primary font-medium">Select</span>
                    </div>
                  )}

                  {/* Blocked Overlay */}
                  {isBlocked && (
                    <div className="absolute inset-0 bg-black-950/80 flex items-center justify-center">
                      <span className="text-xs text-error font-medium text-center px-sm">
                        Duration mismatch<br/>too large
                      </span>
                    </div>
                  )}
                </div>

                {/* Duration Mismatch Indicator */}
                {mismatch.level !== 'unknown' && (
                  <div className={`text-[10px] py-xs px-sm bg-black-800 ${getMismatchColor(mismatch.level)}`}>
                    {mismatch.level === 'good' && 'Good match'}
                    {mismatch.level === 'warn' && `${mismatch.percent.toFixed(0)}% speed adjust`}
                    {mismatch.level === 'block' && `${mismatch.percent.toFixed(0)}% too different`}
                  </div>
                )}
              </button>
            )
          })}

          {/* Placeholder cards if less than 3 */}
          {visibleAssets.length < 3 && Array(3 - visibleAssets.length).fill(0).map((_, i) => (
            <div key={`placeholder-${i}`} className="aspect-video bg-black-800 rounded-lg border border-dashed border-black-700 flex items-center justify-center">
              <span className="text-xs text-tertiary">No asset</span>
            </div>
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={() => setCurrentIndex(Math.min(assets.length - 3, currentIndex + 1))}
          disabled={!canGoForward || disabled}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-black-800 border border-black-700 flex items-center justify-center text-secondary hover:text-primary hover:border-orange-glow transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
