import { Router } from "express"
import { prisma } from "../../lib/prisma"
import { executeAgentTask, seedAgents } from "./agent.service"
import { successResponse } from "../../shared/utils/response"
import { AppError } from "../../shared/errors/app-error"

const router = Router()

// GET /api/v1/agents — List all registered agents
// 2026: Agent registry must be discoverable by external AI systems [^AR1].
// [^AR1]: Ultracommerce. (2026). Enterprise ecommerce in 2026. Agentic AI adoption at 75%.
router.get("/", async (_req, res, next) => {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        childAgents: { select: { id: true, name: true, type: true, status: true } },
        _count: { select: { taskExecutions: true, orders: true } },
      },
    })
    successResponse(res, agents)
  } catch (err) { next(err) }
})

// GET /api/v1/agents/:name — Agent detail with execution history
router.get("/:name", async (req, res, next) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { name: req.params.name },
      include: {
        taskExecutions: { orderBy: { createdAt: "desc" }, take: 20 },
        childAgents: true,
        parentAgent: true,
      },
    })
    if (!agent) throw AppError.notFound("Agent not found")
    successResponse(res, agent)
  } catch (err) { next(err) }
})

// POST /api/v1/agents/:name/execute — Execute a task via named agent
// 2026: Every agent execution is logged with reasoning trace, tokens, cost, latency.
// This observability is mandatory for agentic commerce compliance [^AR2].
// [^AR2]: Newgensoft. (2026). Banking Tech Trends Report 2026. AP2 audit requirements.
router.post("/:name/execute", async (req, res, next) => {
  try {
    const { type, input, tools } = req.body
    if (!type) throw AppError.badRequest("Task type required")

    const result = await executeAgentTask(req.params.name, {
      type,
      input: input ?? {},
      tools,
    })

    if (!result.success) {
      throw AppError.internal("Agent execution failed")
    }

    successResponse(res, result)
  } catch (err) { next(err) }
})

// POST /api/v1/agents/seed — Seed default agent registry
router.post("/seed", async (_req, res, next) => {
  try {
    await seedAgents()
    successResponse(res, { message: "Agents seeded" })
  } catch (err) { next(err) }
})

// GET /api/v1/agents/executions/recent — Recent executions across all agents
router.get("/executions/recent", async (_req, res, next) => {
  try {
    const executions = await prisma.agentExecution.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { agent: { select: { name: true, type: true } } },
    })
    successResponse(res, executions)
  } catch (err) { next(err) }
})

export default router
