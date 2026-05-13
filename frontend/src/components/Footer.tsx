import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-surface mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <p className="font-display text-2xl font-medium text-primary">Feld & Stein</p>
            <p className="mt-3 font-body text-sm text-secondary max-w-sm leading-relaxed">
              Cold-pressed oils from the heart of Andhra Pradesh. Stone-pressed, wood-pressed,
              and Gaanuga oils delivered fresh from Guntur to your kitchen.
            </p>
          </div>
          <div>
            <p className="font-body text-xs font-medium uppercase tracking-wider text-secondary mb-4">Shop</p>
            <ul className="space-y-2 font-body text-sm text-secondary">
              <li><Link href="/shop" className="hover:text-primary transition-colors">All Oils</Link></li>
              <li><Link href="/shop?category=groundnut-oil" className="hover:text-primary transition-colors">Groundnut Oil</Link></li>
              <li><Link href="/shop?category=coconut-oil" className="hover:text-primary transition-colors">Coconut Oil</Link></li>
              <li><Link href="/shop?category=sesame-oil" className="hover:text-primary transition-colors">Sesame Oil</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-body text-xs font-medium uppercase tracking-wider text-secondary mb-4">Company</p>
            <ul className="space-y-2 font-body text-sm text-secondary">
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/process" className="hover:text-primary transition-colors">The Process</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-body text-xs text-muted">
            © 2026 Feld & Stein Oils Pvt. Ltd. All rights reserved.
          </p>
          <p className="font-body text-xs text-muted">
            Mothadaka, Guntur, Andhra Pradesh — 522016
          </p>
        </div>
      </div>
    </footer>
  )
}
