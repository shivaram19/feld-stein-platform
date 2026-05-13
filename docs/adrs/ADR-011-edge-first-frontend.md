# ADR-011: Edge-First Frontend Architecture

## Status
Accepted — 2026-05-06

## Context
Server-first UI is the 2026 default. React Server Components (RSC) are stable and fully integrated in React 19, reducing bundle sizes by up to **70%**. **80% of Next.js deployments** are now on edge runtimes. Progressive hydration, edge SSR, and streaming are standard. Client-side AI (TensorFlow.js, Web AI) enables privacy-preserving inference directly in browsers.

## Decision
We will upgrade the frontend to **Edge-First Architecture**:

1. **React Server Components by default** — only hydrate interactive islands
2. **Edge Runtime deployment** — API routes and middleware on Vercel/Cloudflare edge
3. **Streaming SSR** — progressive page rendering with Suspense boundaries
4. **Client-side AI** — TensorFlow.js for behavioral biometrics collection, privacy-preserving
5. **View Transitions API** — native smooth page transitions without JS framework overhead
6. **AVIF/WebP auto-optimization** — Next.js Image component with format negotiation
7. **Feature-Sliced Design** — domain-driven architecture for maintainability at scale

### Rendering Strategy
| Route | Strategy | Reason |
|-------|----------|--------|
| /shop | ISR + RSC | Product catalog, cache 60s |
| /shop/[slug] | RSC + Streaming | Dynamic PDP, personalized |
| /cart | Client Component | High interactivity |
| /checkout | RSC + Client islands | Security + interactivity mix |
| /api/search | Edge Runtime | <50ms global latency |

## Consequences
- **Positive**: 70% reduction in JavaScript shipped to browser
- **Positive**: Edge deployment reduces global latency to <50ms
- **Positive**: Client-side AI preserves privacy for biometric data
- **Negative**: RSC debugging is more complex than pure CSR
- **Negative**: Edge runtime has Node.js API limitations

## Research Citations
- Ailunex. (2026). Top Web Development Trends in 2026. RSC stable, 80% edge deployments.
- Feature-Sliced Design. (2026). 5 Frontend Trends That Will Dominate 2026. Server-first UI, edge runtime default.
- Figma. (2026). 12 Defining Web Development Trends for 2026. Server-first performance default.
- Dev.to Isocyanide. (2026). 2026 Web Dev Trends That Actually Matter. Client-side AI with TensorFlow.js.
