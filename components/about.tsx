export function About() {
  return (
    <section id="about" className="py-24 md:py-32 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto space-y-12 animate-slide-up">
          <div className="text-center space-y-4">
            <h2 className="font-sans text-4xl md:text-5xl font-light tracking-wider">
              Your Trusted Luxury Transportation
              <br />
              <span className="text-accent">in Orlando</span>
            </h2>
          </div>

          <div className="prose prose-invert prose-lg max-w-none">
            <p className="text-muted-foreground leading-relaxed text-center">
              Sottovento Luxury Ride is a premium transportation service based in Orlando, Florida. We specialize in
              private chauffeur service, airport transfers, corporate travel, and luxury rides for families, executives,
              and visitors.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 pt-8">
            <div className="space-y-4 p-6 bg-background/50 border border-border">
              <div className="w-12 h-12 border border-accent flex items-center justify-center">
                <span className="font-sans text-2xl text-accent">01</span>
              </div>
              <h3 className="font-sans text-xl font-light tracking-wider">Professional Team</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our team is formed by professional drivers, each fully insured with their own commercial company. We
                take pride in offering punctuality, safety, and a VIP approach in every service.
              </p>
            </div>

            <div className="space-y-4 p-6 bg-background/50 border border-border">
              <div className="w-12 h-12 border border-accent flex items-center justify-center">
                <span className="font-sans text-2xl text-accent">02</span>
              </div>
              <h3 className="font-sans text-xl font-light tracking-wider">VIP Experience</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Whether you are visiting Orlando for business or vacation, we ensure a smooth, comfortable, and reliable
                travel experience with attention to every detail.
              </p>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="text-center pt-8">
            <p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              At Sottovento Luxury Ride, we provide a personalized and professional transportation experience across
              Orlando. Our service combines comfort, safety, and punctuality to ensure every ride feels first-class.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
