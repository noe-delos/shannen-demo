import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/utils/supabase/admin";
import { buildFeedbackPrompt, generateFeedback } from "@/lib/feedback/generate";
import { isDegradedFeedback } from "@/lib/feedback/degraded";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_BATCH = 8;

// Rattrapage #29 : régénère, à partir des transcripts enregistrés, les
// feedbacks de repli (note fixe de 70) encore affichés aux élèves. À appeler à
// la main (POST, "Authorization: Bearer $CRON_SECRET") jusqu'à ce que
// "remaining" vaille 0. Idempotente : un feedback régénéré n'est plus dégradé.
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const limit = Math.min(
    Math.max(Number(request.nextUrl.searchParams.get("limit")) || 4, 1),
    MAX_BATCH
  );
  const db = createAdminClient();

  // Présélection SQL sur la note de repli, filtre exact en JS.
  const { data: candidates, error } = await db
    .from("conversations")
    .select(
      `
      *,
      agents:agent_id (*),
      products:product_id (*),
      feedback:feedback_id!inner (*)
    `
    )
    .eq("feedback.note", 70)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("❌ Repair: candidates query failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const degraded = (candidates ?? []).filter(
    (conversation) =>
      isDegradedFeedback(conversation.feedback) &&
      Array.isArray(conversation.transcript) &&
      conversation.transcript.length > 0
  );

  const results = await Promise.allSettled(
    degraded.slice(0, limit).map(async (conversation) => {
      const feedbackData = await generateFeedback(
        anthropic,
        buildFeedbackPrompt(
          conversation,
          conversation.transcript,
          conversation.duration_seconds ?? 0
        )
      );
      const { error: updateError } = await db
        .from("feedback")
        .update({ ...feedbackData, updated_at: new Date().toISOString() })
        .eq("id", conversation.feedback.id);
      if (updateError) throw new Error(updateError.message);
      return { conversation_id: conversation.id, note: feedbackData.note };
    })
  );

  const repaired = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const failed = results.flatMap((r, i) =>
    r.status === "rejected"
      ? [{ conversation_id: degraded[i].id, error: String(r.reason) }]
      : []
  );
  console.log("🛠️ Repair batch:", { repaired: repaired.length, failed: failed.length, remaining: degraded.length - repaired.length });

  return NextResponse.json({
    repaired,
    failed,
    remaining: degraded.length - repaired.length,
  });
}
