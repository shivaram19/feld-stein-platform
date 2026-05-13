import { Router } from "express"
import OpenAI from "openai"
import { prisma } from "../../lib/prisma"
import { env } from "../../config/env"
import { successResponse } from "../../shared/utils/response"
import { AppError } from "../../shared/errors/app-error"
import { redis } from "../../lib/redis"

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

const router = Router()

// Product knowledge base for RAG
async function getProductKnowledge(query: string): Promise<string> {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      variants: { select: { name: true, price: true, stock: true } },
    },
    take: 3,
  })

  if (products.length === 0) {
    return "No specific product found. I can help with general questions about cold-pressed oils."
  }

  return products.map((p) =>
    `${p.name}: ${p.shortDesc}. Available sizes: ${p.variants.map((v) => `${v.name} (₹${v.price})`).join(", ")}.`
  ).join("\n")
}

// POST /api/v1/ai/chat — AI chatbot
router.post("/chat", async (req, res, next) => {
  try {
    const { message, phone, language = "english" } = req.body
    if (!message) throw AppError.validation("Message is required")

    // Get conversation history from Redis
    const sessionKey = `chat:${phone || "anonymous"}`
    let history: { role: "user" | "assistant"; content: string }[] = []
    try {
      const cached = await redis.get(sessionKey)
      if (cached) history = JSON.parse(cached)
    } catch { /* ignore */ }

    // Get product knowledge for RAG
    const productKnowledge = await getProductKnowledge(message)

    // Build system prompt based on language
    const systemPrompts: Record<string, string> = {
      telugu: `మీరు Feld & Stein యొక్క సహాయక AI. మీరు తెలుగులో సమాధానం ఇవ్వాలి.\n\nProduct Info:\n${productKnowledge}\n\nమీరు ఈ క్రింది విషయాల్లో సహాయం చేయగలరు:\n- ఏ నూనె ఏ పనికి ఉపయోగపడుతుంది\n- ధరలు, సైజులు\n- ఆర్డర్ ట్రాకింగ్\n- హెల్త్ బెనిఫిట్స్\n- షిప్పింగ్ సమాచారం`,
      hindi: `आप Feld & Stein की सहायक AI हैं। कृपया हिंदी में जवाब दें।\n\nProduct Info:\n${productKnowledge}\n\nआप इन विषयों में मदद कर सकते हैं:\n- कौन सा तेल किस काम में आता है\n- कीमतें और आकार\n- ऑर्डर ट्रैकिंग\n- स्वास्थ्य लाभ\n- शिपिंग जानकारी`,
      english: `You are the helpful AI assistant for Feld & Stein, a cold-pressed oil company from Andhra Pradesh.\n\nProduct Info:\n${productKnowledge}\n\nYou can help with:\n- Which oil is best for what purpose\n- Prices and sizes\n- Order tracking\n- Health benefits\n- Shipping information\n\nBe warm, knowledgeable, and concise. If you don't know something, escalate to human support.`,
    }

    const systemPrompt = systemPrompts[language] || systemPrompts.english

    // Build messages
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6), // Keep last 6 exchanges
      { role: "user", content: message },
    ]

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages,
      max_tokens: 500,
      temperature: 0.7,
    })

    const reply = completion.choices[0].message.content || "I apologize, I couldn't process that."

    // Update history
    history.push({ role: "user", content: message })
    history.push({ role: "assistant", content: reply })
    await redis.setex(sessionKey, 86400, JSON.stringify(history.slice(-20))) // 24h TTL, keep last 20

    return successResponse(res, { reply, language })
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/ai/track-order — Order tracking via AI
router.post("/track-order", async (req, res, next) => {
  try {
    const { orderNumber, phone } = req.body
    if (!orderNumber && !phone) throw AppError.validation("Order number or phone required")

    const where: any = {}
    if (orderNumber) where.orderNumber = orderNumber
    if (phone) where.customer = { phone }

    const order = await prisma.order.findFirst({
      where,
      include: {
        statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
        items: { include: { variant: { include: { product: true } } } },
      },
      orderBy: { createdAt: "desc" },
    })

    if (!order) throw AppError.notFound("Order not found")

    const statusMessages: Record<string, string> = {
      PENDING: "Your order has been received and is being processed.",
      PENDING_PAYMENT: "Your order is awaiting payment confirmation.",
      PAID: "Payment received! Your order is being prepared.",
      PROCESSING: "Your order is being packed with care.",
      SHIPPED: `Your order has been shipped! Tracking: ${order.trackingNumber || "N/A"}`,
      OUT_FOR_DELIVERY: "Your order is out for delivery today!",
      DELIVERED: "Your order has been delivered. Enjoy your oil!",
      CANCELLED: "Your order has been cancelled.",
    }

    return successResponse(res, {
      orderNumber: order.orderNumber,
      status: order.status,
      message: statusMessages[order.status] || "Your order is being processed.",
      trackingNumber: order.trackingNumber,
      courierName: order.courierName,
      items: order.items.map((item) => ({
        name: item.nameAtPurchase,
        quantity: item.quantity,
      })),
    })
  } catch (error) {
    next(error)
  }
})

export default router
