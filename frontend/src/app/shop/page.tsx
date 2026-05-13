"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useCartStore } from "@/lib/store"
import { VoiceSearch } from "@/components/VoiceSearch"

interface Product {
  id: string
  name: string
  slug: string
  shortDesc: string
  variants: { id: string; name: string; price: number; stock: number }[]
  images: { url: string; alt: string }[]
  category: { name: string; slug: string }
}

// 2026: Client components are reserved for highly interactive islands.
// Search, filters, and cart actions remain client-side; product grid can stream from RSC [^SP1].
// [^SP1]: Feature-Sliced Design. (2026). 5 Frontend Trends That Will Dominate 2026.

export default function ShopPage() {
  const searchParams = useSearchParams()
  const categorySlug = searchParams.get("category")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isSemantic, setIsSemantic] = useState(false)
  const addToCart = useCartStore((s) => s.addToCart)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      if (isSemantic && search.length > 2) {
        // 2026: Hybrid vector search replaces keyword-only search.
        // Semantic queries like "oil for joint pain" return intent-matched results [^SP2].
        // [^SP2]: DevNewsletter. (2026). State of Databases 2026.
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/search?q=${encodeURIComponent(search)}`)
        const data = await res.json()
        setProducts(data.data || [])
      } else {
        const params = new URLSearchParams()
        if (categorySlug) params.set("category", categorySlug)
        if (search) params.set("search", search)
        params.set("limit", "50")
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products?${params}`)
        const data = await res.json()
        setProducts(data.data?.data || [])
      }
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [categorySlug, search, isSemantic])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return (
    <main className="flex-1 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <span className="font-body text-xs tracking-[0.15em] uppercase text-secondary">Shop</span>
            <h1 className="mt-2 font-display text-3xl font-light">
              {categorySlug ? categorySlug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "All Oils"}
            </h1>
          </div>
          <div className="flex gap-3 items-center">
            <label className="flex items-center gap-2 text-sm font-body text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={isSemantic}
                onChange={(e) => setIsSemantic(e.target.checked)}
                className="rounded border-border-subtle"
              />
              AI Search
            </label>
            <div className="flex items-center gap-2">
              <VoiceSearch
                onSearch={(query) => {
                  setSearch(query)
                  // Trigger search after a brief delay to let state update
                  setTimeout(() => {
                    const params = new URLSearchParams(window.location.search)
                    params.set("search", query)
                    window.history.replaceState(null, "", `?${params}`)
                  }, 50)
                }}
              />
              <input
                type="text"
                placeholder={isSemantic ? "Describe what you need..." : "Search oils..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-4 py-2 rounded-lg border border-border-subtle bg-canvas font-body text-sm focus:outline-none focus:border-brand-green w-56"
              />
            </div>
          </div>
        </div>

        {isSemantic && search.length > 2 && (
          <p className="mb-4 text-xs font-body text-brand-green">
            Using semantic search — finding oils by meaning, not just keywords
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/5] rounded-2xl bg-surface" />
                <div className="mt-4 h-5 bg-surface rounded w-3/4" />
                <div className="mt-2 h-4 bg-surface rounded w-full" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display text-xl text-secondary">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id} className="group">
                <Link href={`/shop/${product.slug}`}>
                  <div className="aspect-[4/5] rounded-2xl bg-canvas border border-border-subtle overflow-hidden relative">
                    {product.images?.[0] && (
                      <Image
                        src={product.images[0].url}
                        alt={product.images[0].alt || product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                  </div>
                </Link>
                <div className="mt-4">
                  <Link href={`/shop/${product.slug}`}>
                    <h3 className="font-display text-lg font-medium text-primary group-hover:text-brand-green transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="mt-1 font-body text-sm text-secondary line-clamp-2">{product.shortDesc}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-body text-sm font-medium text-primary">
                      From ₹{product.variants?.[0]?.price}
                    </p>
                    <button
                      onClick={() => product.variants?.[0] && addToCart(product.variants[0].id)}
                      className="px-3 py-1.5 rounded-md text-xs font-body font-medium text-white bg-brand-green hover:opacity-90 transition-opacity"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
