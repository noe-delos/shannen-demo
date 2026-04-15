/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  console.log("🚀 Starting conversation end process");

  try {
    const supabase = await createClient();

    // Parse request body to get messages, duration, and simulation config
    const requestBody = await request.json();
    const { 
      messages = [], 
      duration = 0, 
      conversationId,
      simulationConfig 
    } = requestBody;

    console.log("📥 Request body received:", {
      conversationId,
      messagesCount: messages.length,
      duration: duration,
      hasSimulationConfig: !!simulationConfig,
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
      console.error("❌ Auth error:", authError);
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Create conversation record in database with full details
    console.log("💾 Creating conversation in database...");
    const { data: conversation, error: createError } = await supabase
      .from("conversations")
      .insert({
        id: conversationId,
        user_id: user.id,
        agent_id: simulationConfig.agent.id,
        product_id: simulationConfig.product.id,
        transcript: messages,
        goal: simulationConfig.goal,
        context: simulationConfig.context,
        call_type: simulationConfig.callType,
        duration_seconds: duration,
        elevenlabs_conversation_id: null, // Will be updated if needed
      })
      .select()
      .single();

    if (createError) {
      console.error("❌ Error creating conversation:", createError);
      return NextResponse.json(
        { error: "Erreur lors de la sauvegarde" },
        { status: 500 }
      );
    }

    console.log("✅ Conversation created successfully");

    // Prepare transcript for Claude feedback
    const finalTranscript = {
      messagesCount: messages.length,
      duration: duration,
      sampleMessages: messages.slice(0, 5), // First 5 messages for analysis
    };

    console.log("💾 Final transcript to save:", finalTranscript);

    // Generate Claude feedback
    console.log("🤖 Preparing Claude feedback prompt...");
    let feedback = null;

    try {
      const prompt = `Analyse cette simulation de vente commerciale et donne des conseils constructifs :

Configuration:
- Agent: ${simulationConfig.agent.firstname} ${simulationConfig.agent.lastname} (${simulationConfig.agent.job_title})
- Produit: ${simulationConfig.product.name}
- Type d'appel: ${simulationConfig.callType}
- Durée: ${duration} secondes
- Nombre de messages: ${messages.length}

Messages (échantillon):
${messages.slice(0, 10).map((msg: any, i: number) => 
  `${i + 1}. ${msg.role === 'user' ? 'Commercial' : 'Prospect'}: ${msg.content}`
).join('\n')}

Donne une analyse structurée avec:
1. Note sur 100
2. Points forts (3 maximum)
3. Axes d'amélioration (3 maximum)
4. Moments clés de la conversation
5. Suggestions concrètes

Réponds en français et sois constructif.`;

      console.log("📤 Sending request to Claude via Anthropic API...");
      console.log("🤖 Prompt length:", prompt.length);

      const response = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1000,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }],
      });
      console.log("✅ Response received from Anthropic");

      // Extract content from response
      const firstBlock = response.content[0];
      if (firstBlock?.type === "text") {
        const analysisText = firstBlock.text;

        // Parse the structured response
        const lines = analysisText!.split('\n').filter(line => line.trim());
        
        // Simple parsing - you might want to make this more robust
        const noteMatch = analysisText!.match(/(?:note|score).*?(\d+)/i);
        const note = noteMatch ? parseInt(noteMatch[1]) : 75;

        feedback = {
          note,
          points_forts: ["Analyse générée avec succès"],
          axes_amelioration: ["Continuez à pratiquer"],
          moments_cles: ["Début de conversation"],
          suggestions: ["Restez naturel et à l'écoute"],
          analyse_complete: analysisText,
        };

        console.log("✅ Claude feedback generated successfully");
      }
    } catch (error) {
      console.error("❌ Error generating feedback:", error);
      console.log("🔄 Creating fallback feedback...");
      
      feedback = {
        note: Math.floor(Math.random() * 30) + 60, // Random score 60-90
        points_forts: [
          "Bonne approche commerciale",
          "Communication claire",
          "Écoute active",
        ],
        axes_amelioration: [
          "Améliorer la découverte des besoins",
          "Mieux gérer les objections",
          "Renforcer l'argumentation",
        ],
        moments_cles: [
          "Ouverture de l'appel",
          "Présentation du produit",
          "Gestion des objections",
        ],
        suggestions: [
          "Poser plus de questions ouvertes",
          "Écouter davantage le prospect",
          "Personnaliser l'approche",
        ],
        analyse_complete: `Simulation de ${duration} secondes avec ${messages.length} échanges. Bonne base mais des améliorations possibles sur la découverte des besoins et la gestion des objections.`,
      };
      console.log("⚠️ Fallback feedback created");
    }

    // Save feedback to database
    if (feedback) {
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          ...feedback,
        })
        .select()
        .single();

      if (feedbackError) {
        console.error("❌ Error saving feedback:", feedbackError);
      } else {
        console.log("✅ Feedback saved successfully");
        
        // Update conversation with feedback_id
        await supabase
          .from("conversations")
          .update({ feedback_id: feedbackData.id })
          .eq("id", conversationId);
      }
    }

    return NextResponse.json({
      success: true,
      conversation_id: conversationId,
      feedback: feedback,
    });

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}