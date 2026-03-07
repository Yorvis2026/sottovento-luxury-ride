const cards = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#C8A96A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="10" r="5" />
        <path d="M6 28c0-5.523 4.477-10 10-10s10 4.477 10 10" />
        <path d="M20 14l2 2 4-4" />
      </svg>
    ),
    title: "Professional Chauffeurs",
    text: "Licensed, experienced and discreet drivers.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#C8A96A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8h20M6 16h12M6 24h8" />
        <circle cx="24" cy="22" r="6" />
        <path d="M24 19v3l2 2" />
      </svg>
    ),
    title: "Flight Tracking",
    text: "We monitor your flight and adjust pickup time automatically.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#C8A96A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="8" width="24" height="16" rx="2" />
        <path d="M4 13h24" />
        <path d="M10 18h4M18 18h4" />
      </svg>
    ),
    title: "Meet & Greet Service",
    text: "Your driver will wait with a personalized sign at arrivals.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#C8A96A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="12" width="28" height="12" rx="3" />
        <path d="M6 12V9a2 2 0 012-2h16a2 2 0 012 2v3" />
        <circle cx="8" cy="24" r="2.5" />
        <circle cx="24" cy="24" r="2.5" />
      </svg>
    ),
    title: "Luxury SUV Fleet",
    text: "Escalade and Suburban vehicles for premium comfort.",
  },
]

export function WhyChooseUs() {
  return (
    <section style={{ backgroundColor: "#0F0F0F" }} className="py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto space-y-14">
          <div className="text-center space-y-4">
            <h2 className="font-sans text-4xl md:text-5xl font-light tracking-wider text-white">
              Why Choose{" "}
              <span style={{ color: "#C8A96A" }}>Sottovento Luxury Ride</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, index) => (
              <div
                key={index}
                style={{ backgroundColor: "#1A1A1A" }}
                className="p-8 border border-white/10 space-y-4 hover:border-[#C8A96A]/50 transition-colors duration-300"
              >
                <div>{card.icon}</div>
                <h3 className="text-white font-light tracking-wide text-lg">
                  {card.title}
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  {card.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
