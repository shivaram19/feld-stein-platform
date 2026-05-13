import { create } from "zustand"

interface CartItem {
  id: string
  quantity: number
  variant: {
    id: string
    sku: string
    name: string
    price: number
    product: {
      id: string
      name: string
      slug: string
      images: { url: string }[]
    }
  }
}

interface CartSummary {
  subtotal: number
  shipping: number
  discount: number
  gst: number
  total: number
}

interface CartState {
  items: CartItem[]
  summary: CartSummary | null
  coupon: { code: string; value: number; type: string } | null
  isLoading: boolean
  itemCount: number
  fetchCart: () => Promise<void>
  addToCart: (variantId: string, quantity?: number) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  applyCoupon: (code: string) => Promise<void>
  removeCoupon: () => Promise<void>
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  summary: null,
  coupon: null,
  isLoading: false,
  itemCount: 0,

  fetchCart: async () => {
    try {
      const { api } = await import("./api")
      const res = await api.get("/cart")
      const { cart, summary } = res.data.data
      set({
        items: cart?.items || [],
        summary,
        coupon: cart?.coupon || null,
        itemCount: cart?.items?.reduce((sum: number, item: CartItem) => sum + item.quantity, 0) || 0,
      })
    } catch {
      set({ items: [], summary: null, itemCount: 0 })
    }
  },

  addToCart: async (variantId, quantity = 1) => {
    set({ isLoading: true })
    try {
      const { api } = await import("./api")
      await api.post("/cart/items", { variantId, quantity })
      await get().fetchCart()
    } finally {
      set({ isLoading: false })
    }
  },

  updateQuantity: async (itemId, quantity) => {
    set({ isLoading: true })
    try {
      const { api } = await import("./api")
      await api.patch(`/cart/items/${itemId}`, { quantity })
      await get().fetchCart()
    } finally {
      set({ isLoading: false })
    }
  },

  removeItem: async (itemId) => {
    set({ isLoading: true })
    try {
      const { api } = await import("./api")
      await api.delete(`/cart/items/${itemId}`)
      await get().fetchCart()
    } finally {
      set({ isLoading: false })
    }
  },

  applyCoupon: async (code) => {
    try {
      const { api } = await import("./api")
      await api.post("/cart/coupon", { code })
      await get().fetchCart()
    } catch {
      throw new Error("Invalid or expired coupon")
    }
  },

  removeCoupon: async () => {
    try {
      const { api } = await import("./api")
      await api.delete("/cart/coupon")
      await get().fetchCart()
    } catch {
      // ignore
    }
  },
}))
