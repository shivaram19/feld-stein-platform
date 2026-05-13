import { Router } from "express"
import { processVoiceCommand } from "./voice.service"
import { successResponse } from "../../shared/utils/response"
import { AppError } from "../../shared/errors/app-error"

const router = Router()

// POST /api/v1/voice/intent — Process voice transcript into structured command
// 2026: Voice commerce endpoints must return both display text and TTS audio
// hints for multimodal clients [^VI2].
// [^VI2]: Ultracommerce. (2026). Voice-First E-commerce Architecture.
router.post("/intent", async (req, res, next) => {
  try {
    const { transcript, language = "en-IN", customerId } = req.body
    if (!transcript || typeof transcript !== "string") {
      throw AppError.validation("transcript is required")
    }

    const result = await processVoiceCommand(transcript, customerId)

    return successResponse(res, {
      ...result,
      language,
      transcript,
      // Client should use speechSynthesis.speak() with this text
      ttsText: result.message,
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/voice/chat — Voice-enabled AI chat (wraps /ai/chat)
// Returns streaming-friendly response for voice assistants.
router.post("/chat", async (req, res, next) => {
  try {
    const { transcript, phone, language = "english" } = req.body
    if (!transcript) throw AppError.validation("transcript is required")

    // Forward to AI chat service
    // In production, this would call the ai/chat logic directly
    // For now, return a voice-friendly wrapper
    return successResponse(res, {
      reply: "I'm connecting you to our oil expert. One moment please.",
      intent: "CHAT",
      transcript,
      language,
      ttsText: "I'm connecting you to our oil expert. One moment please.",
      action: "AI_CHAT_HANDOFF",
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/v1/voice/supported-languages
router.get("/supported-languages", (_req, res) => {
  successResponse(res, [
    { code: "en-IN", name: "English (India)", enabled: true },
    { code: "te-IN", name: "Telugu", enabled: true },
    { code: "hi-IN", name: "Hindi", enabled: true },
  ])
})

export default router
