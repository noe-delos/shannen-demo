import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { buildFeedbackPrompt, generateFeedback } from "@/lib/feedback/generate";
import { isDegradedFeedback } from "@/lib/feedback/degraded";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// La génération du feedback peut faire un second essai avec un budget plus large.
export const maxDuration = 300;

// Relance l'analyse d'une simulation terminée à partir du transcript enregistré.
// Réservé au propriétaire de la conversation (ou à un admin, comme
// GET /api/conversations/[id]), et seulement si le feedback est absent ou
// dégradé (feedbacks de repli enregistrés avant le correctif #29) : un feedback
// complet ne peut pas être régénéré pour « retenter » une note.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const isAdmin = Boolean(profile?.is_admin);
    const db = isAdmin ? createAdminClient() : supabase;

    const { data: conversation, error: conversationError } = await db
      .from("conversations")
      .select(
        `
        *,
        agents:agent_id (*),
        products:product_id (*),
        feedback:feedback_id (*)
      `
      )
      .eq("id", conversationId)
      .single();

    if (
      conversationError ||
      !conversation ||
      (!isAdmin && conversation.user_id !== user.id)
    ) {
      return NextResponse.json(
        { error: "Conversation introuvable" },
        { status: 404 }
      );
    }

    if (conversation.feedback && !isDegradedFeedback(conversation.feedback)) {
      return NextResponse.json(
        { error: "L'analyse de cette conversation est déjà complète." },
        { status: 409 }
      );
    }

    const transcript = Array.isArray(conversation.transcript)
      ? conversation.transcript
      : [];
    if (transcript.length === 0) {
      return NextResponse.json(
        { error: "Aucun transcript n'a été enregistré pour cette conversation." },
        { status: 422 }
      );
    }

    console.log("🔄 Regenerating feedback for conversation:", conversationId);
    const feedbackData = await generateFeedback(
      anthropic,
      buildFeedbackPrompt(
        conversation,
        transcript,
        conversation.duration_seconds ?? 0
      )
    );

    // Un feedback dégradé est remplacé sur place pour garder le même identifiant.
    const { data: feedback, error: saveError } = conversation.feedback
      ? await db
          .from("feedback")
          .update({ ...feedbackData, updated_at: new Date().toISOString() })
          .eq("id", conversation.feedback.id)
          .select()
          .single()
      : await db
          .from("feedback")
          .insert({
            ...feedbackData,
            conversation_id: conversationId,
            user_id: conversation.user_id,
          })
          .select()
          .single();

    if (saveError || !feedback) {
      console.error("❌ Error saving regenerated feedback:", saveError);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement de l'analyse" },
        { status: 500 }
      );
    }

    if (!conversation.feedback) {
      const { error: linkError } = await db
        .from("conversations")
        .update({ feedback_id: feedback.id })
        .eq("id", conversationId);

      if (linkError) {
        console.error("❌ Error linking regenerated feedback:", linkError);
      }
    }

    console.log("✅ Feedback regenerated:", feedback.id, "note:", feedback.note);
    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("❌ Error regenerating feedback:", error);
    return NextResponse.json(
      {
        error:
          "L'analyse n'a pas pu être générée. Réessayez dans quelques instants.",
      },
      { status: 502 }
    );
  }
}
