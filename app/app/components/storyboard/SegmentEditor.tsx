'use client'

import { useState, useEffect } from 'react'

interface SegmentEditorProps {
  isOpen: boolean
  onClose: () => void
  segment: {
    id: string
    segmentNumber: number
    optimizedText: string
    estimatedDuration: number
    isSilent: boolean
    silentDuration: number | null
    placeholderColor: string
  } | null
  onSaveText: (segmentId: string, text: string) => Promise<void>
  onSetSilent: (segmentId: string, isSilent: boolean, duration?: number) => Promise<void>
  onSetPlaceholder: (segmentId: string, color: string) => Promise<void>
}

const PLACEHOLDER_COLORS = [
  { name: 'Charcoal', value: '#2a2a2a' },
  { name: 'Slate', value: '#3a3a3a' },
  { name: 'Midnight', value: '#1a1a2e' },
  { name: 'Forest', value: '#1a2e1a' },
  { name: 'Deep Sea', value: '#1a2a3a' },
  { name: 'Burgundy', value: '#3a1a1a' },
  { name: 'Purple', value: '#2a1a3a' },
  { name: 'Orange Dim', value: '#3a2a1a' },
]

export default function SegmentEditor({
  isOpen,
  onClose,
  segment,
  onSaveText,
  onSetSilent,
  onSetPlaceholder
}: SegmentEditorProps) {
  const [text, setText] = useState('')
  const [isSilent, setIsSilent] = useState(false)
  const [silentDuration, setSilentDuration] = useState(3)
  const [placeholderColor, setPlaceholderColor] = useState('#2a2a2a')
  const [activeTab, setActiveTab] = useState<'text' | 'silence' | 'placeholder'>('text')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (segment) {
      setText(segment.optimizedText)
      setIsSilent(segment.isSilent)
      setSilentDuration(segment.silentDuration || 3)
      setPlaceholderColor(segment.placeholderColor || '#2a2a2a')
    }
  }, [segment])

  if (!isOpen || !segment) return null

  const handleSaveText = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      await onSaveText(segment.id, text)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleSetSilent = async () => {
    setSaving(true)
    try {
      await onSetSilent(segment.id, !segment.isSilent, silentDuration)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleSetPlaceholder = async () => {
    setSaving(true)
    try {
      await onSetPlaceholder(segment.id, placeholderColor)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-[fadeIn_200ms_ease]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black-950/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-lg bg-black-850 border border-black-700 rounded-2xl shadow-2xl animate-[slideUp_300ms_ease]">
        {/* Header */}
        <div className="flex items-center justify-between px-3xl py-xl border-b border-black-700">
          <div>
            <h2 className="text-xl font-heading font-semibold text-primary">
              Edit Segment {segment.segmentNumber}
            </h2>
            <p className="text-sm text-tertiary mt-xs">
              Duration: {segment.estimatedDuration.toFixed(1)}s
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black-800 border border-black-700 flex items-center justify-center text-secondary hover:text-primary hover:border-orange-glow transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-black-700">
          {(['text', 'silence', 'placeholder'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-xl py-lg text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
                activeTab === tab
                  ? 'text-orange-glow border-orange-glow'
                  : 'text-secondary hover:text-primary border-transparent'
              }`}
            >
              {tab === 'text' && 'Edit Text'}
              {tab === 'silence' && 'Silent Mode'}
              {tab === 'placeholder' && 'Placeholder'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-3xl">
          {/* Text Tab */}
          {activeTab === 'text' && (
            <div className="space-y-xl">
              <div>
                <label className="block text-sm text-tertiary mb-md">Segment Text</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  className="w-full px-xl py-lg bg-black-900 border border-black-700 rounded-lg text-primary placeholder:text-tertiary focus:border-orange-glow focus:outline-none focus:ring-1 focus:ring-orange-glow/30 transition-all duration-200 resize-none font-mono text-sm leading-relaxed"
                  placeholder="Enter segment text..."
                />
                <div className="flex justify-between mt-md">
                  <span className="text-xs text-tertiary">{text.length} characters</span>
                  <span className="text-xs text-tertiary">~{Math.ceil(text.split(/\s+/).length / 2.5)}s estimated</span>
                </div>
              </div>
              <button
                onClick={handleSaveText}
                disabled={saving || !text.trim()}
                className="w-full px-xl py-lg bg-transparent border-2 border-orange-glow text-orange-glow font-medium rounded-lg hover:bg-orange-glow/10 hover:shadow-glow-orange hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Silent Tab */}
          {activeTab === 'silence' && (
            <div className="space-y-xl">
              <div className="bg-black-900 border border-black-700 rounded-lg p-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium text-primary">Silent Segment</h3>
                    <p className="text-sm text-tertiary mt-xs">
                      Skip voiceover for this segment. Only visual content will be shown.
                    </p>
                  </div>
                  <div className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${
                    isSilent ? 'bg-orange-glow' : 'bg-black-700'
                  }`}>
                    <button
                      onClick={() => setIsSilent(!isSilent)}
                      className={`absolute top-1 w-6 h-6 rounded-full bg-primary shadow-md transition-all duration-200 ${
                        isSilent ? 'left-7' : 'left-1'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {isSilent && (
                <div>
                  <label className="block text-sm text-tertiary mb-md">Silent Duration (seconds)</label>
                  <div className="flex items-center space-x-xl">
                    <input
                      type="range"
                      min={0.5}
                      max={30}
                      step={0.5}
                      value={silentDuration}
                      onChange={(e) => setSilentDuration(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-black-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-glow [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <span className="w-16 text-right text-primary font-mono">{silentDuration}s</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleSetSilent}
                disabled={saving}
                className="w-full px-xl py-lg bg-transparent border-2 border-orange-glow text-orange-glow font-medium rounded-lg hover:bg-orange-glow/10 hover:shadow-glow-orange hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : segment.isSilent ? 'Remove Silent Mode' : 'Enable Silent Mode'}
              </button>
            </div>
          )}

          {/* Placeholder Tab */}
          {activeTab === 'placeholder' && (
            <div className="space-y-xl">
              <div>
                <label className="block text-sm text-tertiary mb-md">Placeholder Background Color</label>
                <p className="text-xs text-tertiary mb-lg">
                  Use a colored background instead of stock footage for this segment.
                </p>
                <div className="grid grid-cols-4 gap-md">
                  {PLACEHOLDER_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setPlaceholderColor(color.value)}
                      className={`relative aspect-video rounded-lg transition-all duration-200 ${
                        placeholderColor === color.value
                          ? 'ring-2 ring-orange-glow scale-105'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                    >
                      {placeholderColor === color.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-5 h-5 text-orange-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      <span className="absolute bottom-sm left-sm text-[10px] text-white/70">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-tertiary mb-md">Custom Color</label>
                <div className="flex items-center space-x-md">
                  <input
                    type="color"
                    value={placeholderColor}
                    onChange={(e) => setPlaceholderColor(e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-2 border-black-700"
                  />
                  <input
                    type="text"
                    value={placeholderColor}
                    onChange={(e) => setPlaceholderColor(e.target.value)}
                    className="flex-1 px-lg py-md bg-black-900 border border-black-700 rounded-lg text-primary font-mono text-sm focus:border-orange-glow focus:outline-none transition-colors"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <button
                onClick={handleSetPlaceholder}
                disabled={saving}
                className="w-full px-xl py-lg bg-transparent border-2 border-orange-glow text-orange-glow font-medium rounded-lg hover:bg-orange-glow/10 hover:shadow-glow-orange hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Set as Placeholder'}
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
