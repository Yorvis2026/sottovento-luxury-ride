import { Phone, Mail, MapPin } from "lucide-react"

export function Contact() {
  return (
    <section id="contact" className="py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4 animate-slide-up">
            <h2 className="font-sans text-4xl md:text-5xl font-light tracking-wider">
              Get in <span className="text-accent">Touch</span>
            </h2>
            <p className="text-muted-foreground">
              We&apos;re available 24/7 to assist you with your transportation needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <a
              href="tel:+14073830647"
              className="group p-8 bg-card border border-border hover:border-accent transition-all duration-300 text-center space-y-4"
            >
              <div className="w-12 h-12 border border-accent mx-auto flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                <Phone className="w-6 h-6 text-accent" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Phone</div>
                <div className="font-light tracking-wide">+1 (407) 383-0647</div>
              </div>
            </a>

            <a
              href="mailto:contact@sottoventoluxuryride.com"
              className="group p-8 bg-card border border-border hover:border-accent transition-all duration-300 text-center space-y-4"
            >
              <div className="w-12 h-12 border border-accent mx-auto flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                <Mail className="w-6 h-6 text-accent" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Email</div>
                <div className="font-light tracking-wide text-sm break-all">contact@sottoventoluxuryride.com</div>
              </div>
            </a>

            <div className="p-8 bg-card border border-border text-center space-y-4">
              <div className="w-12 h-12 border border-accent mx-auto flex items-center justify-center">
                <MapPin className="w-6 h-6 text-accent" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Location</div>
                <div className="font-light tracking-wide">Orlando, FL</div>
              </div>
            </div>
          </div>

          {/* Service Area */}
          <div className="bg-background/50 border border-border p-8 text-center">
            <h3 className="font-sans text-xl font-light tracking-wider mb-4">Service Coverage</h3>
            <p className="text-sm text-muted-foreground">
              Orlando • MCO Airport • Sanford Airport • Kissimmee • Winter Park
              <br />
              Disney World • Universal Studios • International Drive & surrounding areas
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
