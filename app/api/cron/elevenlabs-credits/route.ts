import { NextRequest, NextResponse } from "next/server";
import { checkElevenLabsCredits } from "@/lib/alerts/elevenlabs-credits";

export const dynamic = "force-dynamic";

// Appelée toutes les heures par Vercel Cron (vercel.json), qui envoie
// "Authorization: Bearer $CRON_SECRET". ?test=1 envoie un email de test.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const result = await checkElevenLabsCredits({
      test: request.nextUrl.searchParams.get("test") === "1",
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ ElevenLabs credits check failed:", error);
    return NextResponse.json({ error: "Vérification impossible" }, { status: 500 });
  }
}
