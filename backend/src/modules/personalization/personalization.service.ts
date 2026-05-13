import { prisma } from "../../lib/prisma"
import { executeAgentTask } from "../agent/agent.service"

// ─────────────────────────────────────────────────────────────────────────────
// Personalization Engine
// 2026: AI personalization generates 40% more revenue; 31% of ecommerce revenue
// from recommendations alone. Real-time adaptation at every layer is table stakes [^PE1].
// [^PE1]: Netguru. (2026). 7 Headless Commerce Trends That Matter Most in 2026.
// ─────────────────────────────────────────────────────────────────────────────

export interface PersonalizationContext {
  customerId: string
  viewedProducts?: string[]
  viewedCategories?: string[]
  searchQueries?: string[]
  cartItems?: string[]
  deviceType?: string
  location?: string
}

/**
 * Compute or update a customer's personalization profile.
 * Uses real-time signals + AI agent to compute affinity scores.
 */
export async function computeProfile(ctx: PersonalizationContext) {
  const existing = await prisma.personalizationProfile.findUnique({
    where: { customerId: ctx.customerId },
  })

  const customer = await prisma.customer.findUnique({
    where: { id: ctx.customerId },
    include: { orders: { include: { items: true } } },
  })
  if (!customer) return null

  // Build signal summary for AI
  const signalSummary = {
    viewedProducts: ctx.viewedProducts || existing?.viewedProducts || [],
    viewedCategories: ctx.viewedCategories || existing?.viewedCategories || [],
    searchQueries: ctx.searchQueries || existing?.searchHistory || [],
    pastOrders: customer.orders.map((o) => ({
      items: o.items.map((i) => i.nameAtPurchase),
      total: Number(o.grandTotal),
    })),
    totalOrders: customer.orders.length,
    lifetimeValue: customer.orders.reduce((s, o) => s + Number(o.grandTotal), 0),
    deviceType: ctx.deviceType,
    location: ctx.location,
  }

  // Run pricing agent to compute price sensitivity
  const pricingResult = await executeAgentTask("pricing", {
    type: "compute_price_sensitivity",
    input: signalSummary,
  })

  const priceSensitivity = (pricingResult.output.priceSensitivity as number) ?? 0.5

  // Run content agent to determine best personalization strategy
  const contentResult = await executeAgentTask("content", {
    type: "select_personalization_strategy",
    input: signalSummary,
  })

  const strategy = (contentResult.output.strategy as string) || "CONTROL"
  const categoryAffinities = (contentResult.output.categoryAffinities as Record<string, number>) || {}

  const profile = await prisma.personalizationProfile.upsert({
    where: { customerId: ctx.customerId },
    update: {
      viewedProducts: ctx.viewedProducts || existing?.viewedProducts || [],
      viewedCategories: ctx.viewedCategories || existing?.viewedCategories || [],
      searchHistory: ctx.searchQueries || existing?.searchHistory || [],
      categoryAffinities,
      priceSensitivity,
      activeStrategy: strategy as any,
      lastComputedAt: new Date(),
    },
    create: {
      customerId: ctx.customerId,
      viewedProducts: ctx.viewedProducts || [],
      viewedCategories: ctx.viewedCategories || [],
      searchHistory: ctx.searchQueries || [],
      categoryAffinities,
      priceSensitivity,
      activeStrategy: strategy as any,
      lastComputedAt: new Date(),
    },
  })

  return profile
}

/**
 * Generate AI bundles for the current customer context.
 * 2026: AI-powered bundling analyzes purchase patterns to identify relationships
// that human merchandisers miss, increasing AOV by 369% [^PE2].
// [^PE2]: Netguru. (2026). 7 Headless Commerce Trends That Matter Most in 2026.
 */
export async function generateBundles(customerId?: string) {
  const input: Record<string, unknown> = {}

  if (customerId) {
    const profile = await prisma.personalizationProfile.findUnique({
      where: { customerId },
    })
    if (profile) {
      input.categoryAffinities = profile.categoryAffinities
      input.priceSensitivity = profile.priceSensitivity
    }
  }

  const result = await executeAgentTask("pricing", {
    type: "generate_bundles",
    input,
  })

  const bundles = (result.output.bundles as any[]) || []

  // Persist active bundles
  for (const b of bundles) {
    await prisma.aIBundle.upsert({
      where: { name: b.name },
      update: {
        productIds: b.productIds,
        bundlePrice: b.bundlePrice,
        originalPrice: b.originalPrice,
        targetCategories: b.targetCategories || [],
        reasoning: b.reasoning,
        agentId: b.agentId,
        validUntil: b.validUntil ? new Date(b.validUntil) : null,
      },
      create: {
        name: b.name,
        productIds: b.productIds,
        bundlePrice: b.bundlePrice,
        originalPrice: b.originalPrice,
        targetCategories: b.targetCategories || [],
        reasoning: b.reasoning,
        agentId: b.agentId,
        validUntil: b.validUntil ? new Date(b.validUntil) : null,
      },
    })
  }

  return bundles
}

/**
 * Get personalized product recommendations for a customer.
 */
export async function getRecommendations(customerId: string, limit = 8) {
  const profile = await prisma.personalizationProfile.findUnique({
    where: { customerId },
  })

  if (!profile || !profile.categoryAffinities) {
    // Fallback: featured products
    return prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      include: { variants: true, images: { take: 1 } },
      take: limit,
    })
  }

  // Sort categories by affinity
  const affinities = profile.categoryAffinities as Record<string, number>
  const topCategories = Object.entries(affinities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([slug]) => slug)

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      category: { slug: { in: topCategories } },
    },
    include: { variants: true, images: { take: 1 } },
    take: limit,
  })

  return products
}
