# ADR-006: Agent-Ready API Architecture

## Status
Accepted — 2026-05-06

## Context
By 2026, 75% of enterprise ecommerce is powered by agentic AI. Autonomous software agents negotiate, order, and manage supplier relationships without direct human input. One-third of marketplace projects are abandoned because answer engines intercept buyer journeys before they reach vendor platforms. Our API must serve **both human buyers and AI agents simultaneously** — two audiences with fundamentally different requirements.

Human buyers want intuitive interfaces and emotional reassurance. AI agents want clean data structures, reliable APIs, machine-readable product information, and cryptographically verifiable transaction mandates.

## Decision
We will implement an **Agent-Ready API** layer with the following characteristics:

1. **JSON-LD Schema.org markup** on all product/order responses for machine readability
2. **Structured data compliance** — every entity exposes `@context`, `@type`, `@id`
3. **Agent Payments Protocol (AP2) support** — cryptographically signed mandates for AI-agent transactions
4. **Dual-audience endpoints** — same URL, but `Accept: application/ld+json` returns machine-optimized format
5. **Machine-actionable metadata** — `actionable`, `negotiable`, `agentEligible` flags on products
6. **OpenAPI 3.1 spec** with semantic annotations for agent discovery

## Consequences
- **Positive**: Platform is immediately discoverable and actionable by AI agents, shopping assistants, and answer engines
- **Positive**: AP2 mandates create unbreakable audit trails for agent-driven transactions
- **Negative**: Response payload size increases by ~15% due to JSON-LD overhead
- **Negative**: Requires maintaining two serialization formats per endpoint

## Research Citations
- Gartner. (2026). Autonomous AI agents rank among most strategically significant shifts.
- Ultracommerce. (2026). Enterprise ecommerce in 2026: 75% agentic AI adoption, 33% marketplace abandonment due to answer engines.
- Newgensoft. (2026). Banking Tech Trends Report 2026. AP2 framework for AI-agent transactions.
