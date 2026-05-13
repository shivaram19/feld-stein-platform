"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { useCartStore } from "@/lib/store"

interface Product {
  id: string
  name: string
  slug: string
  description: string
  shortDesc: string
  benefits: string[]
  ingredients: string
  howToUse: string
  shelfLife: string
  variants: { id: string; name: string; price: number; comparePrice?: number; stock: number; weightGrams: number }[]
  images: { url: string; alt: string; isPrimary: boolean }[]
  reviews: { id: string; rating: number; body: string; customer: { name: string } }[]
  _count: { reviews: number }
}

export default function ProductPage() {
  const { slug } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<string>("")
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const addToCart = useCartStore((s) => s.addToCart)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        const p = data.data
        setProduct(p)
        if (p?.variants?.length > 0) setSelectedVariant(p.variants[0].id)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [slug])

  const variant = product?.variants.find((v) => v.id === selectedVariant)

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12">
          <div className="mx-auto max-w-7xl px-4 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="aspect-square rounded-2xl bg-surface" />
              <div className="space-y-4">
                <div className="h-8 bg-surface rounded w-3/4" />
                <div className="h-4 bg-surface rounded w-full" />
                <div className="h-4 bg-surface rounded w-2/3" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-2xl text-secondary">Product not found</h1>
            <Link href="/shop" className="mt-4 inline-block text-brand-green hover:underline font-body text-sm">
              ← Back to shop
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="mb-8 font-body text-sm text-secondary">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/shop" className="hover:text-primary">Shop</Link>
            <span className="mx-2">/</span>
            <span className="text-primary">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <div className="aspect-square rounded-2xl bg-surface border border-border-subtle overflow-hidden relative">
                {product.images[0] && (
                  <Image
                    src={product.images[0].url}
                    alt={product.images[0].alt || product.name}
                    fill
                    className="object-cover"
                    priority
                  />
                )}
              </div>
            </div>

            <div>
              <h1 className="font-display text-3xl font-light text-primary">{product.name}</h1>
              <p className="mt-2 font-body text-sm text-secondary">{product.shortDesc}</p>

              <div className="mt-6 flex items-baseline gap-3">
                {variant && (
                  <>
                    <span className="font-display text-3xl font-light text-primary">₹{variant.price}</span>
                    {variant.comparePrice && (
                      <span className="font-body text-lg text-secondary line-through">₹{variant.comparePrice}</span>
                    )}
                  </>
                )}
              </div>

              <div className="mt-6">
                <p className="font-body text-xs font-medium uppercase tracking-wider text-secondary mb-2">Size</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => { setSelectedVariant(v.id); setQuantity(1) }}
                      className={`px-4 py-2 rounded-lg border font-body text-sm transition-colors ${
                        selectedVariant === v.id
                          ? "border-brand-green bg-brand-green/5 text-brand-green"
                          : "border-border-subtle text-secondary hover:border-primary"
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <p className="font-body text-xs font-medium uppercase tracking-wider text-secondary mb-2">Quantity</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg border border-border-subtle flex items-center justify-center font-body text-lg hover:bg-surface">−</button>
                  <span className="w-12 text-center font-body text-lg">{quantity}</span>
                  <button onClick={() => variant && setQuantity(Math.min(variant.stock, quantity + 1))} className="w-10 h-10 rounded-lg border border-border-subtle flex items-center justify-center font-body text-lg hover:bg-surface">+</button>
                </div>
              </div>

              {variant && (
                <p className={`mt-3 font-body text-sm ${variant.stock < 10 ? "text-danger" : "text-success"}`}>
                  {variant.stock < 10 ? `Only ${variant.stock} left` : "In stock"}
                </p>
              )}

              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => variant && addToCart(variant.id, quantity)}
                  className="flex-1 px-6 py-4 rounded-xl text-base font-body font-medium text-white bg-brand-green hover:opacity-90 transition-opacity"
                >
                  Add to Cart — ₹{variant ? variant.price * quantity : 0}
                </button>
              </div>

              <div className="mt-10 pt-10 border-t border-border-subtle">
                <p className="font-body text-xs font-medium uppercase tracking-wider text-secondary mb-4">Benefits</p>
                <ul className="grid grid-cols-2 gap-2">
                  {product.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2 font-body text-sm text-secondary">
                      <svg className="w-4 h-4 text-brand-green flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                <p className="font-body text-xs font-medium uppercase tracking-wider text-secondary mb-2">Ingredients</p>
                <p className="font-body text-sm text-secondary">{product.ingredients}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
