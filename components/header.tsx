"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, Phone } from "lucide-react"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks = [
    { href: "#about", label: "About" },
    { href: "#services", label: "Services" },
    { href: "#fleet", label: "Fleet" },
    { href: "#contact", label: "Contact" },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/95 backdrop-blur-md border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-primary flex items-center justify-center">
                <span className="font-sans text-2xl font-light tracking-wider">SL</span>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="font-sans text-sm font-light tracking-widest">SOTTOVENTO</div>
              <div className="text-xs text-muted-foreground tracking-wider">LUXURY RIDE</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm tracking-wider hover:text-accent transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <a href="tel:+14073830647" className="flex items-center gap-2 text-sm hover:text-accent transition-colors">
              <Phone className="w-4 h-4" />
              <span>+1 (407) 383-0647</span>
            </a>
            <Button asChild size="sm" className="tracking-wider">
              <Link href="#booking">BOOK YOUR RIDE</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-slide-up">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-sm tracking-wider hover:text-accent transition-colors py-2"
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="tel:+14073830647"
                className="flex items-center gap-2 text-sm hover:text-accent transition-colors py-2"
              >
                <Phone className="w-4 h-4" />
                <span>+1 (407) 383-0647</span>
              </a>
              <Button asChild className="w-full mt-2">
                <Link href="#booking">BOOK YOUR RIDE</Link>
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
