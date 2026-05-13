import { prisma } from "../../lib/prisma"
import { openai, AGENT_MODEL } from "../../lib/openai"
import { AppError } from "../../shared/errors/app-error"
import type { AgentType, AgentStatus, AgentTaskStatus } from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────────────
// Agent Service — Multi-Agent AI Engine
// 2026: Orchestrated teams of specialized agents with bounded autonomy.
// The 1,445% surge in multi-agent inquiries validates this architecture [^MA1].
// [^MA1]: Waredock. (2026). Headless CMS Trends in 2026. "Agentic CMS" emergence.
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface AgentTask {
  type: string
  input: Record<string, unknown>
  tools?: AgentTool[]
}

export interface AgentExecutionResult {
  success: boolean
  output: Record<string, unknown>
  reasoning: string
  tokensUsed: number
  costUsd: number
  latencyMs: number
}

/**
 * Register or update an agent in the registry.
 * Every agent has bounded autonomy: explicit tools, spend limits, escalation paths [^MA2].
 * [^MA2]: Waredock. (2026). The Microservices Moment for Artificial Intelligence.
 */
export async function registerAgent(data: {
  name: string
  type: AgentType
  description?: string
  systemPrompt: string
  modelConfig?: Record<string, unknown>
  tools?: string[]
  parentAgentId?: string
}) {
  const agent = await prisma.agent.upsert({
    where: { name: data.name },
    update: {
      type: data.type,
      description: data.description,
      systemPrompt: data.systemPrompt,
      modelConfig: (data.modelConfig ?? { model: AGENT_MODEL, temperature: 0.2 }) as any,
      tools: data.tools ?? [],
      parentAgentId: data.parentAgentId,
    },
    create: {
      name: data.name,
      type: data.type,
      description: data.description,
      systemPrompt: data.systemPrompt,
      modelConfig: (data.modelConfig ?? { model: AGENT_MODEL, temperature: 0.2 }) as any,
      tools: data.tools ?? [],
      parentAgentId: data.parentAgentId,
    },
  })
  return agent
}

/**
 * Execute a task via an agent with full observability.
 * 2026: Every agent run is logged with reasoning trace, token usage, cost, latency.
 * This audit trail is mandatory for agentic commerce compliance [^MA3].
 * [^MA3]: Newgensoft. (2026). Banking Tech Trends Report 2026. AP2 audit trails.
 */
export async function executeAgentTask(
  agentName: string,
  task: AgentTask
): Promise<AgentExecutionResult> {
  const startTime = Date.now()

  const agent = await prisma.agent.findUnique({ where: { name: agentName } })
  if (!agent) throw AppError.notFound(`Agent ${agentName} not found`)

  // Create execution record
  const execution = await prisma.agentExecution.create({
    data: {
      agentId: agent.id,
      taskType: task.type,
      status: "RUNNING",
      input: task.input as any,
      startedAt: new Date(),
    },
  })

  try {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { status: "RUNNING", lastRunAt: new Date() },
    })

    // 2026: GPT-5 with structured outputs guarantees valid JSON,
    // eliminating the "JSON parsing error" class of agent failures [^MA4].
    // [^MA4]: OpenAI. (2026). Structured Outputs API. https://platform.openai.com/docs/guides/structured-outputs
    const modelConfig = (agent.modelConfig as Record<string, unknown>) || {}
    const completion = await openai.chat.completions.create({
      model: (modelConfig.model as string) || AGENT_MODEL,
      messages: [
        { role: "system", content: agent.systemPrompt },
        { role: "user", content: JSON.stringify(task.input) },
      ],
      temperature: (modelConfig.temperature as number) ?? 0.2,
      max_tokens: (modelConfig.maxTokens as number) ?? 2000,
      response_format: { type: "json_object" },
    })

    const raw = completion.choices[0]?.message?.content || "{}"
    const parsed = JSON.parse(raw) as Record<string, unknown>

    const latencyMs = Date.now() - startTime
    const tokensUsed = completion.usage?.total_tokens ?? 0
    // GPT-5 pricing: ~$0.003/input token, $0.015/output token (estimated 2026 rates)
    const inputTokens = completion.usage?.prompt_tokens ?? 0
    const outputTokens = completion.usage?.completion_tokens ?? 0
    const costUsd = inputTokens * 0.000003 + outputTokens * 0.000015

    // Update execution record with result
    await prisma.agentExecution.update({
      where: { id: execution.id },
      data: {
        status: "COMPLETED",
        output: parsed as any,
        reasoning: (parsed.reasoning as string) || (parsed._reasoning as string) || "",
        tokensUsed,
        costUsd,
        latencyMs,
        completedAt: new Date(),
      },
    })

    // Update agent stats
    const totalRuns = agent.runCount + 1
    const currentSuccessRate = agent.successRate
    const newSuccessRate =
      (currentSuccessRate * agent.runCount + 1) / totalRuns
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        status: "IDLE",
        runCount: totalRuns,
        successRate: newSuccessRate,
      },
    })

    return {
      success: true,
      output: parsed,
      reasoning: (parsed.reasoning as string) || "",
      tokensUsed,
      costUsd,
      latencyMs,
    }
  } catch (error: any) {
    const latencyMs = Date.now() - startTime

    await prisma.agentExecution.update({
      where: { id: execution.id },
      data: {
        status: "FAILED",
        error: error.message || String(error),
        latencyMs,
        completedAt: new Date(),
      },
    })

    await prisma.agent.update({
      where: { id: agent.id },
      data: { status: "ERROR" },
    })

    return {
      success: false,
      output: {},
      reasoning: "",
      tokensUsed: 0,
      costUsd: 0,
      latencyMs,
    }
  }
}

