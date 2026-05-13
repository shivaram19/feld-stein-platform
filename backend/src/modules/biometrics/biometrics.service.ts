import { prisma } from "../../lib/prisma"
import { executeAgentTask } from "../agent/agent.service"
import type { BiometricRiskLevel } from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────────────
// Behavioral Biometrics Service
// 2026: Passive authentication via behavioral biometrics is the fraud prevention standard.
// Analysis of typing cadence, mouse movements, touch pressure enables continuous
// session verification with 98% fraud detection accuracy [^BB1].
// [^BB1]: Newgensoft. (2026). Banking Tech Trends Report 2026.
// ─────────────────────────────────────────────────────────────────────────────

export interface BiometricEvent {
  sessionToken: string
  customerId?: string
  // Keystroke
  keystrokeEvents?: Array<{
    key: string
    dwell: number // ms
    flight: number // ms
    timestamp: number
  }>
  // Mouse
  mouseEvents?: Array<{
    x: number
    y: number
    velocity: number
    timestamp: number
  }>
  // Touch
  touchEvents?: Array<{
    pressure: number
    x: number
    y: number
    timestamp: number
  }>
  // Device context
  deviceType?: string
  screenResolution?: string
  timezone?: string
}

/**
 * Ingest behavioral events from a session.
 * 2026: Behavioral biometrics analyze patterns in real time;
// if fraudster behavior doesn't match the cardholder, block instantly [^BB2].
// [^BB2]: PagBrasil. (2026). Payment Trends 2026: The Invisible Era.
 */
export async function ingestEvents(event: BiometricEvent) {
  const session = await prisma.customerSession.findUnique({
    where: { sessionToken: event.sessionToken },
  })

  if (!session) {
    // Create new session
    return prisma.customerSession.create({
      data: {
        sessionToken: event.sessionToken,
        customerId: event.customerId || "",
        keystrokeEvents: event.keystrokeEvents || [],
        mouseEvents: event.mouseEvents || [],
        touchEvents: event.touchEvents || [],
        deviceType: event.deviceType,
        screenResolution: event.screenResolution,
        timezone: event.timezone,
      },
    })
  }

  // Merge events
  const mergedKeystroke = [
    ...(session.keystrokeEvents as any[] || []),
    ...(event.keystrokeEvents || []),
  ].slice(-500) // keep last 500 events

  const mergedMouse = [
    ...(session.mouseEvents as any[] || []),
    ...(event.mouseEvents || []),
  ].slice(-500)

  const mergedTouch = [
    ...(session.touchEvents as any[] || []),
    ...(event.touchEvents || []),
  ].slice(-500)

  return prisma.customerSession.update({
    where: { id: session.id },
    data: {
      keystrokeEvents: mergedKeystroke,
      mouseEvents: mergedMouse,
      touchEvents: mergedTouch,
    },
  })
}

/**
 * Compute behavioral profile and risk score for a customer.
 * Uses the Fraud Agent to analyze patterns.
 */
