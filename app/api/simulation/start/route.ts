/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  console.log("🚀 POST /api/simulation/start called");

  try {
    const supabase = await createClient();
    const body = await request.json();
    const { conversation_id } = body;

    console.log("📨 Request body:", body);
    console.log("🆔 Conversation ID:", conversation_id);

    // Get authenticated user
    console.log("🔐 Getting authenticated user...");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("❌ Auth error:", authError);
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!user) {
      console.error("❌ No user found");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Get existing conversation
    console.log("📥 Fetching conversation from database...");
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversation_id)
      .eq("user_id", user.id)
      .single();

    if (conversationError) {
      console.error("❌ Conversation query error:", conversationError);
      return NextResponse.json(
        { error: "Conversation introuvable" },
        { status: 404 }
      );
    }

    if (!conversation) {
      console.error("❌ No conversation found for ID:", conversation_id);
      return NextResponse.json(
        { error: "Conversation introuvable" },
        { status: 404 }
      );
    }

    console.log("✅ Conversation found:", {
      id: conversation.id,
      elevenlabs_conversation_id: conversation.elevenlabs_conversation_id,
      agent_id: conversation.agent_id,
      product_id: conversation.product_id,
    });

    // Check if conversation already started
    if (conversation.elevenlabs_conversation_id) {
      console.warn(
        "⚠️ Conversation already has ElevenLabs ID:",
        conversation.elevenlabs_conversation_id
      );
      return NextResponse.json(
        {
          error: "Cette conversation a déjà été démarrée",
        },
        { status: 400 }
      );
    }

    // ELEVENLABS AGENT MANAGEMENT (integrated directly)
    console.log("🤖 Starting ElevenLabs agent management...");

    // Get user profile with ElevenLabs agent ID
    console.log("📥 Fetching user profile...");
    const { data: userProfile, error: userError } = await supabase
      .from("users")
      .select("elevenlabs_agent_api_id")
      .eq("id", user.id)
      .single();

    if (userError) {
      console.error("❌ Error fetching user profile:", userError);
      return NextResponse.json(
        { error: "Erreur utilisateur" },
        { status: 500 }
      );
    }

    console.log("✅ User profile found:", userProfile);
    let agentId = userProfile?.elevenlabs_agent_api_id;
    console.log("🤖 Current agent ID:", agentId);

    // If user doesn't have an ElevenLabs agent, create one
    if (!agentId) {
      console.log("🆕 Creating new ElevenLabs agent for user");

      const createAgentPayload = {
        conversation_config: {
          agent: {
            prompt: {
              prompt: "Tu es un assistant commercial professionnel.",
              tools: [
                {
                  type: "system",
                  description: "",
                  name: "end_call",
                },
              ],
              llm: "gemini-1.5-flash",
            },
            first_message: "Bonjour",
            language: "fr",
          },
          tts: {
            agent_output_audio_format: "ulaw_8000",
            voice_id: "T9VNN91AsQKnhGF6hTi8",
            model_id: "eleven_flash_v2_5",
            stability: 0.5,
            similarity_boost: 0.8,
            speed: 1.0,
          },
          asr: {
            user_input_audio_format: "ulaw_8000",
          },
          conversation: {
            client_events: [
              "agent_response",
              "agent_response_correction",
              "audio",
              "interruption",
              "user_transcript",
            ],
            max_duration_seconds: 1800,
          },
        },
        platform_settings: {
          evaluation: {
            criteria: [
              {
                id: "1",
                conversation_goal_prompt: "Assistant commercial professionnel",
              },
            ],
          },
        },
        name: `Agent_${user.id.substring(0, 8)}`,
      };

      console.log("📨 Create agent payload:", createAgentPayload);

      const createAgentResponse = await fetch(
        "https://api.elevenlabs.io/v1/convai/agents/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": process.env.ELEVENLABS_API_KEY!,
          },
          body: JSON.stringify(createAgentPayload),
        }
      );

      console.log(
        "📡 Create agent response status:",
        createAgentResponse.status
      );

      if (!createAgentResponse.ok) {
        const errorData = await createAgentResponse.text();
        console.error("❌ ElevenLabs agent creation error:", errorData);
        return NextResponse.json(
          { error: "Erreur lors de la création de l'agent ElevenLabs" },
          { status: 500 }
        );
      }

      const agentData = await createAgentResponse.json();
      console.log("✅ Agent created:", agentData);
      agentId = agentData.agent_id;

      // Store agent ID in user profile
      console.log("💾 Storing agent ID in user profile...");
      const { error: updateError } = await supabase
        .from("users")
        .update({ elevenlabs_agent_api_id: agentId })
        .eq("id", user.id);

      if (updateError) {
        console.error("❌ Error updating user profile:", updateError);
      } else {
        console.log("✅ Agent ID stored in user profile");
      }
    }

    // Get conversation details for agent configuration
    console.log("📥 Fetching conversation details...");
    const { data: conversationDetails, error: conversationDetailsError } =
      await supabase
        .from("conversations")
        .select(
          `
        *,
        agents:agent_id (*),
        products:product_id (*)
      `
        )
        .eq("id", conversation_id)
        .eq("user_id", user.id)
        .single();

    if (conversationDetailsError) {
      console.error(
        "❌ Conversation details query error:",
        conversationDetailsError
      );
      return NextResponse.json(
        { error: "Conversation introuvable" },
        { status: 404 }
      );
    }

    const agent = conversationDetails.agents;
    const product = conversationDetails.products;

    if (!agent) {
      console.error("❌ No agent found in conversation");
      return NextResponse.json({ error: "Agent introuvable" }, { status: 400 });
    }

    if (!product) {
      console.error("❌ No product found in conversation");
      return NextResponse.json(
        { error: "Produit introuvable" },
        { status: 400 }
      );
    }

    console.log("✅ Agent data:", {
      name: agent.name,
      job_title: agent.job_title,
      difficulty: agent.difficulty,
      voice_id: agent.voice_id,
    });

    console.log("✅ Product data:", {
      name: product.name,
      price: product.price,
      marche: product.marche,
    });

    // Configure agent for this specific simulation
    const callTypeDescriptions = {
      cold_call: "Appel commercial à froid",
      discovery_meeting: "Réunion de découverte",
      product_demo: "Démonstration produit",
      closing_call: "Appel de closing",
      follow_up_call: "Appel de suivi",
    };

    const agentContext = `
Tu es ${agent.name}, ${agent.job_title}. 
Si l'utilisateur te dis bonjour, TU DOIS PARLER EN FRANÇAIS !
Personnalité: ${JSON.stringify(agent.personnality, null, 2)}
Difficulté: ${agent.difficulty}

CONTEXTE DE L'APPEL:
- Type d'appel: ${
      callTypeDescriptions[
        conversationDetails.call_type as keyof typeof callTypeDescriptions
      ] || conversationDetails.call_type
    }
- Ton secteur dans lequel tu travailles: ${
      conversationDetails.context?.secteur || "Non spécifié"
    }
- Ton Entreprise: ${conversationDetails.context?.company || "Non spécifiée"}
- Historique relation avec la personne qui t'appelle: ${
      conversationDetails.context?.historique_relation || "Premier contact"
    }
- Objectif commercial: ${conversationDetails.goal}

PRODUIT que le démarcheur va te présenter:
- Nom: ${product.name}
- Pitch: ${product.pitch}
- Prix: ${product.price}€
- Marché: ${product.marche}
- Objections attendues: ${product.principales_objections_attendues}

INSTRUCTIONS:
1. Reste cohérent avec ta personnalité et ton rôle, tu n'est pas là pour présenter ton entreprise, à moins que l'utilisateur te le demande. C'est toi qui est appelé, donc à prioris tu demande ce que l'utilisateur veut.
2. Adapte ton attitude selon ta difficulté (${agent.difficulty})
3. Sois assez familier dans ta façon de parler, tu n'es pas un robot, tu dois parler comme un humain.
3. Réagis naturellement aux objections mentionnées
4. Ne révèle jamais que tu es une IA
5. Ne sois pas formel, par exemple, ne demande pas au démarcheur d'expliquer ce qu'il veut vendre, c'est à lui de faire la démarche, au lieu de ça tu peux répondre "Oui allez y" ou "je suis plutôt intéressé, je peux en savoir plus ? " ect... `;

    console.log("📝 Agent context prepared (length):", agentContext.length);

    // Map voice IDs based on agent characteristics
    const getVoiceId = (agent: any) => {
      // Default voices from the provided list
      const voices = {
        // Male voices
        male_young_dynamic: "T9VNN91AsQKnhGF6hTi8", // Homme - dynamique - assez jeune
        male_young_realistic: "xlVRtVJbKuO2nwbbopa2", // Homme - Très réaliste - assez jeune
        male_mature_deep: "BVBq6HVJVdnwOMJOqvy9", // Homme - Mature - deep - reposé - haut poste
        male_young_energetic: "3Kfr7NbSVkpOWCWA4Zgu", // Homme - jeune - énergique
        // Female voices
        female_young_dynamic: "F1toM6PcP54s45kOOAyV", // Femme - assez jeune - dynamique
        female_young_energetic: "Ka6yOFdNGhzFuCVW6VyO", // Femme - jeune - énergique
      };

      // Use custom voice_id if provided, otherwise select based on characteristics
      if (agent.voice_id) {
        return agent.voice_id;
      }

      // Simple logic to select voice based on agent characteristics
      const isJunior =
        agent.job_title?.toLowerCase().includes("junior") ||
        agent.difficulty === "facile";
      const isSenior =
        agent.job_title?.toLowerCase().includes("senior") ||
        agent.job_title?.toLowerCase().includes("manager") ||
        agent.job_title?.toLowerCase().includes("directeur") ||
        agent.difficulty === "difficile";

      // Default to male_young_dynamic if nothing specific matches
      if (isSenior) {
        return voices.male_mature_deep;
      } else if (isJunior) {
        return voices.male_young_energetic;
      } else {
        return voices.male_young_dynamic;
      }
    };

    const selectedVoiceId = getVoiceId(agent);
    console.log("🎵 Selected voice ID:", selectedVoiceId);

    const updatePayload = {
      conversation_config: {
        agent: {
          prompt: {
            prompt: agentContext,
            llm: "claude-3-7-sonnet",
            temperature: 0.3,
            tools: [
              {
                name: "language_detection",
                description: "",
                params: {
                  system_tool_type: "language_detection",
                },
                type: "system",
              },
            ],
          },
          language: "fr",
        },
        language_presets: {
          fr: {
            overrides: {
              agent: {
                language: "fr",
              },
            },
          },
        },
        tts: {
          agent_output_audio_format: "ulaw_8000",
          model_id: "eleven_flash_v2_5",
          voice_id: selectedVoiceId,
          stability: 0.5,
          similarity_boost: 0.8,
          speed: 1.0,
        },
        asr: {
          user_input_audio_format: "ulaw_8000",
        },
        conversation: {
          client_events: [
            "user_transcript",
            "agent_response",
            "audio",
            "interruption",
            "agent_response_correction",
          ],
          max_duration_seconds: 1800,
        },
      },
      name: `${agent.name}_${conversationDetails.call_type}`,
      tags: ["sales", conversationDetails.call_type, agent.difficulty],
    };

    console.log("📨 Update agent payload:", {
      name: updatePayload.name,
      tags: updatePayload.tags,
      voice_id: updatePayload.conversation_config.tts.voice_id,
      prompt_length:
        updatePayload.conversation_config.agent.prompt.prompt.length,
    });

    // Update the ElevenLabs agent configuration
    console.log("🔧 Updating ElevenLabs agent configuration...");
    const updateAgentResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify(updatePayload),
      }
    );

    console.log("📡 Update agent response status:", updateAgentResponse.status);

    if (!updateAgentResponse.ok) {
      const errorData = await updateAgentResponse.text();
      console.error("❌ ElevenLabs agent update error:", errorData);
      return NextResponse.json(
        { error: "Erreur lors de la configuration de l'agent" },
        { status: 500 }
      );
    }

    const updateResult = await updateAgentResponse.json();
    console.log("✅ Agent updated successfully:", updateResult);

    // Update conversation with agent ID
    console.log("💾 Updating conversation with ElevenLabs agent ID...");
    const { error: updateConversationError } = await supabase
      .from("conversations")
      .update({ elevenlabs_conversation_id: agentId })
      .eq("id", conversation_id);

    if (updateConversationError) {
      console.error("❌ Error updating conversation:", updateConversationError);
    } else {
      console.log("✅ Conversation updated with agent ID");
    }

    const response = {
      conversation_id: conversation_id,
      agent_id: agentId,
      success: true,
      message: "Agent configuré avec succès",
    };

    console.log("✅ Returning success response:", response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Unexpected error in /api/simulation/start:", error);
    console.error(
      "❌ Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return NextResponse.json(
      {
        error: "Erreur interne du serveur",
      },
      { status: 500 }
    );
  }
}