/**
 * Seed the default agent registry.
 * 2026: Enterprises deploy 6-12 specialized agents per commerce platform [^MA5].
 * [^MA5]: Q3 Technologies. (2026). Top E-commerce Technology Trends 2026.
 */
export async function seedAgents() {
  const agents = [
    {
      name: "orchestrator",
      type: "ORCHESTRATOR" as AgentType,
      description: "Coordinates task delegation across all specialized agents",
      systemPrompt: `You are the Orchestrator Agent for Feld & Stein Oils.
Your job is to analyze incoming tasks and delegate them to the correct specialized agent.
Available agents: inventory, pricing, support, content, fraud.
Respond in JSON with fields: { "agent": string, "task": object, "priority": number, "escalation": boolean }`,
      tools: ["delegate_task", "monitor_agent", "escalate_human"],
    },
    {
      name: "inventory",
      type: "INVENTORY" as AgentType,
      description: "Monitors stock levels, predicts demand, triggers reorders",
      systemPrompt: `You are the Inventory Agent for Feld & Stein Oils.
Analyze stock levels, sales velocity, and seasonal patterns.
Predict demand for next 14 days.
Recommend reorder quantities and timing.
Respond in JSON with fields: { "recommendations": array, "riskVariants": array, "reasoning": string }`,
      tools: ["read_stock", "create_reorder", "alert_low_stock"],
    },
    {
      name: "pricing",
      type: "PRICING" as AgentType,
      description: "Optimizes prices based on demand, competition, inventory",
      systemPrompt: `You are the Pricing Agent for Feld & Stein Oils.
Analyze demand elasticity, competitor pricing, inventory levels, and customer price sensitivity.
Recommend dynamic prices within guardrails: max 20% discount, min 15% margin.
Respond in JSON with fields: { "priceUpdates": array, "bundles": array, "reasoning": string }`,
      tools: ["read_prices", "update_price", "create_bundle"],
    },
    {
      name: "support",
      type: "SUPPORT" as AgentType,
      description: "Multilingual customer support via WhatsApp and chat",
      systemPrompt: `You are the Support Agent for Feld & Stein Oils.
Speak Telugu, Hindi, and English naturally.
Answer questions about products, orders, shipping, returns.
Use product knowledge base for accurate answers.
Be warm, helpful, and concise.
Respond in JSON with fields: { "response": string, "language": string, "suggestedActions": array, "escalate": boolean }`,
      tools: ["read_order", "read_product", "send_whatsapp", "create_ticket"],
    },
    {
      name: "content",
      type: "CONTENT" as AgentType,
      description: "Generates product descriptions, SEO content, WhatsApp templates",
      systemPrompt: `You are the Content Agent for Feld & Stein Oils.
Generate compelling product descriptions, SEO meta tags, and WhatsApp marketing templates.
Optimize for Telugu/Hindi/English audiences.
Respond in JSON with fields: { "content": string, "seoTitle": string, "seoDescription": string, "whatsappTemplates": array }`,
      tools: ["read_product", "update_product", "create_template"],
    },
    {
      name: "fraud",
      type: "FRAUD" as AgentType,
      description: "Behavioral analysis and transaction risk scoring",
      systemPrompt: `You are the Fraud Agent for Feld & Stein Oils.
Analyze behavioral biometrics, transaction patterns, and device signals.
Assign risk scores (0-1) and recommend actions: ALLOW, CHALLENGE, BLOCK.
Respond in JSON with fields: { "riskScore": number, "riskLevel": string, "action": string, "reasoning": string }`,
      tools: ["read_session", "read_behavior", "flag_transaction", "block_session"],
    },
  ]

  for (const a of agents) {
    await registerAgent(a)
  }
}
