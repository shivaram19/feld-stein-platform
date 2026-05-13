import { Router } from "express"
import { prisma } from "../../lib/prisma"
import { successResponse } from "../../shared/utils/response"
import { AppError } from "../../shared/errors/app-error"
import { computeProfile, generateBundles, getRecommendations } from "./personalization.service"

const router = Router()

// POST /api/v1/personalization/profile — Compute/update personalization profile
// 2026: AI personalization generates 40% more revenue; real-time profile computation
// is essential for dynamic product pages and adaptive pricing [^PRS1].
// [^PRS1]: Netguru. (2026). 7 Headless Commerce Trends That Matter Most in 2026.
router.post("/profile", async (req, res, next) => {
  try {
    const { customerId, viewedProducts, viewedCategories, searchQueries, deviceType, location } = req.body
    if (!customerId) throw AppError.badRequest("customerId required")

    const profile = await computeProfile({
      customerId,
      viewedProducts,
      viewedCategories,
      searchQueries,
      deviceType,
      location,
    })

    successResponse(res, profile)
  } catch (err) { next(err) }
})

// GET /api/v1/personalization/recommendations/:customerId
router.get("/recommendations/:customerId", async (req, res, next) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit as string) || 8)
    const products = await getRecommendations(req.params.customerId, limit)
    successResponse(res, products)
  } catch (err) { next(err) }
})

// POST /api/v1/personalization/bundles/generate — Generate AI bundles
// 2026: AI-powered bundling identifies non-obvious product relationships,
// reducing cart abandonment by 4.35% and increasing AOV [^PRS2].
// [^PRS2]: Netguru. (2026). 7 Headless Commerce Trends That Matter Most in 2026.
router.post("/bundles/generate", async (req, res, next) => {
  try {
    const { customerId } = req.body
    const bundles = await generateBundles(customerId)
    successResponse(res, bundles)
  } catch (err) { next(err) }
})

// GET /api/v1/personalization/bundles — Active AI bundles
router.get("/bundles", async (_req, res, next) => {
  try {
    const bundles = await prisma.aIBundle.findMany({
      where: {
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
    })
    successResponse(res, bundles)
  } catch (err) { next(err) }
})

export default router
