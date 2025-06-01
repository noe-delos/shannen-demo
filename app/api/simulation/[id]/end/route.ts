/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

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

    // Generate feedback using Claude via AWS Bedrock
    console.log("🤖 Preparing Claude feedback prompt...");
    const feedbackPrompt = `
Analysez cette conversation commerciale et fournissez un feedback détaillé en français.

**CONTEXTE:**
- Agent: ${conversation.agents?.name} (${conversation.agents?.job_title})
- Produit: ${conversation.products?.name}
- Type d'appel: ${conversation.call_type}
- Objectif: ${conversation.goal}
- Durée: ${finalDuration} secondes

**TRANSCRIPT:**
${transcript
  .map(
    (msg: any, i: number) =>
      `${i + 1}. ${
        msg.role === "user" || msg.source === "user"
          ? "**Commercial**"
          : "**Client**"
      }: ${msg.content || msg.message || msg.text}`
  )
  .join("\n")}

**INSTRUCTIONS:**
Fournissez un feedback structuré avec:
1. Une note sur 100 (basée sur la performance commerciale)
2. 3-5 points forts identifiés dans la conversation
3. 3-5 axes d'amélioration concrets
4. 2-3 moments clés de la conversation
5. 3-5 suggestions pratiques pour améliorer les performances
6. Une analyse complète (2-3 paragraphes détaillés)

**IMPORTANT:** Votre réponse DOIT être au format JSON valide exactement comme ceci:
{
  "note": 75,
  "points_forts": ["Point 1", "Point 2", "Point 3"],
  "axes_amelioration": ["Axe 1", "Axe 2", "Axe 3"],
  "moments_cles": ["Moment 1", "Moment 2"],
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
  "analyse_complete": "Analyse détaillée en 2-3 paragraphes..."
}`;

    console.log("📤 Sending request to Claude via AWS Bedrock...");
    console.log("🤖 Prompt length:", feedbackPrompt.length);

    try {
      // Create Bedrock client
      console.log("🔧 Creating AWS Bedrock client...");
      const client = new BedrockRuntimeClient({
        region: process.env.AWS_REGION as string,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
        },
      });

      // Format messages for Bedrock
      const messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: feedbackPrompt,
            },
          ],
        },
      ];

      console.log("📋 Preparing ConverseCommand...");
      const command = new ConverseCommand({
        modelId: "eu.anthropic.claude-3-7-sonnet-20250219-v1:0",
        messages: messages as any,
        inferenceConfig: {
          maxTokens: 2000,
          temperature: 0.1,
        },
      });

      console.log("📡 Sending command to AWS Bedrock...");
      const response = await client.send(command);
      console.log("✅ Response received from AWS Bedrock");

      // Extract content from response
      let feedbackText = "";
      if (response.output?.message?.content) {
        console.log("📄 Extracting content from response...");
        for (const block of response.output.message.content) {
          if ("text" in block) {
            feedbackText = block.text || "";
            break;
          }
        }
      }

      console.log("✅ Claude response received, length:", feedbackText.length);
      console.log(
        "🤖 Raw Claude feedback:",
        feedbackText.substring(0, 200) + "..."
      );

      // Try to parse JSON feedback
      let feedbackData;
      try {
        // Clean the response - remove markdown code blocks if present
        let cleanedText = feedbackText.trim();
        if (cleanedText.startsWith("```json")) {
          cleanedText = cleanedText
            .replace(/^```json\s*/, "")
            .replace(/\s*```$/, "");
        } else if (cleanedText.startsWith("```")) {
          cleanedText = cleanedText
            .replace(/^```\s*/, "")
            .replace(/\s*```$/, "");
        }

        console.log(
          "🧹 Cleaned Claude response:",
          cleanedText.substring(0, 200) + "..."
        );

        feedbackData = JSON.parse(cleanedText);
        console.log("✅ Successfully parsed Claude JSON feedback:", {
          note: feedbackData.note,
          pointsForts: feedbackData.points_forts?.length,
          axesAmelioration: feedbackData.axes_amelioration?.length,
          suggestions: feedbackData.suggestions?.length,
          analysComplete: feedbackData.analyse_complete?.length,
        });
      } catch (parseError) {
        console.warn(
          "⚠️ Failed to parse Claude JSON, using fallback:",
          parseError
        );
        console.log("🔍 Raw feedback text for debugging:", feedbackText);

        // Fallback if JSON parsing fails - but keep the original text for potential frontend parsing
        feedbackData = {
          note: 70,
          points_forts: ["Feedback généré avec succès"],
          axes_amelioration: ["Améliorer la structuration"],
          moments_cles: ["Conversation complétée"],
          suggestions: ["Continuer à pratiquer"],
          analyse_complete: feedbackText, // Keep original text for frontend parsing attempt
        };
      }

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

      console.log("🎉 Conversation analysis completed successfully!");
      return NextResponse.json({
        feedback,
        transcript,
        conversation_id: conversationId,
      });
    } catch (error) {
      console.error("❌ Error generating feedback:", error);

      // Create basic feedback if AI fails
      console.log("🔄 Creating fallback feedback...");
      const { data: basicFeedback } = await supabase
        .from("feedback")
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          note: 70,
          points_forts: ["Conversation complétée"],
          axes_amelioration: ["Continuer à pratiquer"],
          moments_cles: ["Simulation terminée"],
          suggestions: ["Refaire des simulations régulièrement"],
          analyse_complete:
            "Conversation terminée. Le feedback détaillé n'a pas pu être généré automatiquement.",
        })
        .select()
        .single();

      console.log("⚠️ Fallback feedback created");

      return NextResponse.json({
        feedback: basicFeedback,
        transcript,
        conversation_id: conversationId,
        warning: "Feedback de base généré (erreur IA)",
      });
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
