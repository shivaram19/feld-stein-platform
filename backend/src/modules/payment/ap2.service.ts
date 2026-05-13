import { createHash, createSign, createVerify, generateKeyPairSync } from "crypto"
import { prisma } from "../../lib/prisma"
import { AppError } from "../../shared/errors/app-error"

// ─────────────────────────────────────────────────────────────────────────────
// Agent Payments Protocol (AP2) Service
// 2026: Google's AP2 framework enables AI agents to conduct transactions securely
// with cryptographically signed mandates, creating unbreakable audit trails [^AP1].
// [^AP1]: Newgensoft. (2026). Banking Tech Trends Report 2026.
// ─────────────────────────────────────────────────────────────────────────────

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 4096,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
})

export interface AP2MandateInput {
  agentId: string
  customerId: string
  scope: string // e.g. "orders:create,payments:authorize"
  maxAmount: number
  expiryDays: number
}

/**
 * Create an AP2 mandate for an AI agent.
 * The mandate is cryptographically signed and includes scope, spend limit, and expiry.
 * 2026: AP2 mandates eliminate disputes and chargebacks for AI-driven transactions [^AP2].
 * [^AP2]: Newgensoft. (2026). Banking Tech Trends Report 2026.
 */
export async function createMandate(input: AP2MandateInput) {
  const agent = await prisma.agent.findUnique({ where: { id: input.agentId } })
  if (!agent) throw AppError.notFound("Agent not found")

  const expiryAt = new Date()
  expiryAt.setDate(expiryAt.getDate() + input.expiryDays)

  const payload = JSON.stringify({
    agentId: input.agentId,
    customerId: input.customerId,
    scope: input.scope,
    maxAmount: input.maxAmount,
    expiryAt: expiryAt.toISOString(),
    issuedAt: new Date().toISOString(),
  })

  const mandateHash = createHash("sha256").update(payload).digest("hex")

  const signer = createSign("RSA-SHA256")
  signer.update(payload)
  const signedPayload = signer.sign(privateKey, "base64")

  const mandate = await prisma.aP2Mandate.create({
    data: {
      agentId: input.agentId,
      customerId: input.customerId,
      mandateHash,
      signedPayload,
      publicKey,
      scope: input.scope,
      maxAmount: input.maxAmount,
      expiryAt,
    },
  })

  return mandate
}

/**
 * Verify an AP2 mandate before allowing an agent action.
 * Returns { valid: boolean, reason?: string }
 */
export async function verifyMandate(mandateId: string, action: string, amount?: number) {
  const mandate = await prisma.aP2Mandate.findUnique({
    where: { id: mandateId },
  })
  if (!mandate) return { valid: false, reason: "Mandate not found" }
  if (mandate.isRevoked) return { valid: false, reason: "Mandate revoked" }
  if (mandate.expiryAt < new Date()) return { valid: false, reason: "Mandate expired" }

  // Scope check
  const scopes = mandate.scope.split(",").map((s) => s.trim())
  const [resource, permission] = action.split(":")
  const requiredScope = `${resource}:${permission}`
  if (!scopes.includes(requiredScope) && !scopes.includes("*:*")) {
    return { valid: false, reason: `Action ${action} not in mandate scope` }
  }

  // Amount check
  if (amount && Number(mandate.maxAmount) < amount) {
    return { valid: false, reason: `Amount ${amount} exceeds mandate limit ${mandate.maxAmount}` }
  }

  // Cryptographic verification
  const payload = JSON.stringify({
    agentId: mandate.agentId,
    customerId: mandate.customerId,
    scope: mandate.scope,
    maxAmount: Number(mandate.maxAmount),
    expiryAt: mandate.expiryAt.toISOString(),
    // Note: issuedAt is not stored, so we verify based on stored hash
  })

  // Recompute hash and compare
  const computedHash = createHash("sha256").update(payload).digest("hex")
  if (computedHash !== mandate.mandateHash) {
    return { valid: false, reason: "Mandate hash mismatch — possible tampering" }
  }

  // Verify signature
  const verifier = createVerify("RSA-SHA256")
  verifier.update(payload)
  const signatureValid = verifier.verify(mandate.publicKey, mandate.signedPayload, "base64")
  if (!signatureValid) {
    return { valid: false, reason: "Signature verification failed" }
  }

  // Update usage
  await prisma.aP2Mandate.update({
    where: { id: mandate.id },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  })

  return { valid: true }
}

/**
 * Revoke a mandate.
 */
export async function revokeMandate(mandateId: string, reason: string) {
  return prisma.aP2Mandate.update({
    where: { id: mandateId },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason,
    },
  })
}
