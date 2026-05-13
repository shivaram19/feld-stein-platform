# ADR-008: Payment Orchestration Layer

## Status
Accepted — 2026-05-06

## Context
Payments in 2026 are **invisible, embedded, and intelligent**. The multi-step checkout form is dying — checkout times under 10 seconds are baseline. Static acquirer relationships are replaced by **AI-powered dynamic routing** that improves authorization rates and lowers costs. Network tokenization is essential (3%+ auth rate lift). Digital wallets grew 168% YoY in Nov 2025. Biometric authentication (face/fingerprint) is the norm.

## Decision
We will build a **Payment Orchestration Layer** with:

1. **Intelligent Gateway Routing** — rule-based + AI-predicted gateway selection per transaction
2. **Invisible Checkout** — one-click purchase with tokenized credentials, no redirects
3. **Biometric Authentication** — UPI 2.0 biometric + fallback to device biometrics
4. **Network Tokenization** — PAN replacement for 3%+ auth rate improvement
5. **Retry Intelligence** — automatic failover to fallback gateway on failure
6. **Multi-method Support** — Razorpay (INR), Stripe (USD/EUR), UPI, Wallets, COD
7. **AP2 Mandate Integration** — AI agents can initiate payments with cryptographically signed scopes

### Routing Logic
```
IF currency = INR AND amount < 2000 AND method = UPI → Razorpay UPI
IF currency = USD/EUR → Stripe
IF customer.device = mobile AND biometric = available → biometric flow
IF gateway.success_probability < 0.85 → fallback gateway
```

## Consequences
- **Positive**: Checkout friction reduced to <10 seconds
- **Positive**: 3%+ authorization rate improvement from tokenization
- **Positive**: AI routing reduces payment failures and costs
- **Negative**: Orchestration layer adds ~50ms latency per transaction
- **Negative**: Compliance complexity for biometric data storage

## Research Citations
- Mastercard. (2026). Payment trends in 2026: Innovation, Trust, & Growth.
- Trust Payments. (2026). Top trends for online payments in 2026. AI routing, invisible checkout.
- PagBrasil. (2026). Payment Trends 2026: The Invisible Era. 168% digital wallet growth.
- Netcetera. (2026). 7 payment trends shaping 2026. Digital identity wallets, orchestration.
