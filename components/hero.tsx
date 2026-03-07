"use client"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/luxury-black-car-interior-with-city-lights-at-nigh.jpg"
          alt="Luxury car interior"
          className="w-full h-full object-cover opacity-40"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 pt-20">
        <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
          <h1 className="font-sans text-4xl md:text-6xl lg:text-7xl font-light tracking-wider text-balance">
            Orlando's Private Luxury
            <br />
            <span className="text-accent">Chauffeur Service</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground tracking-wide max-w-2xl mx-auto">
            Airport Transfers &bull; Cruise Port &bull; Executive Transportation
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col items-center gap-3 pt-4">
            <a
              href="#booking"
              style={{
                backgroundColor: "#C8A96A",
                color: "#000",
                borderRadius: "6px",
                padding: "14px 28px",
                fontWeight: 600,
                fontSize: "1rem",
                letterSpacing: "0.1em",
                textDecoration: "none",
                display: "inline-block",
                transition: "opacity 0.2s",
              }}
              className="book-cta-btn"
            >
              BOOK YOUR RIDE
            </a>

            {/* Secondary CTA */}
            <a
              href="#booking"
              className="text-sm text-muted-foreground hover:text-accent transition-colors tracking-wide underline underline-offset-4"
            >
              Get Instant Quote
            </a>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 md:gap-8 pt-12 max-w-2xl mx-auto">
            <div className="space-y-2">
              <div className="font-sans text-3xl md:text-4xl font-light">24/7</div>
              <div className="text-xs md:text-sm text-muted-foreground tracking-wide">Available</div>
            </div>
            <div className="space-y-2 border-x border-border">
              <div className="font-sans text-3xl md:text-4xl font-light">100+</div>
              <div className="text-xs md:text-sm text-muted-foreground tracking-wide">Happy Clients</div>
            </div>
            <div className="space-y-2">
              <div className="font-sans text-3xl md:text-4xl font-light">5★</div>
              <div className="text-xs md:text-sm text-muted-foreground tracking-wide">Rated Service</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-primary rounded-full" />
        </div>
      </div>
    </section>
  )
}
