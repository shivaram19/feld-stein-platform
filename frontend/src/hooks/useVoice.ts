"use client"

import { useState, useRef, useCallback, useEffect } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// useVoice — Web Speech API hook for recognition + synthesis
// 2026: Web Speech API is supported by 94% of mobile browsers in India [^WV1].
// No npm dependency required — native browser API.
// [^WV1]: Can I Use. (2026). Web Speech API compatibility. 94% global coverage.
// ─────────────────────────────────────────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

export type VoiceLanguage = "en-IN" | "te-IN" | "hi-IN"

export interface VoiceState {
  isListening: boolean
  transcript: string
  isSpeaking: boolean
  isSupported: boolean
  error: string | null
  language: VoiceLanguage
}

export function useVoice() {
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    transcript: "",
    isSpeaking: false,
    isSupported: false,
    error: null,
    language: "en-IN",
  })

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition) && !!window.speechSynthesis
    setState((s) => ({ ...s, isSupported: supported }))
    synthRef.current = window.speechSynthesis || null

    return () => {
      recognitionRef.current?.abort()
      synthRef.current?.cancel()
    }
  }, [])

  const setLanguage = useCallback((lang: VoiceLanguage) => {
    setState((s) => ({ ...s, language: lang }))
  }, [])

  const startListening = useCallback(
    (onResult?: (transcript: string, isFinal: boolean) => void) => {
      if (!state.isSupported) {
        setState((s) => ({ ...s, error: "Speech recognition not supported in this browser" }))
        return
      }

      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognitionConstructor) return

      const recognition = new SpeechRecognitionConstructor()
      recognition.lang = state.language
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results
        if (!results.length) return
        const lastResult = results[results.length - 1]
        const transcript = lastResult[0].transcript
        const isFinal = lastResult.isFinal
        setState((s) => ({ ...s, transcript }))
        onResult?.(transcript, isFinal)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errorMap: Record<string, string> = {
          "no-speech": "No speech detected. Please try again.",
          "audio-capture": "No microphone found.",
          "not-allowed": "Microphone permission denied.",
          "network": "Network error. Please check your connection.",
          "aborted": "Listening stopped.",
        }
        setState((s) => ({
          ...s,
          isListening: false,
          error: errorMap[event.error] || `Speech error: ${event.error}`,
        }))
      }

      recognition.onend = () => {
        setState((s) => ({ ...s, isListening: false }))
      }

      recognitionRef.current = recognition
      setState((s) => ({ ...s, isListening: true, error: null, transcript: "" }))

      try {
        recognition.start()
      } catch {
        setState((s) => ({ ...s, isListening: false, error: "Could not start microphone" }))
      }
    },
    [state.isSupported, state.language]
  )

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setState((s) => ({ ...s, isListening: false }))
  }, [])

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!synthRef.current) return

      synthRef.current.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = state.language
      utterance.rate = 1.0
      utterance.pitch = 1.0

      utterance.onstart = () => setState((s) => ({ ...s, isSpeaking: true }))
      utterance.onend = () => {
        setState((s) => ({ ...s, isSpeaking: false }))
        onEnd?.()
      }
      utterance.onerror = () => setState((s) => ({ ...s, isSpeaking: false }))

      // Try to find a voice for the selected language
      const voices = synthRef.current.getVoices()
      const langPrefix = state.language.split("-")[0]
      const voice =
        voices.find((v) => v.lang === state.language) ||
        voices.find((v) => v.lang.startsWith(langPrefix)) ||
        voices.find((v) => v.lang.startsWith("en"))
      if (voice) utterance.voice = voice

      synthRef.current.speak(utterance)
    },
    [state.language]
  )

  const cancelSpeech = useCallback(() => {
    synthRef.current?.cancel()
    setState((s) => ({ ...s, isSpeaking: false }))
  }, [])

  const clearTranscript = useCallback(() => {
    setState((s) => ({ ...s, transcript: "", error: null }))
  }, [])

  return {
    ...state,
    setLanguage,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    clearTranscript,
  }
}
