import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { About } from "@/components/about"
import { Services } from "@/components/services"
import { Fleet } from "@/components/fleet"
import { Testimonials } from "@/components/testimonials"
import { BookingSection } from "@/components/booking-section"
import { Contact } from "@/components/contact"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <About />
      <Services />
      <Fleet />
      <Testimonials />
      <BookingSection />
      <Contact />
      <Footer />
      <WhatsAppButton />
    </main>
  )
}