export async function analyzeBehavior(customerId: string) {
  const sessions = await prisma.customerSession.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  if (sessions.length < 3) {
    // Not enough data for baseline
    return { riskScore: 0.3, riskLevel: "MEDIUM" as BiometricRiskLevel, baselineReady: false }
  }

  // Compute aggregate statistics
  const allKeystrokes = sessions.flatMap((s) => (s.keystrokeEvents as any[]) || [])
  const allMouse = sessions.flatMap((s) => (s.mouseEvents as any[]) || [])

  const dwellTimes = allKeystrokes.map((k) => k.dwell).filter(Boolean)
  const flightTimes = allKeystrokes.map((k) => k.flight).filter(Boolean)

  const avgDwell = dwellTimes.length > 0
    ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length
    : 0
  const avgFlight = flightTimes.length > 0
    ? flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length
    : 0

  const mouseVelocities = allMouse.map((m) => m.velocity).filter(Boolean)
  const avgMouseVelocity = mouseVelocities.length > 0
    ? mouseVelocities.reduce((a, b) => a + b, 0) / mouseVelocities.length
    : 0

  // Use fraud agent for risk scoring
  const fraudResult = await executeAgentTask("fraud", {
    type: "assess_behavioral_risk",
    input: {
      customerId,
      sessionCount: sessions.length,
      avgDwellTime: avgDwell,
      avgFlightTime: avgFlight,
      avgMouseVelocity,
      deviceTypes: [...new Set(sessions.map((s) => s.deviceType).filter(Boolean))],
      timezones: [...new Set(sessions.map((s) => s.timezone).filter(Boolean))],
      recentSessions: sessions.slice(0, 5).map((s) => ({
        riskScore: s.riskScore,
        deviceType: s.deviceType,
        createdAt: s.createdAt,
      })),
    },
  })

  const riskScore = (fraudResult.output.riskScore as number) ?? 0.3
  const riskLevel = (fraudResult.output.riskLevel as BiometricRiskLevel) || "MEDIUM"

  // Upsert behavior profile
  await prisma.customerBehaviorProfile.upsert({
    where: { customerId },
    update: {
      keystrokeDwellAvg: avgDwell,
      keystrokeFlightAvg: avgFlight,
      mouseVelocityPattern: avgMouseVelocity.toFixed(2),
      baselineSessions: sessions.length,
      riskScore,
      riskLevel,
      lastAnalyzedAt: new Date(),
    },
    create: {
      customerId,
      keystrokeDwellAvg: avgDwell,
      keystrokeFlightAvg: avgFlight,
      mouseVelocityPattern: avgMouseVelocity.toFixed(2),
      baselineSessions: sessions.length,
      riskScore,
      riskLevel,
      lastAnalyzedAt: new Date(),
    },
  })

  return { riskScore, riskLevel, baselineReady: true }
}

/**
 * Evaluate a session in real time for risk.
 * Called during checkout and payment flows.
 */
export async function evaluateSession(sessionToken: string) {
  const session = await prisma.customerSession.findUnique({
    where: { sessionToken },
    include: { customer: { include: { behaviorProfile: true } } },
  })

  if (!session) return { riskScore: 0.5, riskLevel: "MEDIUM" as BiometricRiskLevel }

  const profile = session.customer?.behaviorProfile
  if (!profile || profile.baselineSessions < 3) {
    return { riskScore: 0.4, riskLevel: "MEDIUM" as BiometricRiskLevel }
  }

  // Compare current session to baseline
  const currentKeystrokes = (session.keystrokeEvents as any[]) || []
  const currentMouse = (session.mouseEvents as any[]) || []

  if (currentKeystrokes.length < 5 && currentMouse.length < 5) {
    return { riskScore: profile.riskScore, riskLevel: profile.riskLevel }
  }

  const currentDwell = currentKeystrokes
    .map((k) => k.dwell)
    .filter(Boolean)
    .reduce((a, b) => a + b, 0) / currentKeystrokes.length

  const currentFlight = currentKeystrokes
    .map((k) => k.flight)
    .filter(Boolean)
    .reduce((a, b) => a + b, 0) / currentKeystrokes.length

  // Compute deviation from baseline
  const dwellDeviation = profile.keystrokeDwellAvg
    ? Math.abs(currentDwell - profile.keystrokeDwellAvg) / profile.keystrokeDwellAvg
    : 0
  const flightDeviation = profile.keystrokeFlightAvg
    ? Math.abs(currentFlight - profile.keystrokeFlightAvg) / profile.keystrokeFlightAvg
    : 0

  // Simple heuristic: high deviation = higher risk
  let riskScore = profile.riskScore
  if (dwellDeviation > 0.5) riskScore += 0.15
  if (flightDeviation > 0.5) riskScore += 0.15
  if (session.deviceType !== profile.deviceFingerprint) riskScore += 0.1

  riskScore = Math.min(1, Math.max(0, riskScore))

  let riskLevel: BiometricRiskLevel = "LOW"
  if (riskScore > 0.85) riskLevel = "CRITICAL"
  else if (riskScore > 0.6) riskLevel = "HIGH"
  else if (riskScore > 0.3) riskLevel = "MEDIUM"

  // Update session
  await prisma.customerSession.update({
    where: { id: session.id },
    data: { riskScore, riskLevel },
  })

  // Block if critical
  if (riskLevel === "CRITICAL") {
    await prisma.customerSession.update({
      where: { id: session.id },
      data: { isBlocked: true, blockReason: "Behavioral biometric anomaly detected" },
    })
  }

  return { riskScore, riskLevel }
}
