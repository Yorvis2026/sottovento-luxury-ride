import { Button } from "@/components/ui/button"
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
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 pt-20">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <h1 className="font-sans text-5xl md:text-7xl lg:text-8xl font-light tracking-wider text-balance">
            Luxury Transportation
            <br />
            <span className="text-accent">in Orlando</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground tracking-wide max-w-2xl mx-auto">
            Premium Black Car Service – Airport Transfers – Private Chauffeur
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="text-base tracking-wider group">
              <Link href="#booking">
                BOOK NOW
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base tracking-wider bg-transparent">
              <Link href="#services">VIEW SERVICES</Link>
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 md:gap-8 pt-12 max-w-2xl mx-auto">
            <div className="space-y-2">
              <div className="font-sans text-3xl md:text-4xl font-light">24/7</div>
              <div className="text-xs md:text-sm text-muted-foreground tracking-wide">Available</div>
            </div>
            <div className="space-y-2 border-x border-border">
              <div className="font-sans text-3xl md:text-4xl font-light">100+</div>
              <div className="text-xs md:text-sm text-muted-foreground tracking-wide">Professional Drivers</div>
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
