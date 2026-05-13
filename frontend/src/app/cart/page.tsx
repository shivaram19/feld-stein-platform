"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { useCartStore } from "@/lib/store"

export default function CartPage() {
  const { items, summary, coupon, isLoading, fetchCart, updateQuantity, removeItem, applyCoupon, removeCoupon } = useCartStore()
  const [couponCode, setCouponCode] = useState("")
  const [couponError, setCouponError] = useState("")

  useEffect(() => { fetchCart() }, [fetchCart])

  const handleApplyCoupon = async () => {
    setCouponError("")
    try { await applyCoupon(couponCode); setCouponCode("") }
    catch { setCouponError("Invalid or expired coupon") }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-light">Your Cart</h1>
          {items.length === 0 ? (
            <div className="mt-12 text-center py-20">
              <p className="font-display text-xl text-secondary">Your cart is empty</p>
              <Link href="/shop" className="mt-4 inline-block px-6 py-3 rounded-lg text-sm font-body font-medium text-white bg-brand-green hover:opacity-90 transition-opacity">Continue Shopping</Link>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 rounded-2xl bg-surface border border-border-subtle">
                    <div className="w-24 h-24 rounded-xl bg-canvas border border-border-subtle overflow-hidden relative flex-shrink-0">
                      {item.variant.product.images[0] && (
                        <Image src={item.variant.product.images[0].url} alt={item.variant.product.name} fill className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/shop/${item.variant.product.slug}`}>
                        <h3 className="font-display text-base font-medium text-primary hover:text-brand-green transition-colors">{item.variant.product.name}</h3>
                      </Link>
                      <p className="font-body text-sm text-secondary">{item.variant.name}</p>
                      <p className="mt-1 font-body text-sm font-medium text-primary">₹{item.variant.price}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex items-center border border-border-subtle rounded-lg">
                          <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} disabled={isLoading} className="w-8 h-8 flex items-center justify-center font-body text-sm hover:bg-canvas disabled:opacity-50">−</button>
                          <span className="w-10 text-center font-body text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={isLoading} className="w-8 h-8 flex items-center justify-center font-body text-sm hover:bg-canvas disabled:opacity-50">+</button>
                        </div>
                        <button onClick={() => removeItem(item.id)} disabled={isLoading} className="font-body text-xs text-danger hover:underline disabled:opacity-50">Remove</button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-body text-base font-medium text-primary">₹{Number(item.variant.price) * item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-1">
                <div className="p-6 rounded-2xl bg-surface border border-border-subtle sticky top-24">
                  <h2 className="font-display text-lg font-medium">Order Summary</h2>
                  {summary && (
                    <div className="mt-6 space-y-3 font-body text-sm">
                      <div className="flex justify-between text-secondary"><span>Subtotal</span><span>₹{summary.subtotal}</span></div>
                      {summary.discount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>−₹{summary.discount}</span></div>}
                      <div className="flex justify-between text-secondary"><span>GST (5%)</span><span>₹{summary.gst}</span></div>
                      <div className="flex justify-between text-secondary"><span>Shipping</span><span>{summary.shipping === 0 ? "Free" : `₹${summary.shipping}`}</span></div>
                      <div className="pt-3 border-t border-border-subtle flex justify-between font-medium text-primary"><span>Total</span><span>₹{summary.total}</span></div>
                    </div>
                  )}
                  <div className="mt-6 pt-6 border-t border-border-subtle">
                    {coupon ? (
                      <div className="flex items-center justify-between">
                        <div><p className="font-body text-sm font-medium text-primary">{coupon.code}</p><p className="font-body text-xs text-success">Applied</p></div>
                        <button onClick={removeCoupon} className="font-body text-xs text-danger hover:underline">Remove</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input type="text" placeholder="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-border-subtle bg-canvas font-body text-sm focus:outline-none focus:border-brand-green" />
                        <button onClick={handleApplyCoupon} className="px-4 py-2 rounded-lg font-body text-sm font-medium border border-border-subtle hover:bg-canvas transition-colors">Apply</button>
                      </div>
                    )}
                    {couponError && <p className="mt-2 font-body text-xs text-danger">{couponError}</p>}
                  </div>
                  <Link href="/checkout" className="mt-6 block w-full text-center px-6 py-4 rounded-xl text-base font-body font-medium text-white bg-brand-green hover:opacity-90 transition-opacity">Proceed to Checkout</Link>
                  <p className="mt-3 text-center font-body text-xs text-secondary">Free shipping on orders above ₹500</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
