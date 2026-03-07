import { Star } from "lucide-react"

const testimonials = [
  {
    text: "Punctual, professional and clean vehicle. Highly recommended.",
    author: "Michael R.",
  },
  {
    text: "Perfect service from airport to hotel. Will use again.",
    author: "Sarah T.",
  },
  {
    text: "Outstanding chauffeur experience. Made our trip special.",
    author: "David L.",
  },
]

export function Testimonials() {
  return (
    <section className="py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4 animate-slide-up">
            <h2 className="font-sans text-4xl md:text-5xl font-light tracking-wider">
              What Our Clients <span className="text-accent">Say</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-8 bg-card border border-border space-y-6 animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-muted-foreground leading-relaxed italic">&ldquo;{testimonial.text}&rdquo;</p>
                <div className="text-sm font-light">— {testimonial.author}</div>
              </div>
            ))}
          </div>

          {/* Trust Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-border">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#C8A96A">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-muted-foreground tracking-wide">
              Rated 5 Stars by Our Clients
            </span>
            <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
              <span>Google Reviews</span>
              <span>&bull;</span>
              <span>TripAdvisor</span>
              <span>&bull;</span>
              <span>Yelp</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
