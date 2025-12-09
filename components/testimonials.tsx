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
        </div>
      </div>
    </section>
  )
}
