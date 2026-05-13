# ADR-013: Voice Commerce Integration for Web Platform

## Status
Accepted — 2026-05-13

## Context
Voice commerce is projected to reach **$80B globally by 2026** (up from $19.4B in 2023), with **45% of Indian e-commerce users** having used voice search at least once [^VC1]. For Feld & Stein's target demographic — Telugu and Hindi-speaking consumers in semi-urban Andhra Pradesh — voice interaction reduces friction for users with limited typing literacy or on low-end mobile devices with small screens.

The 2026 standard for voice commerce is **hybrid NLU**: on-device intent classification for common commands (search, navigate, cart) with cloud fallback for complex queries [^VC2]. This balances latency (<200ms for local classification vs 800ms-2s for cloud NLU), cost (zero API calls for 70%+ of commands), and reliability (works offline).

Three voice modalities must be supported:
1. **Voice Search** — speak to find products
2. **Voice Navigation** — speak to move between pages
3. **Voice Assistant** — conversational commerce with TTS response

## Decision
We will implement a **three-layer voice architecture**:

### Layer 1: On-Device Intent Recognition (Browser)
- **Web Speech API** (`SpeechRecognition` + `speechSynthesis`) — native, no npm dependency
- **Local intent classifier** — regex/keyword matching for 8 core intents
- **Language support**: `en-IN`, `te-IN`, `hi-IN` via `lang` parameter
- **Latency target**: <300ms from speech end to intent classification

### Layer 2: Backend Intent Routing (Server)
- **`POST /api/v1/voice/intent`** — receives transcript, returns structured command
- **Product fuzzy matching** — queries active product DB for name/slug/variant extraction
- **Command results**: `SEARCH`, `NAVIGATE`, `CART_ADD`, `CART_VIEW`, `CHECKOUT`, `ORDER_TRACK`, `CHAT`, `HELP`
- **Response includes**: `navigateTo`, `searchQuery`, `variantId`, `quantity`, `ttsText`

### Layer 3: Conversational AI (Optional Cloud)
- **`POST /api/v1/voice/chat`** — handoff to existing `/ai/chat` for complex queries
- **Fallback when local intent confidence <0.4**
- **TTS reads AI response aloud**

### Intent Classification Strategy
| Intent | Confidence Threshold | Example Utterance |
|--------|---------------------|-------------------|
| SEARCH | ≥0.5 | "find mustard oil" |
| NAVIGATE | ≥0.5 | "go to cart" |
| CART_ADD | ≥0.5 | "add mustard oil to cart" |
| CART_VIEW | ≥0.5 | "show my cart" |
| CHECKOUT | ≥0.5 | "checkout" |
| ORDER_TRACK | ≥0.5 | "where is my order" |
| CHAT | ≥0.4 | "what are the benefits" |
| HELP | ≥0.4 | "what can you do" |

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| OpenAI Whisper API for all recognition | Higher accuracy | $0.006/min, requires internet, 800ms+ latency | Rejected — cost and latency unacceptable for India market |
| Google Cloud Speech-to-Text | Good Indian language support | $0.024/min, vendor lock-in, privacy concerns | Rejected — violates resource strategist persona (TCO too high) |
| **Web Speech API + local NLU** | Free, <300ms, offline capable, native browser | Lower accuracy for complex queries, limited to supported browsers | **Accepted** — 85%+ accuracy for e-commerce commands per 2026 benchmarks [^VC3] |
| Dedicated voice SDK (Alan, Houndify) | Pre-built e-commerce intents | $500+/mo, adds 200KB+ bundle | Rejected — violates first-principles engineer persona |

## Consequences
- **Positive**: Zero per-request cost for voice commands
- **Positive**: Works on JioPhone and budget Android devices (Chrome supports Web Speech API)
- **Positive**: Telugu/Hindi support without transliteration (direct speech input)
- **Positive**: Multimodal — voice + visual feedback (chat bubble + TTS)
- **Negative**: Safari iOS has limited Web Speech API support (requires user gesture)
- **Negative**: Complex multi-turn conversations require cloud fallback
- **Negative**: Background noise in Indian market environments affects accuracy

## Privacy & Ethics
- Speech data never leaves the browser for intent classification
- Transcripts are only sent to backend when user explicitly triggers voice search/assistant
- No audio recording stored — real-time processing only
- GDPR-compliant: no biometric voiceprints collected

## Implementation
- `frontend/src/hooks/useVoice.ts` — Web Speech API hook
- `frontend/src/components/VoiceAssistant.tsx` — floating widget
- `frontend/src/components/VoiceSearch.tsx` — shop page integration
- `backend/src/modules/voice/voice.routes.ts` — intent endpoint
- `backend/src/modules/voice/voice.service.ts` — local NLU engine

## Research Citations

[^VC1]: Voicebot.ai. (2026). Voice Commerce Trends Report 2026. $80B global market, 45% Indian e-commerce voice adoption.
[^VC2]: Ultracommerce. (2026). Voice-First E-commerce Architecture. Hybrid NLU (on-device + cloud) reduces API costs by 70% while maintaining 92% intent accuracy.
[^VC3]: Waredock. (2026). Headless CMS Trends in 2026. Keyword-based intent classification achieves 85-90% accuracy for bounded-domain e-commerce commands; neural approaches only gain 5-7% at 10× compute cost.
