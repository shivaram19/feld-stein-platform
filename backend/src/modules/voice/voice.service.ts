import { prisma } from "../../lib/prisma"

// ─────────────────────────────────────────────────────────────────────────────
// Voice Intent Service — Local-first classification (no OpenAI required)
// 2026: On-device intent recognition reduces latency and eliminates API costs
// for common e-commerce commands. Hybrid NLU (local + cloud) is the standard
// for voice commerce [^VI1].
// [^VI1]: Voicebot.ai. (2026). Voice Commerce Trends Report 2026.
// ─────────────────────────────────────────────────────────────────────────────

export type VoiceIntent =
  | "SEARCH"
  | "NAVIGATE"
  | "CART_ADD"
  | "CART_VIEW"
  | "CHECKOUT"
  | "ORDER_TRACK"
  | "CHAT"
  | "HELP"
  | "UNKNOWN"

export interface VoiceCommandResult {
  intent: VoiceIntent
  confidence: number
  action: string
  message: string
  data?: Record<string, unknown>
  navigateTo?: string
  searchQuery?: string
  productSlug?: string
  variantId?: string
  quantity?: number
  speak: boolean
}

// Intent keyword maps — supports English, Telugu, Hindi
const INTENT_KEYWORDS: Record<VoiceIntent, string[]> = {
  SEARCH: [
    "search", "find", "show", "looking for", "i want", "display",
    "వెతకండి", "కనుగొనండి", "చూపించు", "వెతకు",
    "खोज", "ढूंढ", "दिखाओ", "मुझे चाहिए",
  ],
  NAVIGATE: [
    "go to", "open", "navigate", "take me", "show page",
    "వెళ్ళు", "తెరువు", "పేజీకి వెళ్ళు",
    "जाओ", "खोलो", "पेज",
  ],
  CART_ADD: [
    "add to cart", "put in cart", "buy", "purchase", "add",
    "కార్ట్‌లో జోడించు", "కొను", "కార్ట్‌కు జోడించు",
    "कार्ट में डालो", "खरीदो", "जोड़ो",
  ],
  CART_VIEW: [
    "cart", "my cart", "basket", "show cart", "what is in my cart",
    "కార్ట్", "నా కార్ట్", "బుక్కెట్",
    "कार्ट", "मेरी कार्ट", "बुकेट",
  ],
  CHECKOUT: [
    "checkout", "place order", "order now", "buy now", "pay",
    "చెక్అవుట్", "ఆర్డర్", "ఇప్పుడే కొను",
    "चेकआउट", "ऑर्डर", "खरीद",
  ],
  ORDER_TRACK: [
    "track", "where is", "status of", "order status", "my order",
    "ట్రాక్", "ఎక్కడ", "ఆర్డర్ స్టేటస్",
    "ट्रैक", "कहाँ है", "ऑर्डर स्थिति",
  ],
  CHAT: [
    "what is", "how to", "benefits", "tell me", "explain",
    "ఏమిటి", "ఎలా", "ఉపయోగాలు", "చెప్పు",
    "क्या है", "कैसे", "फायदे", "बताओ",
  ],
  HELP: [
    "help", "what can you do", "commands", "assist",
    "సహాయం", "మీరు ఏమి చేయగలరు", "కమాండ్లు",
    "मदद", "तुम क्या कर सकते हो", "कमांड",
  ],
  UNKNOWN: [],
}

// Navigation targets
const NAV_TARGETS: { keywords: string[]; path: string; label: string }[] = [
  { keywords: ["home", "ముఖ్య పేజీ", "घर"], path: "/", label: "Home" },
  { keywords: ["shop", "store", "products", "షాప్", "దుకాణం", "ऑयल", "दुकान"], path: "/shop", label: "Shop" },
  { keywords: ["cart", "basket", "కార్ట్", "బుక్కెట్", "कार्ट", "बुकेट"], path: "/cart", label: "Cart" },
  { keywords: ["checkout", "చెక్అవుట్", "चेकआउट"], path: "/checkout", label: "Checkout" },
  { keywords: ["about", "story", "మా కథ", "हमारी कहानी"], path: "/about", label: "About" },
  { keywords: ["contact", "reach", "సంప్రదింపు", "संपर्क"], path: "/contact", label: "Contact" },
]

// Cached product names for fuzzy matching
let productCache: { name: string; slug: string; variants: { id: string; name: string }[] }[] | null = null
let cacheTime = 0

async function getProducts() {
  const now = Date.now()
  if (productCache && now - cacheTime < 60_000) return productCache

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      name: true,
      slug: true,
      variants: { where: { isActive: true }, select: { id: true, name: true } },
    },
  })

  productCache = products
  cacheTime = now
  return products
}

function classifyIntent(transcript: string): { intent: VoiceIntent; confidence: number } {
  const lower = transcript.toLowerCase()
  let bestIntent: VoiceIntent = "UNKNOWN"
  let bestScore = 0

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (intent === "UNKNOWN") continue
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += kw.split(/\s+/).length // Longer matches = higher confidence
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestIntent = intent as VoiceIntent
    }
  }

  // Boost confidence for exact phrase matches
  const confidence = Math.min(bestScore * 0.25 + 0.3, 0.95)
  return { intent: bestIntent, confidence }
}

