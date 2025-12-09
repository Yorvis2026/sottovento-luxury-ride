import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Sottovento Luxury Ride | Premium Black Car Service in Orlando",
  description:
    "Luxury transportation in Orlando. Airport transfers, private chauffeur service, corporate travel. Premium black car service from MCO & Sanford airports.",
  keywords:
    "Orlando luxury transportation, Sottovento Luxury Ride, Orlando black car service, MCO private chauffeur, Orlando executive transportation, airport luxury rides Orlando",
  openGraph: {
    title: "Sottovento Luxury Ride | Premium Transportation Orlando",
    description: "Experience luxury transportation with professional chauffeur service in Orlando, FL",
    type: "website",
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-mono antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
