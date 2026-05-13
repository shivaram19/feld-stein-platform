import { Router } from "express"
import jwt from "jsonwebtoken"
import { prisma } from "../../lib/prisma"
import { env } from "../../config/env"
import { successResponse } from "../../shared/utils/response"
import { AppError } from "../../shared/errors/app-error"

const router = Router()

// POST /api/v1/auth/otp/request — Request OTP
router.post("/otp/request", async (req, res, next) => {
  try {
    const { phone } = req.body
    if (!phone || !phone.match(/^\+91\d{10}$/)) {
      throw AppError.validation("Valid Indian phone number required (+91XXXXXXXXXX)")
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store OTP in Redis (temporary)
    const { redis } = await import("../../lib/redis")
    await redis.setex(`otp:${phone}`, 600, otp)

    // TODO: Integrate with SMS provider (Msg91, Exotel, Twilio)
    // For now, return OTP in development
    if (env.NODE_ENV === "development") {
      return successResponse(res, { phone, otp, message: "OTP sent (dev mode)" })
    }

    return successResponse(res, { phone, message: "OTP sent to your phone" })
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/auth/otp/verify — Verify OTP and login/register
router.post("/otp/verify", async (req, res, next) => {
  try {
    const { phone, otp } = req.body
    if (!phone || !otp) {
      throw AppError.validation("Phone and OTP required")
    }

    const { redis } = await import("../../lib/redis")
    const storedOtp = await redis.get(`otp:${phone}`)

    if (!storedOtp || storedOtp !== otp) {
      throw AppError.unauthorized("Invalid or expired OTP")
    }

    // Delete OTP after use
    await redis.del(`otp:${phone}`)

    // Find or create customer
    let customer = await prisma.customer.findUnique({ where: { phone } })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          phone,
          name: "", // Will be updated in onboarding
          isVerified: true,
        },
      })
      // Create empty cart, wishlist, loyalty account
      await prisma.$transaction([
        prisma.cart.create({ data: { customerId: customer.id } }),
        prisma.wishlist.create({ data: { customerId: customer.id } }),
        prisma.loyaltyAccount.create({
          data: { customerId: customer.id, points: 50 },
        }),
      ])
    } else {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { isVerified: true },
      })
    }

    // Generate JWT
    const token = jwt.sign(
      { customerId: customer.id, phone: customer.phone },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    )

    return successResponse(res, {
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        languagePref: customer.languagePref,
      },
      isNewUser: !customer.name,
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/v1/auth/me — Get current customer
router.get("/me", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith("Bearer ")) {
      throw AppError.unauthorized()
    }

    const token = authHeader.split(" ")[1]
    const decoded = jwt.verify(token, env.JWT_SECRET) as { customerId: string }

    const customer = await prisma.customer.findUnique({
      where: { id: decoded.customerId },
      include: {
        addresses: true,
        loyaltyAccount: true,
      },
    })

    if (!customer || customer.deletedAt) {
      throw AppError.unauthorized("Account not found")
    }

    return successResponse(res, customer)
  } catch (error) {
    next(error)
  }
})

export default router
