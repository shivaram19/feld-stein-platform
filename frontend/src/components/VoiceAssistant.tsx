"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useVoice } from "@/hooks/useVoice"

// ─────────────────────────────────────────────────────────────────────────────
// VoiceAssistant — Floating multimodal voice commerce widget
// 2026: Voice assistants must provide both auditory (TTS) and visual (chat bubble)
// feedback for accessibility and noisy-environment usability [^VA1].
// [^VA1]: Voicebot.ai. (2026). Multimodal Voice Commerce UX Guidelines.
// ─────────────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  timestamp: number
}

export function VoiceAssistant() {
  const router = useRouter()
  const {
    isListening,
    transcript,
    isSpeaking,
    isSupported,
    error,
    language,
    setLanguage,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    clearTranscript,
  } = useVoice()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Process final transcript
  useEffect(() => {
    if (!transcript || isListening) return

    const timeout = setTimeout(async () => {
      if (!transcript.trim()) return
      await handleCommand(transcript)
    }, 400)

    return () => clearTimeout(timeout)
  }, [transcript, isListening])

  async function handleCommand(text: string) {
    setIsProcessing(true)
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/voice/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, language }),
      })
      const json = await res.json()
      const data = json.data

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: data.message || "I understood. Let me help you.",
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMsg])

      // Speak response
      if (data.speak && data.ttsText) {
        speak(data.ttsText)
      }

      // Execute navigation after short delay so user hears TTS first
      if (data.navigateTo) {
        setTimeout(() => {
          router.push(data.navigateTo)
        }, data.speak ? 1500 : 100)
      }

      // Handle cart add via API
      if (data.action === "CART_ADD" && data.variantId) {
        const customerId = localStorage.getItem("customerId")
        if (customerId) {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart/items`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-customer-id": customerId,
            },
            body: JSON.stringify({
              variantId: data.variantId,
              quantity: data.quantity || 1,
            }),
          })
        }
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: "Sorry, I couldn't process that. Please try again.",
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsProcessing(false)
      clearTranscript()
    }
  }

  function handleMicClick() {
    if (isListening) {
      stopListening()
    } else {
      cancelSpeech()
      startListening()
    }
  }

  if (!isSupported) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Panel */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-canvas border border-border-subtle rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[28rem]">
          {/* Header */}
          <div className="px-4 py-3 bg-brand-green text-white flex items-center justify-between">
            <div>
              <p className="font-body text-sm font-medium">Feld & Stein Voice</p>
              <p className="text-[10px] opacity-80">Speak in English, Telugu, or Hindi</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="text-[10px] bg-white/20 text-white rounded px-2 py-1 border-0 outline-none"
              >
                <option value="en-IN">English</option>
                <option value="te-IN">Telugu</option>
                <option value="hi-IN">Hindi</option>
              </select>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close voice assistant"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="font-body text-xs text-secondary">
                  Tap the mic and say:
                </p>
                <div className="mt-3 space-y-1.5">
                  {[
                    "Find mustard oil",
                    "Add sesame oil to cart",
                    "Go to checkout",
                    "Where is my order",
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => handleCommand(example)}
                      className="block w-full text-left px-3 py-2 rounded-lg bg-surface text-xs font-body text-secondary hover:bg-brand-green/10 hover:text-brand-green transition-colors"
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl text-xs font-body ${
                    msg.role === "user"
                      ? "bg-brand-green text-white rounded-br-sm"
                      : "bg-surface text-primary rounded-bl-sm border border-border-subtle"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-surface px-3 py-2 rounded-xl rounded-bl-sm border border-border-subtle">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce [animation-delay:0.1s]" />
                    <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <span className="text-[10px] text-danger bg-danger/10 px-3 py-1 rounded-full">
                  {error}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Mic Button */}
          <div className="px-4 py-3 border-t border-border-subtle flex justify-center">
            <button
              onClick={handleMicClick}
              disabled={isProcessing}
              className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                isListening
                  ? "bg-danger text-white animate-pulse shadow-lg shadow-danger/30"
                  : isSpeaking
                  ? "bg-brand-gold text-white"
                  : "bg-brand-green text-white hover:opacity-90 shadow-lg shadow-brand-green/20"
              }`}
              aria-label={isListening ? "Stop listening" : "Start listening"}
            >
              {isListening ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              )}

              {/* Listening ripple */}
              {isListening && (
                <span className="absolute inset-0 rounded-full bg-danger/30 animate-ping" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 ${
            isSpeaking ? "bg-brand-gold text-white" : "bg-brand-green text-white"
          }`}
          aria-label="Open voice assistant"
        >
          {isSpeaking ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      )}
    </div>
  )
}
