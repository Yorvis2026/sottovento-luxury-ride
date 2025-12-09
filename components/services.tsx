import { Plane, Clock, Briefcase, Castle, PartyPopper, Users, Anchor } from "lucide-react"

const services = [
  {
    icon: Plane,
    title: "Airport Transfers (MCO & Sanford)",
    description: "Professional pick-ups with flight tracking, meet & greet options, and luggage assistance.",
  },
  {
    icon: Anchor,
    title: "MCO to Port Canaveral Transfers",
    description: "Seamless luxury rides from Orlando Airport to Port Canaveral cruise terminals.",
  },
  {
    icon: Clock,
    title: "Private Chauffeur – Hourly",
    description:
      "Ideal for executives, concerts, shopping, special dinners, or spending the day with full flexibility.",
  },
  {
    icon: Briefcase,
    title: "Corporate Transportation",
    description: "Discreet and reliable service for meetings, conventions and business trips.",
  },
  {
    icon: Castle,
    title: "Theme Park Transfers",
    description: "Disney, Universal, SeaWorld, resorts and attractions across Orlando.",
  },
  {
    icon: PartyPopper,
    title: "Events & Special Occasions",
    description: "Weddings, birthdays, anniversaries, sports events and private celebrations.",
  },
  {
    icon: Users,
    title: "Family & Group Rides",
    description: "Comfortable transportation for families, large groups and multi-stop itineraries.",
  },
]

export function Services() {
  return (
    <section id="services" className="py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4 animate-slide-up">
            <h2 className="font-sans text-4xl md:text-5xl font-light tracking-wider">
              Our <span className="text-accent">Services</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive luxury transportation solutions tailored to your needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => {
              const Icon = service.icon
              return (
                <div
                  key={index}
                  className="group p-8 bg-card border border-border hover:border-accent transition-all duration-300 animate-scale-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="space-y-4">
                    <div className="w-14 h-14 border border-accent/50 group-hover:border-accent flex items-center justify-center transition-colors">
                      <Icon className="w-7 h-7 text-accent" />
                    </div>
                    <h3 className="font-sans text-xl font-light tracking-wide">{service.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
