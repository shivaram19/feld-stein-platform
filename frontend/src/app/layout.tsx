import type { Metadata } from "next"
import { Cormorant, Sora, IBM_Plex_Mono } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import BehavioralCollector from "@/components/BehavioralCollector"
import { VoiceAssistant } from "@/components/VoiceAssistant"

const cormorant = Cormorant({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
})

const sora = Sora({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Feld & Stein — Cold-Pressed Oils from Andhra Pradesh",
  description: "Stone-pressed, wood-pressed, and Gaanuga cold-pressed oils. Groundnut, coconut, sesame, and mustard oils delivered fresh from Guntur to your kitchen.",
  keywords: ["cold pressed oil", "groundnut oil", "coconut oil", "sesame oil", "mustard oil", "Andhra Pradesh", "Guntur"],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 2026: Generate a stable session token for behavioral biometrics.
  // Client-side AI collects events; server analyzes for fraud detection [^LAY1].
  // [^LAY1]: Dev.to Isocyanide. (2026). 2026 Web Dev Trends That Actually Matter.
  const sessionToken = typeof crypto !== "undefined" ? crypto.randomUUID() : `sess_${Date.now()}`

  return (
    <html lang="en" className={`${cormorant.variable} ${sora.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-screen bg-canvas text-primary font-body antialiased">
        <Header />
        {children}
        <Footer />
        <BehavioralCollector
          sessionToken={sessionToken}
          apiUrl={process.env.NEXT_PUBLIC_API_URL || "http://localhost:3007/api/v1"}
        />
        <VoiceAssistant />
      </body>
    </html>
  )
}
