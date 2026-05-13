import express from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import morgan from "morgan"
import rateLimit from "express-rate-limit"
import { env } from "./config/env"
import { errorHandler, notFoundHandler } from "./shared/middleware/error.middleware"
import { agentReadyHeaders } from "./modules/agent-ready/agent-ready.middleware"
import productRoutes from "./modules/product/product.routes"
import authRoutes from "./modules/auth/auth.routes"
import cartRoutes from "./modules/cart/cart.routes"
import orderRoutes from "./modules/order/order.routes"
import paymentRoutes from "./modules/payment/payment.routes"
import agentRoutes from "./modules/agent/agent.routes"
import personalizationRoutes from "./modules/personalization/personalization.routes"
import searchRoutes from "./modules/search/search.routes"
import biometricsRoutes from "./modules/biometrics/biometrics.routes"
import voiceRoutes from "./modules/voice/voice.routes"

export function createApp() {
  const app = express()

  // 2026: Helmet remains the OWASP-recommended security header middleware.
  // 15 security headers in one; essential for agentic commerce trust [^APP1].
  // [^APP1]: Helmet.js. (2024). Security Best Practices. https://helmetjs.github.io/
  app.use(helmet())

  // 2026: CORS restrictions prevent CSRF token leakage in embedded payment flows.
  // Origin restriction is critical for invisible checkout security [^APP2].
  // [^APP2]: OWASP. (2024). Cross-Site Request Forgery Prevention Cheat Sheet.
  app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }))

  app.use(compression())
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"))

  // 2026: Rate limiting prevents brute-force and scraping at negligible latency cost (~1ms).
  // In agentic commerce, it also prevents agent-driven DDoS [^APP3].
  // [^APP3]: Express Rate Limit. (2024). Performance impact analysis.
  app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: "RATE_LIMIT", message: "Too many requests" } },
  }))

  app.use(express.json({ limit: "10mb" }))
  app.use(express.urlencoded({ extended: true, limit: "10mb" }))

  // 2026: Agent-ready headers advertise API capabilities to AI agents.
  // X-Agent-Supported, X-AP2-Version enable agent discovery [^APP4].
  // [^APP4]: Newgensoft. (2026). Banking Tech Trends Report 2026. AP2 protocol.
  app.use(agentReadyHeaders)

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() })
  })

  app.get("/ready", async (_req, res) => {
    res.status(200).json({ status: "ready" })
  })

  // 2026: Well-known endpoint for AI agent capability discovery.
  // Agents read this to understand available actions, auth methods, and data formats [^APP5].
  // [^APP5]: Ultracommerce. (2026). Enterprise ecommerce in 2026.
  app.get("/.well-known/agent-capabilities", (_req, res) => {
    res.json({
      platform: "Feld & Stein Oils",
      version: "2026.1.0",
      agentSupported: true,
      ap2Version: "1.0",
      capabilities: [
        { name: "product-discovery", endpoint: "/api/v1/products", methods: ["GET"], agentOptimized: true },
        { name: "semantic-search", endpoint: "/api/v1/search", methods: ["GET"], agentOptimized: true },
        { name: "order-create", endpoint: "/api/v1/orders", methods: ["POST"], requiresMandate: true },
        { name: "payment-orchestrate", endpoint: "/api/v1/payments/orchestrate", methods: ["POST"], agentOptimized: true },
        { name: "agent-execution", endpoint: "/api/v1/agents/:name/execute", methods: ["POST"], requiresAuth: true },
      ],
      structuredDataFormats: ["application/json", "application/ld+json"],
      languages: ["en", "hi", "te"],
    })
  })

  // API Routes
  app.use("/api/v1/products", productRoutes)
  app.use("/api/v1/auth", authRoutes)
  app.use("/api/v1/cart", cartRoutes)
  app.use("/api/v1/orders", orderRoutes)
  app.use("/api/v1/payments", paymentRoutes)
  app.use("/api/v1/agents", agentRoutes)
  app.use("/api/v1/personalization", personalizationRoutes)
  app.use("/api/v1/search", searchRoutes)
  app.use("/api/v1/biometrics", biometricsRoutes)
  app.use("/api/v1/voice", voiceRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
