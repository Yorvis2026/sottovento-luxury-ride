import type React from "react"
import type { Metadata, Viewport } from "next"
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
}

export const metadata: Metadata = {
  title: "Sottovento Luxury Ride | Premium Black Car Service in Orlando",
  description:
    "Luxury transportation in Orlando. Airport transfers, private chauffeur service, corporate travel. Premium black car service from MCO & Sanford airports.",
  keywords:
    "Orlando luxury transportation, Sottovento Luxury Ride, Orlando black car service, MCO private chauffeur, Orlando executive transportation, airport luxury rides Orlando",
  applicationName: "Sottovento",
  appleWebApp: {
    capable: true,
    title: "Sottovento",
    statusBarStyle: "black-translucent",
  },
  // manifest is defined per-route (driver, tablet) — not globally
  // to avoid iOS using the wrong start_url for Home Screen shortcuts
  icons: {
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-167x167.png", sizes: "167x167", type: "image/png" },
      { url: "/apple-touch-icon-152x152.png", sizes: "152x152", type: "image/png" },
    ],
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
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
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Sottovento" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        {/* Icons and manifest are defined per-route via Next.js metadata API */}
      </head>
      <body className="font-mono antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
