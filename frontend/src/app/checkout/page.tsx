"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { useCartStore } from "@/lib/store"
import { api } from "@/lib/api"

export default function CheckoutPage() {
  const router = useRouter()
  const { items, summary, fetchCart } = useCartStore()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"address" | "payment">("address")
  const [form, setForm] = useState({
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "Andhra Pradesh",
    pincode: "",
    landmark: "",
    paymentMethod: "RAZORPAY" as "RAZORPAY" | "COD",
  })

  const handlePlaceOrder = async () => {
    setLoading(true)
    try {
      // In a real implementation, this would:
      // 1. Save the address
      // 2. Create the order via API
      // 3. Initialize Razorpay payment if needed
      // 4. Redirect to success page

      const res = await api.post("/orders", {
        addressId: "temp", // Would be real address ID
        paymentMethod: form.paymentMethod,
      })

      const order = res.data.data
      fetchCart()
      router.push(`/order-success?order=${order.orderNumber}`)
    } catch {
      alert("Failed to place order. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="font-display text-xl text-secondary">Your cart is empty</p>
            <Link href="/shop" className="mt-4 inline-block px-6 py-3 rounded-lg text-sm font-body font-medium text-white bg-brand-green hover:opacity-90 transition-opacity">Continue Shopping</Link>
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
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-light">Checkout</h1>

          {/* Steps */}
          <div className="mt-8 flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step === "address" ? "text-brand-green" : "text-primary"}`}>
              <span className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-body text-sm font-medium">1</span>
              <span className="font-body text-sm font-medium">Address</span>
            </div>
            <div className="flex-1 h-px bg-border-subtle" />
            <div className={`flex items-center gap-2 ${step === "payment" ? "text-brand-green" : "text-secondary"}`}>
              <span className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-body text-sm font-medium">2</span>
              <span className="font-body text-sm font-medium">Payment</span>
            </div>
          </div>

          {step === "address" ? (
            <div className="mt-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-body text-xs font-medium text-secondary mb-1">Full Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-border-subtle bg-canvas font-body text-sm focus:outline-none focus:border-brand-green" placeholder="Your name" />
                </div>
                <div>
                  <label className="block font-body text-xs font-medium text-secondary mb-1">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-border-subtle bg-canvas font-body text-sm focus:outline-none focus:border-brand-green" placeholder="+91XXXXXXXXXX" />
                </div>
              </div>
              <div>
                <label className="block font-body text-xs font-medium text-secondary mb-1">Address Line 1</label>
                <input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-border-subtle bg-canvas font-body text-sm focus:outline-none focus:border-brand-green" placeholder="Street address" />
              </div>
              <div>
                <label className="block font-body text-xs font-medium text-secondary mb-1">Address Line 2</label>
                <input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-border-subtle bg-canvas font-body text-sm focus:outline-none focus:border-brand-green" placeholder="Apartment, suite, etc." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-body text-xs font-medium text-secondary mb-1">City</label>
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-border-subtle bg-canvas font-body text-sm focus:outline-none focus:border-brand-green" placeholder="City" />
                </div>
                <div>
                  <label className="block font-body text-xs font-medium text-secondary mb-1">PIN Code</label>
                  <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-border-subtle bg-canvas font-body text-sm focus:outline-none focus:border-brand-green" placeholder="522016" />
                </div>
              </div>
              <div>
                <label className="block font-body text-xs font-medium text-secondary mb-1">State</label>
                <input value={form.state} readOnly className="w-full px-4 py-2 rounded-lg border border-border-subtle bg-surface font-body text-sm text-secondary" />
              </div>
              <button
                onClick={() => setStep("payment")}
                className="w-full mt-4 px-6 py-4 rounded-xl text-base font-body font-medium text-white bg-brand-green hover:opacity-90 transition-opacity"
              >
                Continue to Payment
              </button>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              <div className="p-4 rounded-2xl bg-surface border border-border-subtle">
                <p className="font-body text-sm font-medium text-primary">Select Payment Method</p>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle cursor-pointer hover:bg-canvas transition-colors">
                    <input type="radio" name="payment" value="RAZORPAY" checked={form.paymentMethod === "RAZORPAY"} onChange={() => setForm({ ...form, paymentMethod: "RAZORPAY" })} className="w-4 h-4 text-brand-green" />
                    <div>
                      <p className="font-body text-sm font-medium text-primary">Online Payment</p>
                      <p className="font-body text-xs text-secondary">UPI, Cards, Net Banking via Razorpay</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle cursor-pointer hover:bg-canvas transition-colors">
                    <input type="radio" name="payment" value="COD" checked={form.paymentMethod === "COD"} onChange={() => setForm({ ...form, paymentMethod: "COD" })} className="w-4 h-4 text-brand-green" />
                    <div>
                      <p className="font-body text-sm font-medium text-primary">Cash on Delivery</p>
                      <p className="font-body text-xs text-secondary">Pay ₹{summary?.total} when your order arrives</p>
                    </div>
                  </label>
                </div>
              </div>

              {summary && (
                <div className="p-4 rounded-2xl bg-surface border border-border-subtle">
                  <p className="font-body text-sm font-medium text-primary">Order Summary</p>
                  <div className="mt-3 space-y-2 font-body text-sm">
                    <div className="flex justify-between text-secondary"><span>Subtotal</span><span>₹{summary.subtotal}</span></div>
                    {summary.discount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>−₹{summary.discount}</span></div>}
                    <div className="flex justify-between text-secondary"><span>GST</span><span>₹{summary.gst}</span></div>
                    <div className="flex justify-between text-secondary"><span>Shipping</span><span>{summary.shipping === 0 ? "Free" : `₹${summary.shipping}`}</span></div>
                    <div className="pt-2 border-t border-border-subtle flex justify-between font-medium text-primary"><span>Total</span><span>₹{summary.total}</span></div>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button onClick={() => setStep("address")} className="px-6 py-4 rounded-xl text-base font-body font-medium border border-border-subtle hover:bg-surface transition-colors">Back</button>
                <button onClick={handlePlaceOrder} disabled={loading} className="flex-1 px-6 py-4 rounded-xl text-base font-body font-medium text-white bg-brand-green hover:opacity-90 transition-opacity disabled:opacity-50">
                  {loading ? "Processing..." : `Place Order — ₹${summary?.total || 0}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
