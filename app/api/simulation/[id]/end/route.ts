/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildFeedbackPrompt, generateFeedback } from "@/lib/feedback/generate";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// La génération du feedback peut faire un second essai avec un budget plus large.
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  console.log("🚀 Starting conversation end process for ID:", conversationId);

  try {
    const supabase = await createClient();

    // Parse request body to get messages and duration from frontend
    const requestBody = await request.json();
    const { messages = [], duration = 0 } = requestBody;

    console.log("📥 Request body received:", {
      messagesCount: messages.length,
      duration: duration,
      firstMessage: messages.length > 0 ? messages[0] : null,
      lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
    });

    // Get authenticated user
    console.log("🔐 Authenticating user...");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Authentication failed:", authError);
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Get conversation details
    console.log("📄 Fetching conversation details...");
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select(
        `
        *,
        agents:agent_id (*),
        products:product_id (*)
      `
      )
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (conversationError || !conversation) {
      console.error("❌ Conversation not found:", conversationError);
      return NextResponse.json(
        { error: "Conversation introuvable" },
        { status: 404 }
      );
    }

    console.log("✅ Conversation loaded:", {
      id: conversation.id,
      agent: conversation.agents?.name,
      product: conversation.products?.name,
      callType: conversation.call_type,
      elevenlabsId: conversation.elevenlabs_conversation_id,
    });

    // Use messages from frontend, or try to get from ElevenLabs as fallback
    let transcript = messages;
    let finalDuration = duration;

    console.log("💬 Processing messages:", {
      frontendMessages: messages.length,
      hasElevenlabsId: !!conversation.elevenlabs_conversation_id,
    });

    if (
      (!messages || messages.length === 0) &&
      conversation.elevenlabs_conversation_id
    ) {
      try {
        console.log("🔄 No messages from frontend, trying ElevenLabs...");
        const historyResponse = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${conversation.elevenlabs_conversation_id}`,
          {
            headers: {
              "xi-api-key": process.env.ELEVENLABS_API_KEY!,
            },
          }
        );

        console.log(
          "📡 ElevenLabs API response status:",
          historyResponse.status
        );

        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          transcript = historyData.conversation_history || [];
          finalDuration = historyData.duration_seconds || duration;
          console.log("✅ Got ElevenLabs history:", {
            messagesCount: transcript.length,
            duration: finalDuration,
          });
        } else {
          console.warn(
            "⚠️ ElevenLabs API call failed with status:",
            historyResponse.status
          );
        }
      } catch (error) {
        console.error("❌ Error fetching ElevenLabs history:", error);
      }
    }

    console.log("📝 Final transcript to save:", {
      messagesCount: transcript.length,
      duration: finalDuration,
      sampleMessages: transcript.slice(0, 2),
    });

    // Update conversation with transcript and duration
    console.log("💾 Updating conversation in database...");
    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        transcript: transcript,
        duration_seconds: finalDuration,
      })
      .eq("id", conversationId);

    if (updateError) {
      console.error("❌ Error updating conversation:", updateError);
    } else {
      console.log("✅ Conversation updated successfully");
    }

    // Generate feedback with Claude (sortie structurée, voir lib/feedback/generate.ts)
    const feedbackPrompt = buildFeedbackPrompt(
      conversation,
      transcript,
      finalDuration
    );
    console.log("🤖 Prompt length:", feedbackPrompt.length);

    try {
      const feedbackData = await generateFeedback(anthropic, feedbackPrompt);
      console.log("✅ Feedback generated:", {
        note: feedbackData.note,
        pointsForts: feedbackData.points_forts.length,
        axesAmelioration: feedbackData.axes_amelioration.length,
        momentsCles: feedbackData.moments_cles.length,
        suggestions: feedbackData.suggestions.length,
        analyseComplete: feedbackData.analyse_complete.length,
      });

      // Create feedback record
      console.log("💾 Creating feedback record in database...");
      const { data: feedback, error: feedbackError } = await supabase
        .from("feedback")
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          note: feedbackData.note,
          points_forts: feedbackData.points_forts,
          axes_amelioration: feedbackData.axes_amelioration,
          moments_cles: feedbackData.moments_cles,
          suggestions: feedbackData.suggestions,
          analyse_complete: feedbackData.analyse_complete,
        })
        .select()
        .single();

      if (feedbackError) {
        console.error("❌ Error creating feedback:", feedbackError);
        return NextResponse.json(
          { error: "Erreur lors de la création du feedback" },
          { status: 500 }
        );
      }

      console.log("✅ Feedback created successfully with ID:", feedback.id);

      // Update conversation with feedback ID
      console.log("🔗 Linking feedback to conversation...");
      const { error: linkError } = await supabase
        .from("conversations")
        .update({ feedback_id: feedback.id })
        .eq("id", conversationId);

      if (linkError) {
        console.error("❌ Error linking feedback:", linkError);
      } else {
        console.log("✅ Feedback linked successfully");
      }

      // Generate summary for inter-conversation history
      console.log("📝 Generating conversation summary...");
      try {
        const summaryPrompt = `Tu es un assistant qui résume des conversations commerciales de façon concise.

Voici une conversation entre un commercial et un prospect.

**CONTEXTE:**
- Prospect: ${conversation.agents?.name} (${conversation.agents?.job_title})
- Produit: ${conversation.products?.name}
- Type d'appel: ${conversation.call_type}
- Durée: ${finalDuration} secondes

**TRANSCRIPT:**
${transcript
  .map(
    (msg: any, i: number) =>
      `${i + 1}. ${msg.role === "user" || msg.source === "user" ? "Commercial" : "Prospect"}: ${msg.content || msg.message || msg.text}`
  )
  .join("\n")}

Génère un résumé factuel en 3-5 phrases maximum (150 mots max) qui capture :
- Ce qui a été proposé par le commercial
- Les réactions et objections du prospect
- Le résultat de l'appel (accord, refus, suite prévue, pas de conclusion)

Ce résumé sera utilisé pour contextualiser les prochains appels avec ce prospect. Réponds uniquement avec le résumé, sans introduction ni titre.`;

        const summaryResponse = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          temperature: 0.1,
          messages: [{ role: "user", content: summaryPrompt }],
        });
        if (summaryResponse.stop_reason === "max_tokens") {
          console.warn("⚠️ Summary truncated at max_tokens");
        }
        let summaryText = "";
        const summaryBlock = summaryResponse.content[0];
        if (summaryBlock?.type === "text") {
          summaryText = summaryBlock.text;
        }

        if (summaryText) {
          await supabase
            .from("conversations")
            .update({ summary: summaryText.trim() })
            .eq("id", conversationId);
          console.log("✅ Summary generated and saved");
        }
      } catch (summaryError) {
        console.warn("⚠️ Failed to generate summary (non-blocking):", summaryError);
      }

      console.log("🎉 Conversation analysis completed successfully!");
      return NextResponse.json({
        feedback,
        transcript,
        conversation_id: conversationId,
      });
    } catch (error) {
      // Plus de feedback de repli avec une note inventée (#29) : l'élève peut
      // relancer l'analyse depuis la page de la conversation (transcript sauvegardé).
      console.error("❌ Error generating feedback:", error);
      return NextResponse.json(
        {
          error:
            "L'analyse de la conversation n'a pas pu être générée. Vous pouvez la relancer depuis la page de la conversation.",
          transcript,
          conversation_id: conversationId,
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("💥 Fatal error in conversation end process:", error);
    return NextResponse.json(
      {
        error: "Erreur interne du serveur",
      },
      { status: 500 }
    );
  }
}
