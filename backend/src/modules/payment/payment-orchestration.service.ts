import { prisma } from "../../lib/prisma"
import { PaymentGateway } from "@prisma/client"
import { AppError } from "../../shared/errors/app-error"

// ─────────────────────────────────────────────────────────────────────────────
// Payment Orchestration Service
// 2026: Intelligent gateway routing improves auth rates by 3%+ and reduces costs.
// Static acquirer relationships are obsolete; AI-powered dynamic routing is table stakes [^PO1].
// [^PO1]: Trust Payments. (2026). Top trends for online payments in 2026.
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentContext {
  amount: number
  currency: string
  countryCode?: string
  paymentMethod?: string
  customerId?: string
  deviceType?: string
  isRecurring?: boolean
}

/**
 * Evaluate all active orchestration rules and select the optimal gateway.
 * Rules are evaluated in priority order (highest first).
 * 2026: Payment orchestration layers route transactions dynamically;
// if one gateway fails, the system retries through a different acquirer [^PO2].
// [^PO2]: Netcetera. (2026). 7 payment trends shaping 2026.
 */
export async function selectGateway(ctx: PaymentContext): Promise<{
  gateway: PaymentGateway
  fallbackGateway: PaymentGateway | null
  ruleId: string | null
  reason: string
}> {
  const rules = await prisma.paymentOrchestrationRule.findMany({
    where: { isActive: true },
    orderBy: { priority: "desc" },
  })

  for (const rule of rules) {
    const matches =
      (!rule.currency || rule.currency === ctx.currency) &&
      (!rule.countryCode || rule.countryCode === ctx.countryCode) &&
      (!rule.minAmount || Number(rule.minAmount) <= ctx.amount) &&
      (!rule.maxAmount || Number(rule.maxAmount) >= ctx.amount) &&
      (!rule.paymentMethod || rule.paymentMethod === ctx.paymentMethod)

    if (matches) {
      // Update usage stats
      await prisma.paymentOrchestrationRule.update({
        where: { id: rule.id },
        data: { usageCount: { increment: 1 } },
      })

      return {
        gateway: rule.targetGateway,
        fallbackGateway: rule.fallbackGateway,
        ruleId: rule.id,
        reason: `Matched rule: ${rule.name}`,
      }
    }
  }

  // Default routing
  const defaultGateway = ctx.currency === "INR" ? "RAZORPAY" : "STRIPE"
  return {
    gateway: defaultGateway as PaymentGateway,
    fallbackGateway: ctx.currency === "INR" ? "STRIPE" : "RAZORPAY",
    ruleId: null,
    reason: "Default routing (no rule matched)",
  }
}

/**
 * Seed default orchestration rules.
 * 2026: 70% of enterprises prioritize composable commerce with modular payment stacks [^PO3].
// [^PO3]: Ultracommerce. (2026). Enterprise ecommerce in 2026.
 */
export async function seedOrchestrationRules() {
  const rules = [
    {
      name: "INR-UPI-LowAmount",
      priority: 100,
      currency: "INR",
      paymentMethod: "upi",
      maxAmount: 2000,
      targetGateway: "RAZORPAY" as PaymentGateway,
      fallbackGateway: "STRIPE" as PaymentGateway,
      reason: "UPI payments under ₹2000 route to Razorpay for optimal success rate",
    },
    {
      name: "INR-Card-HighAmount",
      priority: 90,
      currency: "INR",
      paymentMethod: "card",
      minAmount: 5000,
      targetGateway: "STRIPE" as PaymentGateway,
      fallbackGateway: "RAZORPAY" as PaymentGateway,
      reason: "High-value card payments route to Stripe for better international auth rates",
    },
    {
      name: "USD-Default",
      priority: 80,
      currency: "USD",
      targetGateway: "STRIPE" as PaymentGateway,
      fallbackGateway: "RAZORPAY" as PaymentGateway,
      reason: "USD transactions default to Stripe",
    },
    {
      name: "EUR-Default",
      priority: 80,
      currency: "EUR",
      targetGateway: "STRIPE" as PaymentGateway,
      fallbackGateway: "RAZORPAY" as PaymentGateway,
      reason: "EUR transactions default to Stripe",
    },
    {
      name: "COD-Rural",
      priority: 70,
      currency: "INR",
      countryCode: "IN",
      targetGateway: "COD" as PaymentGateway,
      fallbackGateway: "RAZORPAY" as PaymentGateway,
      reason: "COD available for rural India deliveries",
    },
    {
      name: "Wallet-Mobile",
      priority: 60,
      paymentMethod: "wallet",
      targetGateway: "RAZORPAY" as PaymentGateway,
      fallbackGateway: "STRIPE" as PaymentGateway,
      reason: "Mobile wallets route to Razorpay for Indian market",
    },
  ]

  for (const r of rules) {
    await prisma.paymentOrchestrationRule.upsert({
      where: { name: r.name },
      update: {
        priority: r.priority,
        currency: r.currency,
        paymentMethod: r.paymentMethod,
        minAmount: r.minAmount ? r.minAmount : null,
        maxAmount: r.maxAmount ? r.maxAmount : null,
        targetGateway: r.targetGateway,
        fallbackGateway: r.fallbackGateway,
      },
      create: {
        name: r.name,
        priority: r.priority,
        currency: r.currency,
        paymentMethod: r.paymentMethod,
        minAmount: r.minAmount ? r.minAmount : null,
        maxAmount: r.maxAmount ? r.maxAmount : null,
        targetGateway: r.targetGateway,
        fallbackGateway: r.fallbackGateway,
      },
    })
  }
}
