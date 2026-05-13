import { Request, Response, NextFunction } from "express"

// ─────────────────────────────────────────────────────────────────────────────
// Agent-Ready API Middleware
// 2026: 75% of enterprise ecommerce is powered by agentic AI.
// APIs must serve both humans and AI agents with machine-readable structured data [^AR1].
// [^AR1]: Ultracommerce. (2026). Enterprise ecommerce in 2026. Agentic AI adoption at 75%.
// ─────────────────────────────────────────────────────────────────────────────

const SCHEMA_ORG_CONTEXT = "https://schema.org"

interface AgentReadyEntity {
  "@context": string
  "@type": string
  "@id": string
  [key: string]: unknown
}

/**
 * Wrap a standard API response with JSON-LD Schema.org markup.
 * When client sends Accept: application/ld+json, return machine-optimized format.
 * 2026: AI agents require clean data structures, reliable APIs, and
// machine-readable product information to discover and act upon [^AR2].
// [^AR2]: Netguru. (2026). 7 Headless Commerce Trends That Matter Most in 2026.
 */
export function withAgentReady(
  entityType: string,
  entityId: (req: Request, data: any) => string,
  enrich?: (data: any, req: Request) => Record<string, unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res)

    res.json = function (body: any) {
      const accept = req.headers.accept || ""
      const wantsLD = accept.includes("application/ld+json")

      if (!wantsLD || !body?.data) {
        return originalJson(body)
      }

      const data = body.data
      const id = entityId(req, data)

      const ldEntity: AgentReadyEntity = {
        "@context": SCHEMA_ORG_CONTEXT,
        "@type": entityType,
        "@id": id,
        ...data,
      }

      if (enrich) {
        Object.assign(ldEntity, enrich(data, req))
      }

      // Add agent-actionable metadata
      ldEntity.agentEligible = true
      ldEntity.machineReadable = true

      // For products, add structured offer data
      if (entityType === "Product") {
        ldEntity.offers = {
          "@type": "Offer",
          priceCurrency: "INR",
          availability: data.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        }
        ldEntity.agentActionable = {
          negotiate: false,
          bulkOrder: data.stock >= 10,
          subscribe: true,
        }
      }

      res.setHeader("Content-Type", "application/ld+json")
      return originalJson({ ...body, data: ldEntity })
    }

    next()
  }
}

/**
 * Global middleware that adds agent-ready headers to all responses.
 * Exposes API capability discovery for AI agents.
 */
export function agentReadyHeaders(req: Request, res: Response, next: NextFunction) {
  // 2026: AI agents discover capabilities via HTTP headers and well-known endpoints.
  // The Agent Payments Protocol (AP2) requires capability advertisement [^AR3].
  // [^AR3]: Newgensoft. (2026). Banking Tech Trends Report 2026.
  res.setHeader("X-Agent-Supported", "true")
  res.setHeader("X-AP2-Version", "1.0")
  res.setHeader("X-Machine-Readable", "true")
  next()
}
