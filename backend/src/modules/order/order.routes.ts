/**
 * Order API — Research-backed implementation
 * Cites: ADR-002 (Database Schema), ADR-003 (Payment Architecture)
 * Pattern: Snapshot denormalization for price/SKU at purchase time (legal/GST requirement)
 * Source: SAP Commerce Order Item Snapshot Pattern [^1], GST E-Invoice mandate [^2]
 * Transaction isolation: Prisma $transaction for atomic stock deduction + order creation
 * Source: Prisma Transactions docs [^3]
 */
import { Router } from "express"
import { prisma } from "../../lib/prisma"
import { deleteCache } from "../../lib/redis"
import { successResponse } from "../../shared/utils/response"
import { AppError } from "../../shared/errors/app-error"

const router = Router()
// [^1]: SAP. (2025). Order Item Snapshot Pattern. help.sap.com/docs/SAP_COMMERCE
// [^2]: GST Council. (2025). E-Invoice Mandate for AATO ≥ ₹5 Crore. gst.gov.in
// [^3]: Prisma. (2025). Transactions. prisma.io/docs/orm/prisma-client/queries/transactions

// POST /api/v1/orders — Create order from cart
router.post("/", async (req, res, next) => {
  try {
    const customerId = req.headers["x-customer-id"] as string
    if (!customerId) throw AppError.unauthorized()

    const { addressId, paymentMethod = "RAZORPAY", notes } = req.body

    // Get cart with items
    const cart = await prisma.cart.findUnique({
      where: { customerId },
      include: {
        items: {
          include: { variant: { include: { product: true } } },
        },
        coupon: true,
      },
    })

    if (!cart || cart.items.length === 0) {
      throw AppError.badRequest("Cart is empty")
    }

    // Get address
    const address = await prisma.address.findFirst({
      where: { id: addressId, customerId },
    })
    if (!address) throw AppError.notFound("Address not found")

    // Calculate totals
    let subtotal = 0
    for (const item of cart.items) {
      subtotal += Number(item.variant.price) * item.quantity
    }

    let discount = 0
    let couponCode: string | null = null
    if (cart.coupon) {
      couponCode = cart.coupon.code
      if (cart.coupon.type === "PERCENTAGE") {
        discount = Math.min(
          subtotal * (Number(cart.coupon.value) / 100),
          Number(cart.coupon.maxDiscount || Infinity)
        )
      } else if (cart.coupon.type === "FIXED_AMOUNT") {
        discount = Math.min(Number(cart.coupon.value), subtotal)
      }
    }

    const taxableAmount = subtotal - discount
    const gst = taxableAmount * 0.05
    const shipping = subtotal > 500 ? 0 : 60
    const grandTotal = taxableAmount + gst + shipping

    // Generate order number
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const count = await prisma.order.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
    const orderNumber = `FS-${datePrefix}-${String(count + 1).padStart(4, "0")}`

    // Create order
    const order = await prisma.$transaction(async (tx) => {
      // Deduct stock
      for (const item of cart.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        })
        await tx.inventoryLog.create({
          data: {
            variantId: item.variantId,
            quantity: -item.quantity,
            reason: `order_${orderNumber}`,
            note: `Order placement`,
          },
        })
      }

      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          status: paymentMethod === "COD" ? "PENDING" : "PENDING_PAYMENT",
          shippingAddress: address as any,
          billingAddress: address as any,
          subtotal,
          shippingCost: shipping,
          discountAmount: discount,
          gstTotal: gst,
          grandTotal,
          couponId: cart.couponId,
          couponCode,
          notes,
          items: {
            create: cart.items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              priceAtPurchase: item.variant.price,
              skuAtPurchase: item.variant.sku,
              nameAtPurchase: `${item.variant.product.name} — ${item.variant.name}`,
              weightAtPurchase: item.variant.weightGrams,
              discountAmount: 0,
              gstRate: 5,
              gstAmount: (Number(item.variant.price) * item.quantity * 0.05),
              total: Number(item.variant.price) * item.quantity * 1.05,
            })),
          },
        },
      })

      // Create payment record
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          gateway: paymentMethod as any,
          amount: grandTotal,
          currency: "INR",
          idempotencyKey: `order_${newOrder.id}_${Date.now()}`,
        },
      })

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
      await tx.cart.update({ where: { id: cart.id }, data: { couponId: null } })

      return newOrder
    })

    // Invalidate caches
    await deleteCache(`cart:${customerId}`)
    await deleteCache(`products:list:*`)

    return successResponse(res, { order }, "Order created", 201)
  } catch (error) {
    next(error)
  }
})

// GET /api/v1/orders/:id — Get order details
router.get("/:id", async (req, res, next) => {
  try {
    const customerId = req.headers["x-customer-id"] as string
    const { id } = req.params

    const order = await prisma.order.findFirst({
      where: { id, customerId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, name: true, slug: true, images: { where: { isPrimary: true }, take: 1 } } },
              },
            },
          },
        },
        payment: true,
        invoice: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    })

    if (!order) throw AppError.notFound("Order not found")
    return successResponse(res, order)
  } catch (error) {
    next(error)
  }
})

// GET /api/v1/orders — List customer orders
router.get("/", async (req, res, next) => {
  try {
    const customerId = req.headers["x-customer-id"] as string
    if (!customerId) throw AppError.unauthorized()

    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { customerId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: { select: { name: true, images: { where: { isPrimary: true }, take: 1 } } },
                },
              },
            },
            take: 1,
          },
          payment: { select: { status: true, gateway: true } },
        },
      }),
      prisma.order.count({ where: { customerId } }),
    ])

    return successResponse(res, {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    next(error)
  }
})

export default router
