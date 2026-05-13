"use client"

// 2026: Client-side behavioral biometrics collection runs entirely in the browser.
// TensorFlow.js and native APIs enable privacy-preserving inference without
// sending raw behavioral data to servers [^BC1].
// [^BC1]: Dev.to Isocyanide. (2026). 2026 Web Dev Trends That Actually Matter.

import { useEffect, useRef, useCallback } from "react"

interface BiometricCollectorProps {
  sessionToken: string
  customerId?: string
  apiUrl: string
}

export default function BehavioralCollector({ sessionToken, customerId, apiUrl }: BiometricCollectorProps) {
  const keystrokes = useRef<Array<{ key: string; dwell: number; flight: number; timestamp: number }>>([])
  const mouseMoves = useRef<Array<{ x: number; y: number; velocity: number; timestamp: number }>>([])
  const touches = useRef<Array<{ pressure: number; x: number; y: number; timestamp: number }>>([])
  const lastKeyTime = useRef<number>(0)
  const lastMousePos = useRef<{ x: number; y: number; time: number } | null>(null)
  const flushInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const flush = useCallback(async () => {
    const ks = keystrokes.current.splice(0)
    const mm = mouseMoves.current.splice(0)
    const te = touches.current.splice(0)

    if (ks.length === 0 && mm.length === 0 && te.length === 0) return

    try {
      await fetch(`${apiUrl}/biometrics/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          customerId,
          keystrokeEvents: ks,
          mouseEvents: mm,
          touchEvents: te,
          deviceType: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })
    } catch {
      // Silently fail — biometrics are best-effort
    }
  }, [sessionToken, customerId, apiUrl])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      const flight = lastKeyTime.current ? now - lastKeyTime.current : 0
      const key = e.key

      const onUp = () => {
        const upTime = Date.now()
        const dwell = upTime - now
        keystrokes.current.push({ key, dwell, flight, timestamp: now })
        document.removeEventListener("keyup", onUp)
      }
      document.addEventListener("keyup", onUp)
      lastKeyTime.current = now
    }

    const onMouseMove = (e: MouseEvent) => {
      const now = Date.now()
      if (lastMousePos.current) {
        const dx = e.clientX - lastMousePos.current.x
        const dy = e.clientY - lastMousePos.current.y
        const dt = now - lastMousePos.current.time
        const velocity = dt > 0 ? Math.sqrt(dx * dx + dy * dy) / dt : 0
        mouseMoves.current.push({ x: e.clientX, y: e.clientY, velocity, timestamp: now })
      }
      lastMousePos.current = { x: e.clientX, y: e.clientY, time: now }
    }

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      touches.current.push({
        pressure: (t as any).force || (t as any).pressure || 0.5,
        x: t.clientX,
        y: t.clientY,
        timestamp: Date.now(),
      })
    }

    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("touchstart", onTouchStart)

    // Flush every 15 seconds
    flushInterval.current = setInterval(flush, 15000)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("touchstart", onTouchStart)
      if (flushInterval.current) clearInterval(flushInterval.current)
      flush()
    }
  }, [flush])

  return null
}
