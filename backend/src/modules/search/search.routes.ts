import { Router } from "express"
import { successResponse } from "../../shared/utils/response"
import { AppError } from "../../shared/errors/app-error"
import { searchProducts, indexProduct } from "./hybrid-search.service"

const router = Router()

// GET /api/v1/search?q=... — Hybrid vector + keyword search
// 2026: Hybrid search (vector + BM25) is the default pattern for production RAG.
// Pure vector search suffers from drift; hybrid cross-verifies for accuracy [^SR1].
// [^SR1]: DevNewsletter. (2026). State of Databases 2026.
router.get("/", async (req, res, next) => {
  try {
    const q = req.query.q as string
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20)
    if (!q || q.length < 2) throw AppError.badRequest("Query must be at least 2 characters")

    const products = await searchProducts(q, limit)
    successResponse(res, products)
  } catch (err) { next(err) }
})

// POST /api/v1/search/index/:productId — Re-index a product for search
router.post("/index/:productId", async (req, res, next) => {
  try {
    await indexProduct(req.params.productId)
    successResponse(res, { indexed: true })
  } catch (err) { next(err) }
})

export default router
