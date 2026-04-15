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

    // Check daily simulation limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: dailyCount } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString());

    if ((dailyCount ?? 0) >= 3) {
      console.warn("⚠️ Daily simulation limit reached for user:", user.id);
      return NextResponse.json(
        { error: "Limite de 3 simulations par jour atteinte. Revenez demain !" },
        { status: 429 }
      );
    }

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
            max_duration_seconds: 2700,
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

    // Use firstname and lastname if available, fallback to name
    const agentFullName = agent.firstname && agent.lastname 
      ? `${agent.firstname} ${agent.lastname}` 
      : agent.name;

    // Build call-type-specific behavioral context
    const callType = conversationDetails.call_type as string;
    let callTypeBehavior = "";

    if (callType === "closing_call") {
      callTypeBehavior = `
CONTEXTE SPÉCIFIQUE - APPEL DE CLOSING:
- C'est TOI qui as pris ce rendez-vous, tu sais que c'est un appel stratégique/de closing.
- Tu connais déjà la personne qui t'appelle et son entreprise.
- Tu es disponible et tu as bloqué du temps pour cet appel (30-40 minutes).
- Tu as déjà eu des échanges préalables et tu connais le produit/service proposé.
- Tu es en phase de décision, tu as des questions précises et des objections réfléchies.
- Tu n'es PAS surpris par cet appel, tu l'attendais.`;
    } else if (callType === "discovery_meeting") {
      callTypeBehavior = `
CONTEXTE SPÉCIFIQUE - RÉUNION DE DÉCOUVERTE:
- Tu as accepté ce rendez-vous de découverte, tu sais pourquoi on t'appelle.
- Tu es ouvert à écouter mais tu veux comprendre si ça correspond à tes besoins.
- Tu as du temps dédié pour cet échange.`;
    } else if (callType === "product_demo") {
      callTypeBehavior = `
CONTEXTE SPÉCIFIQUE - DÉMO PRODUIT:
- Tu as demandé ou accepté cette démonstration.
- Tu connais déjà les grandes lignes du produit/service.
- Tu veux voir concrètement comment ça fonctionne et si ça répond à tes problématiques.`;
    } else if (callType === "follow_up_call") {
      callTypeBehavior = `
CONTEXTE SPÉCIFIQUE - APPEL DE RELANCE:
- Tu as déjà eu des échanges avec cette personne.
- Tu as reçu un devis ou une proposition que tu n'as pas encore validé.
- Tu as peut-être des hésitations ou des points à éclaircir.`;
    } else {
      // cold_call - default behavior, prospect is surprised
      callTypeBehavior = `
CONTEXTE SPÉCIFIQUE - APPEL À FROID:
- Tu ne connais PAS cette personne, c'est un appel inattendu.
- Tu es naturellement méfiant comme tout le monde avec les appels inconnus.`;
    }

    const agentContext = `
Tu es ${agentFullName}, ${agent.job_title}.
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
${callTypeBehavior}
${conversationDetails.goal ? `
CONTEXTE PERSONNALISÉ (TRÈS IMPORTANT - tu dois intégrer ces informations dans ton jeu de rôle):
${conversationDetails.goal}
` : ""}

INSTRUCTIONS:
1. TU ES PASSIF - C'est l'autre personne qui t'appelle, tu réponds seulement à ses questions.
2. NE PRENDS JAMAIS L'INITIATIVE - Tu ne poses pas de questions en premier, tu laisses le démarcheur mener la conversation.
3. ${callType === "cold_call" ? "SOIS NATURELLEMENT DISTANT AU DÉBUT - Tu ne connais pas cette personne, tu es un peu méfiant comme tout le monde avec les appels inconnus." : "SOIS PROFESSIONNEL MAIS PAS TROP FACILE - Tu connais cette personne mais tu restes exigeant et tu veux être convaincu."}
4. Adapte ton attitude selon ta difficulté (${agent.difficulty}) :
   - Facile : Un peu plus ouvert mais pas enthousiaste
   - Moyen : Neutre, il faut te convaincre
   - Difficile : Sceptique et pas facile à convaincre
5. PARLE COMME UN VRAI HUMAIN - Utilise un langage naturel et spontané :
   - Au lieu de "Que puis-je faire pour vous ?" → "Oui c'est pour quoi ?" ou "Oui je vous écoute"
   - Au lieu de "Je suis à votre disposition" → évite complètement ce genre de phrases
   - Au lieu de "Pouvez-vous m'expliquer..." → "C'est quoi exactement ?" ou "Ah ouais ?"
   - Utilise des expressions courantes : "Ah bon ?", "D'accord", "Hmm", "Okay", "Ah je vois"
6. PHRASES COURTES ET NATURELLES :
   - Évite les longues phrases compliquées
   - Parle par petites phrases comme dans une vraie conversation
   - Utilise des hésitations naturelles : "Euh...", "Ben...", "Alors..."
7. RÉACTIONS MESURÉES (pas trop enthousiastes) :
   - Réagis naturellement mais sans être surexcité : "Ah ouais ?", "D'accord", "Mouais..."
   - Montre de l'intérêt progressif seulement si c'est vraiment intéressant
   - Reste un peu sur la réserve au début
8. ${callType === "cold_call" ? "Tu ne connais pas à l'avance ce que le démarcheur va te proposer - découvre-le naturellement." : "Tu connais déjà les grandes lignes de ce que la personne va te proposer, mais tu veux des précisions."}
9. Ne révèle jamais que tu es une IA - tu es un humain normal avec tes défauts et ton caractère.
10. ${callType === "cold_call" ? "LAISSE-LE PARLER EN PREMIER - Tu réponds juste \"Oui ?\" ou \"Allô ?\" et tu attends qu'il explique pourquoi il appelle." : "ACCUEILLE-LE NATURELLEMENT - Tu sais pourquoi il appelle, tu peux dire \"Ah oui bonjour, on avait rendez-vous\" ou \"Oui je vous attendais\"."}
11. EXEMPLES DE RÉPONSES NATURELLES ET MESURÉES :
    - "Oui allez-y" au lieu de "Je vous écoute attentivement"
    - "C'est quoi ça ?" au lieu de "Pouvez-vous me donner plus de détails ?"
    - "Mouais, pourquoi pas" au lieu de "Je suis très intéressé par votre proposition"
    - "J'sais pas trop" au lieu de "Je ne suis pas certain"
    - "Ça coûte combien ?" au lieu de "Quel est le tarif de votre solution ?"`;

    console.log("📝 Agent context prepared (length):", agentContext.length);

    // Map voice IDs based on agent characteristics
    const getVoiceId = (agent: any) => {
      // Default voices from the provided list
      const voices = {
        // Male voices
        male_young_dynamic: "gs0tAILXbY5DNrJrsM6F", // Homme - dynamique - assez jeune
        male_young_realistic: "qNc8cbRJLnPqGTjuVcKa", // Homme - Très réaliste - assez jeune
        male_mature_deep: "UgBBYS2sOqTuMpoF3BR0", // Homme - Mature - deep - reposé - haut poste
        male_young_energetic: "zT03pEAEi0VHKciJODfn", // Homme - jeune - énergique
        // Female voices
        female_young_dynamic: "TojRWZatQyy9dujEdiQ1", // Femme - assez jeune - dynamique
        female_young_energetic: "TojRWZatQyy9dujEdiQ1", // Femme - jeune - énergique
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
          max_duration_seconds: conversationDetails.max_duration_seconds ?? 2700,
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

    // If agent not found (404), create a new one - this happens when switching ElevenLabs accounts
    if (updateAgentResponse.status === 404) {
      console.log("⚠️ Agent not found in ElevenLabs, creating a new one...");

      const createAgentPayload = {
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
            first_message: callType === "cold_call" ? "Allô ?" : "Oui bonjour ?",
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
            max_duration_seconds: conversationDetails.max_duration_seconds ?? 2700,
          },
        },
        name: `${agent.name}_${conversationDetails.call_type}`,
        tags: ["sales", conversationDetails.call_type, agent.difficulty],
      };

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

      console.log("📡 Create new agent response status:", createAgentResponse.status);

      if (!createAgentResponse.ok) {
        const errorData = await createAgentResponse.text();
        console.error("❌ ElevenLabs agent creation error:", errorData);
        return NextResponse.json(
          { error: "Erreur lors de la création de l'agent ElevenLabs" },
          { status: 500 }
        );
      }

      const newAgentData = await createAgentResponse.json();
      console.log("✅ New agent created:", newAgentData);
      agentId = newAgentData.agent_id;

      // Update user profile with new agent ID
      console.log("💾 Updating user profile with new agent ID...");
      const { error: updateUserError } = await supabase
        .from("users")
        .update({ elevenlabs_agent_api_id: agentId })
        .eq("id", user.id);

      if (updateUserError) {
        console.error("❌ Error updating user profile:", updateUserError);
      } else {
        console.log("✅ User profile updated with new agent ID");
      }
    } else if (!updateAgentResponse.ok) {
      const errorData = await updateAgentResponse.text();
      console.error("❌ ElevenLabs agent update error:", errorData);
      return NextResponse.json(
        { error: "Erreur lors de la configuration de l'agent" },
        { status: 500 }
      );
    }

    let updateResult = null;
    if (updateAgentResponse.ok) {
      updateResult = await updateAgentResponse.json();
    }
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
