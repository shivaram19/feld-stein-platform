"use client"

import { useVoice } from "@/hooks/useVoice"

// ─────────────────────────────────────────────────────────────────────────────
// VoiceSearch — Mic button for hands-free product search
// Integrates into the Shop page search bar.
// ─────────────────────────────────────────────────────────────────────────────

interface VoiceSearchProps {
  onSearch: (query: string) => void
}

export function VoiceSearch({ onSearch }: VoiceSearchProps) {
  const { isListening, isSupported, startListening, stopListening } = useVoice()

  if (!isSupported) return null

  function handleClick() {
    if (isListening) {
      stopListening()
    } else {
      startListening((transcript, isFinal) => {
        if (isFinal && transcript.trim()) {
          onSearch(transcript.trim())
          stopListening()
        }
      })
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`p-2 rounded-lg transition-all ${
        isListening
          ? "bg-danger text-white animate-pulse"
          : "bg-surface text-secondary hover:text-brand-green hover:bg-brand-green/10"
      }`}
      aria-label={isListening ? "Stop voice search" : "Search by voice"}
      title={isListening ? "Listening..." : "Search by voice"}
    >
      {isListening ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      )}
    </button>
  )
}
