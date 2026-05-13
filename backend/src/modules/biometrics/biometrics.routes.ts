import { Router } from "express"
import { prisma } from "../../lib/prisma"
import { successResponse } from "../../shared/utils/response"
import { AppError } from "../../shared/errors/app-error"
import { ingestEvents, analyzeBehavior, evaluateSession } from "./biometrics.service"

const router = Router()

// POST /api/v1/biometrics/events — Ingest behavioral biometric events
// 2026: Behavioral biometrics enable continuous authentication without
// explicit user friction. Events are analyzed passively in real time [^BR1].
// [^BR1]: PagBrasil. (2026). Payment Trends 2026: The Invisible Era.
router.post("/events", async (req, res, next) => {
  try {
    const { sessionToken, customerId, keystrokeEvents, mouseEvents, touchEvents, deviceType, screenResolution, timezone } = req.body
    if (!sessionToken) throw AppError.badRequest("sessionToken required")

    const session = await ingestEvents({
      sessionToken,
      customerId,
      keystrokeEvents,
      mouseEvents,
      touchEvents,
      deviceType,
      screenResolution,
      timezone,
    })

    successResponse(res, session)
  } catch (err) { next(err) }
})

// POST /api/v1/biometrics/analyze/:customerId — Analyze customer behavior
router.post("/analyze/:customerId", async (req, res, next) => {
  try {
    const result = await analyzeBehavior(req.params.customerId)
    successResponse(res, result)
  } catch (err) { next(err) }
})

// POST /api/v1/biometrics/evaluate — Evaluate session risk in real time
// 2026: Risk scoring is continuous; every 30 seconds during active sessions.
// Critical risk sessions are silently blocked without explicit challenge [^BR2].
// [^BR2]: Newgensoft. (2026). Banking Tech Trends Report 2026.
router.post("/evaluate", async (req, res, next) => {
  try {
    const { sessionToken } = req.body
    if (!sessionToken) throw AppError.badRequest("sessionToken required")

    const result = await evaluateSession(sessionToken)
    successResponse(res, result)
  } catch (err) { next(err) }
})

// GET /api/v1/biometrics/profile/:customerId — Get behavior profile
router.get("/profile/:customerId", async (req, res, next) => {
  try {
    const profile = await prisma.customerBehaviorProfile.findUnique({
      where: { customerId: req.params.customerId },
    })
    successResponse(res, profile)
  } catch (err) { next(err) }
})

export default router
