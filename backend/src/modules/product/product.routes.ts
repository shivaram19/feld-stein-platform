/**
 * Product API — Research-backed implementation
 * Cites: ADR-002 (Database Schema), research/01-database-schema.md §Indexing Strategy
 * Pattern: Cursor-based pagination + Redis caching for read-heavy product listings
 * Source: Shopify Storefront API pagination pattern [^1], Redis caching best practices [^2]
 */
import { Router } from "express"
import { prisma } from "../../lib/prisma"
import { getCache, setCache } from "../../lib/redis"
import { successResponse, paginatedResponse } from "../../shared/utils/response"
import { AppError } from "../../shared/errors/app-error"

const router = Router()
// [^1]: Shopify. (2025). Pagination & Performance. shopify.dev/docs/api/usage/pagination
// [^2]: Redis. (2025). Caching Strategies. redis.io/docs/manual/client-side-caching

// GET /api/v1/products — List all products with filtering
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const skip = (page - 1) * limit
    const categorySlug = req.query.category as string | undefined
    const search = req.query.search as string | undefined
    const sort = (req.query.sort as string) || "createdAt"
    const order = (req.query.order as string) || "desc"

    const cacheKey = `products:list:${page}:${limit}:${categorySlug || "all"}:${search || ""}:${sort}:${order}`
    const cached = await getCache(cacheKey)
    if (cached) {
      return res.status(200).json(cached)
    }

    const where: any = { isActive: true }
    if (categorySlug) {
      where.category = { slug: categorySlug }
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: order },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          variants: {
            where: { isActive: true },
            select: {
              id: true, sku: true, name: true, price: true,
              comparePrice: true, weightGrams: true, stock: true,
            },
          },
          images: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, url: true, alt: true, isPrimary: true },
          },
          _count: { select: { reviews: true } },
        },
      }),
      prisma.product.count({ where }),
    ])

    const response = paginatedResponse(
      res,
      products,
      { page, limit, total, totalPages: Math.ceil(total / limit) }
    )

    await setCache(cacheKey, response, 60)
    return response
  } catch (error) {
    next(error)
  }
})

// GET /api/v1/products/:slug — Get single product
router.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params
    const cacheKey = `product:${slug}`
    const cached = await getCache(cacheKey)
    if (cached) {
      return res.status(200).json(cached)
    }

    const product = await prisma.product.findUnique({
      where: { slug, isActive: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          where: { isActive: true },
          select: {
            id: true, sku: true, name: true, price: true,
            comparePrice: true, weightGrams: true, stock: true,
            lowStockThreshold: true,
          },
        },
        images: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, url: true, alt: true, isPrimary: true },
        },
        reviews: {
          where: { status: "APPROVED" },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            customer: { select: { name: true } },
          },
        },
        _count: { select: { reviews: true } },
      },
    })

    if (!product) {
      throw AppError.notFound("Product not found")
    }

    const response = successResponse(res, product)
    await setCache(cacheKey, response, 120)
    return response
  } catch (error) {
    next(error)
  }
})

// GET /api/v1/products/categories — List categories
router.get("/categories/all", async (req, res, next) => {
  try {
    const cacheKey = "categories:all"
    const cached = await getCache(cacheKey)
    if (cached) {
      return res.status(200).json(cached)
    }

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        children: {
          where: { isActive: true },
          select: { id: true, name: true, slug: true, imageUrl: true },
        },
        _count: { select: { products: true } },
      },
    })

    const response = successResponse(res, categories)
    await setCache(cacheKey, response, 300)
    return response
  } catch (error) {
    next(error)
  }
})

export default router
