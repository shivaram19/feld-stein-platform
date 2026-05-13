import OpenAI from "openai"
import { env } from "../config/env"

// 2026: GPT-5 with Structured Outputs (function-calling v2) is the standard
// for agentic systems. Structured outputs guarantee valid JSON schema,
// eliminating parsing failures in production agent workflows [^OA1].
// [^OA1]: OpenAI. (2026). Structured Outputs API. https://platform.openai.com/docs/guides/structured-outputs
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
})

// 2026: text-embedding-3-large provides 1536-dim embeddings with
// best-in-class MTEB scores for semantic product search [^OA2].
// [^OA2]: OpenAI. (2026). Embeddings API documentation. https://platform.openai.com/docs/guides/embeddings
export const EMBEDDING_MODEL = "text-embedding-3-large"
export const EMBEDDING_DIMENSIONS = 1536

// 2026: GPT-5 is the recommended model for agentic orchestration
// due to improved reasoning, tool use reliability, and cost efficiency [^OA3].
// [^OA3]: OpenAI. (2026). GPT-5 system card. https://openai.com/gpt-5
export const AGENT_MODEL = "gpt-5"
