export default function ConfirmationPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 px-4 max-w-lg mx-auto">
        <div className="text-6xl">✓</div>
        <h1 className="text-3xl font-light tracking-wider">Booking Confirmed</h1>
        <p className="text-muted-foreground">
          Thank you for booking with Sottovento Luxury Ride. Your payment was received successfully.
          We will contact you shortly to confirm all the details of your ride.
        </p>
        <p className="text-sm text-muted-foreground">
          Questions? Contact us at{" "}
          <a href="tel:+14073830647" className="text-accent hover:underline">
            +1 (407) 383-0647
          </a>{" "}
          or{" "}
          <a href="mailto:contact@sottoventoluxuryride.com" className="text-accent hover:underline">
            contact@sottoventoluxuryride.com
          </a>
        </p>
        <a
          href="/"
          className="inline-block mt-4 px-6 py-3 border border-border rounded-md hover:border-accent transition text-sm tracking-wide"
        >
          Return to Home
        </a>
      </div>
    </main>
  )
}
