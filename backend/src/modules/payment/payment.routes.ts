import { Router } from "express"
import { prisma } from "../../lib/prisma"
import { successResponse } from "../../shared/utils/response"
import { AppError } from "../../shared/errors/app-error"
import { selectGateway, seedOrchestrationRules } from "./payment-orchestration.service"
import { createMandate, verifyMandate, revokeMandate } from "./ap2.service"

const router = Router()

// POST /api/v1/payments/orchestrate — Get gateway recommendation for a payment
// 2026: AI-powered payment routing goes mainstream. Static acquirer relationships
// are obsolete; intelligent routing improves auth rates and lowers costs [^PR1].
// [^PR1]: Trust Payments. (2026). Top trends for online payments in 2026.
router.post("/orchestrate", async (req, res, next) => {
  try {
    const { amount, currency, countryCode, paymentMethod, deviceType, isRecurring } = req.body
    if (!amount || !currency) throw AppError.badRequest("amount and currency required")

    const result = await selectGateway({
      amount,
      currency,
      countryCode,
      paymentMethod,
      deviceType,
      isRecurring,
    })

    successResponse(res, result)
  } catch (err) { next(err) }
})

// POST /api/v1/payments/ap2/mandates — Create AP2 mandate for AI agent
// 2026: Agent Payments Protocol (AP2) enables cryptographically signed mandates
// for AI-agent transactions, creating unbreakable audit trails [^PR2].
// [^PR2]: Newgensoft. (2026). Banking Tech Trends Report 2026.
router.post("/ap2/mandates", async (req, res, next) => {
  try {
    const { agentId, customerId, scope, maxAmount, expiryDays } = req.body
    if (!agentId || !customerId || !scope || !maxAmount) {
      throw AppError.badRequest("agentId, customerId, scope, maxAmount required")
    }

    const mandate = await createMandate({
      agentId,
      customerId,
      scope,
      maxAmount,
      expiryDays: expiryDays || 30,
    })

    successResponse(res, mandate)
  } catch (err) { next(err) }
})

// POST /api/v1/payments/ap2/mandates/:id/verify — Verify AP2 mandate
router.post("/ap2/mandates/:id/verify", async (req, res, next) => {
  try {
    const { action, amount } = req.body
    const result = await verifyMandate(req.params.id, action, amount)
    successResponse(res, result)
  } catch (err) { next(err) }
})

// POST /api/v1/payments/ap2/mandates/:id/revoke — Revoke AP2 mandate
router.post("/ap2/mandates/:id/revoke", async (req, res, next) => {
  try {
    const { reason } = req.body
    const mandate = await revokeMandate(req.params.id, reason || "Revoked by user")
    successResponse(res, mandate)
  } catch (err) { next(err) }
})

// GET /api/v1/payments/ap2/mandates — List mandates for customer or agent
router.get("/ap2/mandates", async (req, res, next) => {
  try {
    const { customerId, agentId } = req.query
    const mandates = await prisma.aP2Mandate.findMany({
      where: {
        ...(customerId ? { customerId: customerId as string } : {}),
        ...(agentId ? { agentId: agentId as string } : {}),
        isRevoked: false,
      },
      orderBy: { createdAt: "desc" },
    })
    successResponse(res, mandates)
  } catch (err) { next(err) }
})

// POST /api/v1/payments/seed-rules — Seed orchestration rules
router.post("/seed-rules", async (_req, res, next) => {
  try {
    await seedOrchestrationRules()
    successResponse(res, { message: "Orchestration rules seeded" })
  } catch (err) { next(err) }
})

export default router
