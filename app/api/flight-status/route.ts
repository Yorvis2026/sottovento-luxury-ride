import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const flightNumber = searchParams.get("flightNumber");
  const date = searchParams.get("date");

  if (!flightNumber || !date) {
    return Response.json(
      { error: "Missing flightNumber or date" },
      { status: 400 }
    );
  }

  const apiKey = process.env.AERODATABOX_API_MARKET_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AeroDataBox API key not configured" },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(
      `https://api.magicapi.dev/api/v1/aedbx/aerodatabox/flights/number/${encodeURIComponent(flightNumber)}/${date}`,
      {
        headers: {
          "x-api-market-key": apiKey,
        },
        next: { revalidate: 60 }, // cache for 60 seconds
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        {
          error: "AeroDataBox API error",
          status: response.status,
          detail: errorText.slice(0, 200),
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: "Failed to fetch flight status", detail: message },
      { status: 500 }
    );
  }
}
