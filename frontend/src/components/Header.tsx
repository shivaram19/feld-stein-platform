"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useCartStore } from "@/lib/store"

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const itemCount = useCartStore((s) => s.itemCount)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-canvas/90 backdrop-blur-md shadow-sm" : "bg-canvas"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="font-display text-2xl font-medium tracking-tight text-primary">
            Feld <span className="text-brand-gold">&</span> Stein
          </Link>
          <nav className="hidden sm:flex items-center gap-8 font-body text-sm text-secondary">
            <Link href="/shop" className="hover:text-primary transition-colors">Shop</Link>
            <Link href="/about" className="hover:text-primary transition-colors">Our Story</Link>
            <Link href="/process" className="hover:text-primary transition-colors">The Process</Link>
            <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/cart" className="relative p-2 hover:bg-surface rounded-lg transition-colors">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-green text-[10px] font-medium text-white">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
