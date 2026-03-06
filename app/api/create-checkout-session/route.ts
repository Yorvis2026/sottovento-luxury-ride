import Stripe from "stripe"
import { NextRequest } from "next/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

export async function POST(req: NextRequest) {
  try {
    const { price, vehicle, pickupZone, dropoffZone } = await req.json()

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Sottovento Luxury Ride — ${vehicle}`,
              description: `${pickupZone} → ${dropoffZone}`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      success_url: "https://sottoventoluxuryride.com/confirmation",
      cancel_url: "https://sottoventoluxuryride.com",
    })

    return Response.json({ url: session.url })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