function extractNavigateTarget(transcript: string): { path: string; label: string } | null {
  const lower = transcript.toLowerCase()
  for (const target of NAV_TARGETS) {
    for (const kw of target.keywords) {
      if (lower.includes(kw.toLowerCase())) return target
    }
  }
  return null
}

async function extractProduct(transcript: string) {
  const products = await getProducts()
  const lower = transcript.toLowerCase()

  // Direct slug or name match
  for (const p of products) {
    if (lower.includes(p.slug.toLowerCase()) || lower.includes(p.name.toLowerCase())) {
      // Check for variant size mention
      for (const v of p.variants) {
        if (lower.includes(v.name.toLowerCase())) {
          return { product: p, variant: v }
        }
      }
      return { product: p, variant: p.variants[0] }
    }
  }

  // Partial word match
  for (const p of products) {
    const words = p.name.toLowerCase().split(/\s+/)
    for (const w of words) {
      if (w.length > 3 && lower.includes(w)) {
        return { product: p, variant: p.variants[0] }
      }
    }
  }

  return null
}

function extractQuantity(transcript: string): number {
  const words = transcript.toLowerCase()
  const numMap: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    "ఒకటి": 1, "రెండు": 2, "మూడు": 3, "నాలుగు": 4, "ఐదు": 5,
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5,
  }

  // Digit match
  const digitMatch = words.match(/\b(\d+)\b/)
  if (digitMatch) return parseInt(digitMatch[1], 10)

  // Word match
  for (const [word, num] of Object.entries(numMap)) {
    if (words.includes(word)) return num
  }

  return 1
}

function extractSearchQuery(transcript: string, intent: VoiceIntent): string {
  let cleaned = transcript
  const prefixes = [
    "search for", "find", "show me", "looking for", "i want",
    "వెతకండి", "కనుగొనండి", "చూపించు", "వెతకు",
    "खोज", "ढूंढ", "दिखाओ", "मुझे चाहिए",
  ]
  for (const p of prefixes) {
    cleaned = cleaned.replace(new RegExp(p, "gi"), "")
  }
  return cleaned.trim() || transcript
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function processVoiceCommand(
  transcript: string,
  customerId?: string
): Promise<VoiceCommandResult> {
  const { intent, confidence } = classifyIntent(transcript)

  switch (intent) {
    case "SEARCH": {
      const query = extractSearchQuery(transcript, intent)
      return {
        intent,
        confidence,
        action: "SEARCH_PRODUCTS",
        message: `Searching for "${query}"`,
        searchQuery: query,
        navigateTo: `/shop?search=${encodeURIComponent(query)}`,
        speak: true,
      }
    }

    case "NAVIGATE": {
      const target = extractNavigateTarget(transcript)
      if (target) {
        return {
          intent,
          confidence,
          action: "NAVIGATE",
          message: `Opening ${target.label}`,
          navigateTo: target.path,
          speak: true,
        }
      }
      return {
        intent: "UNKNOWN",
        confidence: 0.3,
        action: "UNKNOWN",
        message: "I'm not sure where you want to go. Try saying 'go to shop' or 'open cart'.",
        speak: true,
      }
    }

    case "CART_ADD": {
      const product = await extractProduct(transcript)
      if (!product) {
        return {
          intent,
          confidence,
          action: "CART_ADD_NEED_CLARIFICATION",
          message: "Which product would you like to add? Say something like 'add mustard oil to cart'.",
          speak: true,
        }
      }
      const quantity = extractQuantity(transcript)
      return {
        intent,
        confidence,
        action: "CART_ADD",
        message: `Adding ${quantity} × ${product.variant.name} ${product.product.name} to your cart.`,
        productSlug: product.product.slug,
        variantId: product.variant.id,
        quantity,
        navigateTo: "/cart",
        speak: true,
      }
    }

    case "CART_VIEW": {
      return {
        intent,
        confidence,
        action: "CART_VIEW",
        message: "Showing your cart.",
        navigateTo: "/cart",
        speak: true,
      }
    }

    case "CHECKOUT": {
      return {
        intent,
        confidence,
        action: "CHECKOUT",
        message: "Taking you to checkout.",
        navigateTo: "/checkout",
        speak: true,
      }
    }

    case "ORDER_TRACK": {
      // Try to extract order number
      const orderMatch = transcript.match(/FS-\d{8}-\d{4}/i)
      return {
        intent,
        confidence,
        action: "ORDER_TRACK",
        message: orderMatch
          ? `Tracking order ${orderMatch[0]}.`
          : "Please provide your order number. It looks like FS-20260513-0001.",
        data: orderMatch ? { orderNumber: orderMatch[0] } : undefined,
        speak: true,
      }
    }

    case "CHAT": {
      return {
        intent,
        confidence,
        action: "CHAT",
        message: "I'd love to chat! What would you like to know about our oils?",
        speak: true,
      }
    }

    case "HELP": {
      return {
        intent,
        confidence,
        action: "HELP",
        message:
          "Here is what you can say: " +
          "'Find mustard oil' to search, " +
          "'Add mustard oil to cart' to buy, " +
          "'Go to cart' to review, " +
          "'Checkout' to pay, or " +
          "'Track order' for shipping updates.",
        speak: true,
      }
    }

    default: {
      return {
        intent: "UNKNOWN",
        confidence: 0.2,
        action: "UNKNOWN",
        message: "I didn't understand that. Say 'help' for a list of commands.",
        speak: true,
      }
    }
  }
}
