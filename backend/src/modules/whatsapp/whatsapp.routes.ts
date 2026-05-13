import { Router } from "express"
import { prisma } from "../../lib/prisma"
import { env } from "../../config/env"
import { successResponse } from "../../shared/utils/response"
import { AppError } from "../../shared/errors/app-error"

const router = Router()
const WHATSAPP_API_URL = "https://graph.facebook.com/v19.0"

async function sendWhatsAppMessage(phone: string, templateName: string, language: string, components: any[]) {
  const response = await fetch(`${WHATSAPP_API_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone.replace(/\+/g, ""),
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        components,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

// POST /api/v1/whatsapp/send-order-confirmation
router.post("/send-order-confirmation", async (req, res, next) => {
  try {
    const { orderId } = req.body
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, items: { include: { variant: true } } },
    })
    if (!order) throw AppError.notFound("Order not found")

    const phone = order.customer.phone
    const language = order.customer.languagePref === "telugu" ? "te" : order.customer.languagePref === "hindi" ? "hi" : "en"

    const result = await sendWhatsAppMessage(phone, "order_confirmation", language, [
      {
        type: "body",
        parameters: [
          { type: "text", text: order.customer.name || "Customer" },
          { type: "text", text: order.orderNumber },
          { type: "text", text: `₹${order.grandTotal}` },
        ],
      },
    ])

    await prisma.whatsAppMessageLog.create({
      data: {
        phone,
        type: "TEMPLATE",
        body: `Order ${order.orderNumber} confirmed`,
        status: "SENT",
        messageId: result.messages?.[0]?.id,
      },
    })

    return successResponse(res, { message: "Order confirmation sent" })
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/whatsapp/send-shipped
router.post("/send-shipped", async (req, res, next) => {
  try {
    const { orderId } = req.body
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    })
    if (!order) throw AppError.notFound("Order not found")

    const phone = order.customer.phone
    const language = order.customer.languagePref === "telugu" ? "te" : order.customer.languagePref === "hindi" ? "hi" : "en"

    const result = await sendWhatsAppMessage(phone, "order_shipped", language, [
      {
        type: "body",
        parameters: [
          { type: "text", text: order.customer.name || "Customer" },
          { type: "text", text: order.orderNumber },
          { type: "text", text: order.trackingNumber || "N/A" },
        ],
      },
    ])

    await prisma.whatsAppMessageLog.create({
      data: {
        phone,
        type: "TEMPLATE",
        body: `Order ${order.orderNumber} shipped`,
        status: "SENT",
        messageId: result.messages?.[0]?.id,
      },
    })

    return successResponse(res, { message: "Shipping notification sent" })
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/whatsapp/webhook — Meta webhook
router.post("/webhook", async (req, res, next) => {
  try {
    // Verify webhook
    const mode = req.query["hub.mode"]
    const token = req.query["hub.verify_token"]
    const challenge = req.query["hub.challenge"]

    if (mode === "subscribe" && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      return res.status(200).send(challenge)
    }

    // Process incoming messages
    const body = req.body
    if (body.entry) {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value.messages) {
            for (const message of change.value.messages) {
              // Store incoming message
              await prisma.whatsAppMessageLog.create({
                data: {
                  phone: message.from,
                  type: message.type?.toUpperCase() || "TEXT",
                  body: message.text?.body || "",
                  status: "RECEIVED",
                },
              })

              // Auto-reply with AI if it's a text message
              if (message.type === "text") {
                // TODO: Integrate with AI chatbot
                console.log(`Received WhatsApp message from ${message.from}: ${message.text.body}`)
              }
            }
          }
        }
      }
    }

    return res.status(200).json({ status: "ok" })
  } catch (error) {
    next(error)
  }
})

// GET /api/v1/whatsapp/webhook — Meta webhook verification
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"]
  const token = req.query["hub.verify_token"]
  const challenge = req.query["hub.challenge"]

  if (mode === "subscribe" && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge)
  }

  return res.status(403).json({ error: "Verification failed" })
})

export default router
