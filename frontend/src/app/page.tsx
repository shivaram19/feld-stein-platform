import Link from "next/link"
import Image from "next/image"
import { apiGet } from "@/lib/api"
import { Suspense } from "react"

// 2026: React Server Components (RSC) are the default.
// Server components render on the server, reducing JS bundle by up to 70% [^HP1].
// [^HP1]: Ailunex. (2026). Top Web Development Trends in 2026. RSC stable, 80% edge deployments.

interface Product {
  id: string
  name: string
  slug: string
  shortDesc: string
  variants: { id: string; name: string; price: number }[]
  images: { url: string; alt: string }[]
}

async function FeaturedProducts() {
  // Server-side data fetch — no useEffect, no client JS for this section
  const { data: products } = await apiGet<Product[]>("/products?limit=4&isFeatured=true")

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products?.map((product) => (
        <Link key={product.id} href={`/shop/${product.slug}`} className="group">
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
          <div className="mt-4">
            <h3 className="font-display text-lg font-medium text-primary group-hover:text-brand-green transition-colors">
              {product.name}
            </h3>
            <p className="mt-1 font-body text-sm text-secondary line-clamp-2">{product.shortDesc}</p>
            <p className="mt-2 font-body text-sm font-medium text-primary">
              From ₹{product.variants?.[0]?.price}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}

function FeaturedSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/5] rounded-2xl bg-surface" />
          <div className="mt-4 h-5 bg-surface rounded w-3/4" />
          <div className="mt-2 h-4 bg-surface rounded w-full" />
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="font-body text-xs tracking-[0.2em] uppercase text-brand-green">
                Guntur, Andhra Pradesh
              </span>
              <h1 className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-light leading-[1.05]">
                Oil the way
                <br />
                <span className="italic text-brand-gold">nature intended</span>
              </h1>
              <p className="mt-6 font-body text-base text-secondary leading-relaxed max-w-lg">
                Stone-pressed, wood-pressed, and Gaanuga cold-pressed oils from the
                black soil of Andhra Pradesh. No heat. No chemicals. Just pure oil.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/shop"
                  className="px-6 py-3 rounded-lg text-sm font-body font-medium text-white bg-brand-green hover:opacity-90 transition-opacity"
                >
                  Shop Now
                </Link>
                <Link
                  href="/process"
                  className="px-6 py-3 rounded-lg text-sm font-body font-medium border border-primary/20 hover:bg-primary/5 transition-colors"
                >
                  See The Process
                </Link>
              </div>
            </div>
            <div className="relative aspect-square max-w-md mx-auto lg:max-w-none">
              <div className="absolute inset-0 rounded-full border border-dashed border-brand-gold/30 animate-[spin_60s_linear_infinite]" />
              <div className="absolute inset-4 rounded-full bg-brand-green/5 flex items-center justify-center">
                <span className="font-display text-6xl font-light text-brand-green">FS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products — Server Component with Streaming */}
      <section className="py-16 sm:py-20 bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="font-body text-xs tracking-[0.15em] uppercase text-secondary">Collection</span>
              <h2 className="mt-2 font-display text-3xl font-light">Our Oils</h2>
            </div>
            <Link href="/shop" className="font-body text-sm text-brand-green hover:underline">
              View all →
            </Link>
          </div>

          <Suspense fallback={<FeaturedSkeleton />}>
            <FeaturedProducts />
          </Suspense>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { title: "Cold Pressed", desc: "Below 40°C extraction" },
              { title: "No Chemicals", desc: "Zero preservatives" },
              { title: "Farm Fresh", desc: "Guntur farmers" },
              { title: "GST Compliant", desc: "HSN coded invoices" },
            ].map((b) => (
              <div key={b.title}>
                <p className="font-display text-lg font-medium text-primary">{b.title}</p>
                <p className="mt-1 font-body text-xs text-secondary">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
