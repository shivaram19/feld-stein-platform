# ADR-012: Behavioral Biometrics & Fraud Detection

## Status
Accepted — 2026-05-06

## Context
Rigid "allow or block" fraud rules are obsolete. The 2026 standard is **passive authentication** — behavioral biometrics analyze typing cadence, mouse movements, touch pressure, and device signals for continuous verification throughout a session. Fraud detection rates approach **98% with advanced neural networks**. Biometric payment authentication market is projected to grow from $21.63B (2026) to $111.9B (2034) at 22.8% CAGR. Asia-Pacific leads adoption at ~60%.

## Decision
We will implement **Behavioral Biometrics** with:

1. **Keystroke Dynamics** — dwell time, flight time analysis per session
2. **Mouse Dynamics** — velocity patterns, entropy scoring
3. **Touch Dynamics** — pressure, swipe velocity on mobile
4. **Device Fingerprinting** — stable hash of device characteristics
5. **Risk Scoring Engine** — real-time risk score (0-1) per session
6. **Continuous Authentication** — risk re-evaluated every 30 seconds during active session
7. **Passive Blocking** — high-risk sessions silently throttled (CAPTCHA, 3DS, manual review) without explicit challenge

### Risk Levels
| Score | Level | Action |
|-------|-------|--------|
| 0.0-0.3 | LOW | Normal flow |
| 0.3-0.6 | MEDIUM | Additional logging |
| 0.6-0.85 | HIGH | 3DS challenge, SMS verify |
| 0.85-1.0 | CRITICAL | Block transaction, manual review |

## Consequences
- **Positive**: 98% fraud detection without explicit user friction
- **Positive**: Continuous auth eliminates password fatigue
- **Positive**: Behavioral data is harder to spoof than static credentials
- **Negative**: Privacy concerns require GDPR-compliant consent flows
- **Negative**: Baseline establishment requires 3-5 sessions per user

## Research Citations
- Intel Market Research. (2026). Biometric Payment Authentication Market Outlook 2026-2034. $21.63B→$111.9B, 22.8% CAGR.
- Coinlaw. (2026). Biometric Payment Authentication Statistics 2026. 60% APAC adoption, 82% urban smartphone transactions.
- Newgensoft. (2026). Banking Tech Trends Report 2026. 98% fraud detection with neural networks, 70-80% false positive reduction.
- Mastercard. (2026). Payment trends in 2026. Fraud prevention enters age of autonomous intelligence.
