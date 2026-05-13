/**
 * Cart API — Research-backed implementation
 * Cites: ADR-002 (Database Schema), research/01-database-schema.md §Cart & Wishlist
 * Pattern: Persistent cart (not session-based) for cross-device continuity
 * Source: Baymard Institute (2024) — 69.8% cart abandonment rate; persistent carts recover 10-15% [^1]
 * Source: Shopify Cart API design patterns [^2]
 */
import { Router } from "express"
import { prisma } from "../../lib/prisma"
import { getCache, setCache, deleteCache } from "../../lib/redis"
import { successResponse } from "../../shared/utils/response"
import { AppError } from "../../shared/errors/app-error"

const router = Router()
// [^1]: Baymard Institute. (2024). Cart Abandonment Rate Statistics. baymard.com/lists/cart-abandonment-rate
// [^2]: Shopify. (2025). Cart API Reference. shopify.dev/docs/api/admin-graphql/latest/objects/cart

// GET /api/v1/cart — Get customer's cart
router.get("/", async (req, res, next) => {
  try {
    const customerId = req.headers["x-customer-id"] as string
    if (!customerId) throw AppError.unauthorized()

    const cacheKey = `cart:${customerId}`
    const cached = await getCache(cacheKey)
    if (cached) return res.status(200).json(cached)

    const cart = await prisma.cart.findUnique({
      where: { customerId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: { id: true, name: true, slug: true, images: { where: { isPrimary: true }, take: 1 } },
                },
              },
            },
          },
        },
        coupon: true,
      },
    })

    if (!cart) {
      const newCart = await prisma.cart.create({
        data: { customerId },
        include: { items: { include: { variant: { include: { product: true } } } } },
      })
      const response = successResponse(res, { cart: newCart, summary: { subtotal: 0, shipping: 0, discount: 0, gst: 0, total: 0 } })
      await setCache(cacheKey, response, 60)
      return response
    }

    // Calculate cart summary
    let subtotal = 0
    for (const item of cart.items) {
      subtotal += Number(item.variant.price) * item.quantity
    }

    let discount = 0
    if (cart.coupon) {
      if (cart.coupon.type === "PERCENTAGE") {
        discount = Math.min(subtotal * (Number(cart.coupon.value) / 100), Number(cart.coupon.maxDiscount || Infinity))
      } else if (cart.coupon.type === "FIXED_AMOUNT") {
        discount = Math.min(Number(cart.coupon.value), subtotal)
      }
    }

    const taxableAmount = subtotal - discount
    const gst = taxableAmount * 0.05 // 5% GST on edible oils
    const shipping = subtotal > 500 ? 0 : 60
    const total = taxableAmount + gst + shipping

    const response = successResponse(res, {
      cart,
      summary: {
        subtotal: Math.round(subtotal * 100) / 100,
        shipping,
        discount: Math.round(discount * 100) / 100,
        gst: Math.round(gst * 100) / 100,
        total: Math.round(total * 100) / 100,
      },
    })

    await setCache(cacheKey, response, 60)
    return response
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/cart/items — Add item to cart
router.post("/items", async (req, res, next) => {
  try {
    const customerId = req.headers["x-customer-id"] as string
    if (!customerId) throw AppError.unauthorized()

    const { variantId, quantity = 1 } = req.body
    if (!variantId) throw AppError.validation("variantId is required")

    // Check stock
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
    })
    if (!variant || !variant.isActive) throw AppError.notFound("Product variant not found")
    if (variant.stock < quantity) throw AppError.badRequest(`Only ${variant.stock} units available`)

    // Get or create cart
    let cart = await prisma.cart.findUnique({ where: { customerId } })
    if (!cart) {
      cart = await prisma.cart.create({ data: { customerId } })
    }

    // Upsert cart item
    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      update: { quantity: { increment: quantity } },
      create: { cartId: cart.id, variantId, quantity },
    })

    // Invalidate cache
    await deleteCache(`cart:${customerId}`)

    return successResponse(res, { message: "Item added to cart" })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/v1/cart/items/:itemId — Update quantity
router.patch("/items/:itemId", async (req, res, next) => {
  try {
    const customerId = req.headers["x-customer-id"] as string
    if (!customerId) throw AppError.unauthorized()

    const { itemId } = req.params
    const { quantity } = req.body
    if (quantity < 1) throw AppError.validation("Quantity must be at least 1")

    const cart = await prisma.cart.findUnique({ where: { customerId } })
    if (!cart) throw AppError.notFound("Cart not found")

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { variant: true },
    })
    if (!item) throw AppError.notFound("Cart item not found")
    if (item.variant.stock < quantity) throw AppError.badRequest(`Only ${item.variant.stock} units available`)

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    })

    await deleteCache(`cart:${customerId}`)
    return successResponse(res, { message: "Cart updated" })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/v1/cart/items/:itemId — Remove item
router.delete("/items/:itemId", async (req, res, next) => {
  try {
    const customerId = req.headers["x-customer-id"] as string
    if (!customerId) throw AppError.unauthorized()

    const { itemId } = req.params
    const cart = await prisma.cart.findUnique({ where: { customerId } })
    if (!cart) throw AppError.notFound("Cart not found")

    await prisma.cartItem.deleteMany({
      where: { id: itemId, cartId: cart.id },
    })

    await deleteCache(`cart:${customerId}`)
    return successResponse(res, { message: "Item removed" })
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/cart/coupon — Apply coupon
router.post("/coupon", async (req, res, next) => {
  try {
    const customerId = req.headers["x-customer-id"] as string
    if (!customerId) throw AppError.unauthorized()

    const { code } = req.body
    const coupon = await prisma.coupon.findUnique({ where: { code } })

    if (!coupon || !coupon.isActive) throw AppError.badRequest("Invalid coupon code")
    if (coupon.endDate && coupon.endDate < new Date()) throw AppError.badRequest("Coupon expired")
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) throw AppError.badRequest("Coupon usage limit reached")

    const cart = await prisma.cart.findUnique({ where: { customerId } })
    if (!cart) throw AppError.notFound("Cart not found")

    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponId: coupon.id },
    })

    await deleteCache(`cart:${customerId}`)
    return successResponse(res, { message: `Coupon ${code} applied`, coupon })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/v1/cart/coupon — Remove coupon
router.delete("/coupon", async (req, res, next) => {
  try {
    const customerId = req.headers["x-customer-id"] as string
    if (!customerId) throw AppError.unauthorized()

    const cart = await prisma.cart.findUnique({ where: { customerId } })
    if (!cart) throw AppError.notFound("Cart not found")

    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponId: null },
    })

    await deleteCache(`cart:${customerId}`)
    return successResponse(res, { message: "Coupon removed" })
  } catch (error) {
    next(error)
  }
})

export default router
