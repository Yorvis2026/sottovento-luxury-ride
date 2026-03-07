import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { About } from "@/components/about"
import { WhyChooseUs } from "@/components/why-choose-us"
import { Services } from "@/components/services"
import { Fleet } from "@/components/fleet"
import { Testimonials } from "@/components/testimonials"
import { BookingSection } from "@/components/booking-section"
import { Contact } from "@/components/contact"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { StickyBookButton } from "@/components/sticky-book-button"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <WhyChooseUs />
      <About />
      <Services />
      <Fleet />
      <Testimonials />
      <BookingSection />
      <Contact />
      <Footer />
      <WhatsAppButton />
      <StickyBookButton />
    </main>
  )
}
