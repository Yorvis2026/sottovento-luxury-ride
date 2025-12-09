import { Check } from "lucide-react"

const vehicles = [
  {
    name: "Cadillac Escalade ESV",
    year: "2024",
    capacity: "Up to 6 passengers",
    image: "/luxury-black-cadillac-escalade-esv-exterior.jpg",
  },
  {
    name: "Chevrolet Suburban",
    year: "2024",
    capacity: "Up to 6 passengers",
    image: "/luxury-black-chevrolet-suburban-exterior.jpg",
  },
  {
    name: "Mercedes-Benz S-Class",
    year: "2024",
    capacity: "Up to 3 passengers",
    image: "/luxury-black-mercedes-s-class-exterior.jpg",
  },
]

const amenities = [
  "Premium leather seats",
  "Tri-zone climate control",
  "USB charging ports",
  "Privacy glass",
  "Premium sound system",
  "Complimentary water bottles",
]

export function Fleet() {
  return (
    <section id="fleet" className="py-24 md:py-32 bg-card/30">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4 animate-slide-up">
            <h2 className="font-sans text-4xl md:text-5xl font-light tracking-wider">
              Our Luxury <span className="text-accent">Fleet</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Immaculate vehicles equipped with premium amenities for your comfort
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {vehicles.map((vehicle, index) => (
              <div
                key={index}
                className="group bg-background border border-border overflow-hidden hover:border-accent transition-all duration-300 animate-scale-in"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={vehicle.image || "/placeholder.svg"}
                    alt={vehicle.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-sans text-xl font-light tracking-wide">{vehicle.name}</h3>
                    <p className="text-sm text-muted-foreground">{vehicle.year}</p>
                  </div>
                  <div className="text-sm text-accent">{vehicle.capacity}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Amenities */}
          <div className="bg-background/50 border border-border p-8 md:p-12">
            <h3 className="font-sans text-2xl font-light tracking-wider mb-8 text-center">
              Premium Amenities Included
            </h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {amenities.map((amenity, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 border border-accent flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-accent" />
                  </div>
                  <span className="text-sm">{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
