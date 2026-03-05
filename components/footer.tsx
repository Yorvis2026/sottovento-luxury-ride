import Link from "next/link"
import { Facebook, Instagram, Linkedin } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div>
              <div className="font-sans text-lg font-light tracking-widest">SOTTOVENTO</div>
              <div className="text-xs text-muted-foreground tracking-wider">LUXURY RIDE</div>
            </div>
            <p className="text-sm text-muted-foreground">Premium black car service in Orlando, Florida</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-sans text-sm font-light tracking-wider mb-4">Quick Links</h4>
            <nav className="space-y-2">
              <Link href="#about" className="block text-sm text-muted-foreground hover:text-accent transition-colors">
                About Us
              </Link>
              <Link
                href="#services"
                className="block text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                Services
              </Link>
              <Link href="#fleet" className="block text-sm text-muted-foreground hover:text-accent transition-colors">
                Fleet
              </Link>
              <Link href="#booking" className="block text-sm text-muted-foreground hover:text-accent transition-colors">
                Book Now
              </Link>
            </nav>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-sans text-sm font-light tracking-wider mb-4">Services</h4>
            <nav className="space-y-2">
              <div className="text-sm text-muted-foreground">Airport Transfers</div>
              <div className="text-sm text-muted-foreground">Private Chauffeur</div>
              <div className="text-sm text-muted-foreground">Corporate Travel</div>
              <div className="text-sm text-muted-foreground">Special Events</div>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-sans text-sm font-light tracking-wider mb-4">Contact</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>Phone: +1 (407) 383-0647</div>
              <div className="break-all">contact@sottoventoluxuryride.com</div>
              <div>Orlando, FL</div>
            </div>
            <div className="flex gap-4 mt-4">
              <a href="#" className="text-muted-foreground hover:text-accent transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-accent transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-accent transition-colors" aria-label="LinkedIn">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>© 2025 Sottovento Corp. All rights reserved.</div>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-accent transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-accent transition-colors">
              Terms & Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
