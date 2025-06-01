import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  console.log("🚀 POST /api/elevenlabs/manage-agent called");

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
        name: `Agent_${user.id.substring(0, 8)}`,
        voice_id: "pNInz6obpgDQGcFmaJgB", // Default voice, will be updated per simulation
        agent: {
          prompt: {
            prompt: "Tu es un assistant commercial professionnel.",
          },
        },
      };

      console.log("📨 Create agent payload:", createAgentPayload);

      const createAgentResponse = await fetch(
        "https://api.elevenlabs.io/v1/convai/agents",
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
      console.log(
        "📡 Create agent response headers:",
        Object.fromEntries(createAgentResponse.headers.entries())
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
    const { data: conversation, error: conversationError } = await supabase
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

    if (conversationError) {
      console.error("❌ Conversation query error:", conversationError);
      return NextResponse.json(
        { error: "Conversation introuvable" },
        { status: 404 }
      );
    }

    if (!conversation) {
      console.error("❌ No conversation found");
      return NextResponse.json(
        { error: "Conversation introuvable" },
        { status: 404 }
      );
    }

    console.log("✅ Conversation found:", {
      id: conversation.id,
      agent_id: conversation.agent_id,
      product_id: conversation.product_id,
      call_type: conversation.call_type,
    });

    const agent = conversation.agents;
    const product = conversation.products;

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
Personnalité: ${JSON.stringify(agent.personnality, null, 2)}
Difficulté: ${agent.difficulty}

CONTEXTE DE L'APPEL:
- Type d'appel: ${
      callTypeDescriptions[
        conversation.call_type as keyof typeof callTypeDescriptions
      ] || conversation.call_type
    }
- Secteur: ${conversation.context?.secteur || "Non spécifié"}
- Entreprise: ${conversation.context?.company || "Non spécifiée"}
- Historique relation: ${
      conversation.context?.historique_relation || "Premier contact"
    }
- Objectif commercial: ${conversation.goal}

PRODUIT À PRÉSENTER:
- Nom: ${product.name}
- Pitch: ${product.pitch}
- Prix: ${product.price}€
- Marché: ${product.marche}
- Objections attendues: ${product.principales_objections_attendues}

INSTRUCTIONS:
1. Reste cohérent avec ta personnalité et ton rôle
2. Adapte ton attitude selon ta difficulté (${agent.difficulty})
3. Réagis naturellement aux objections mentionnées
4. Ne révèle jamais que tu es une IA
5. Termine l'appel quand c'est approprié selon le contexte
6. Parle en français naturellement
7. Sois professionnel mais adapte ton niveau selon ta difficulté
`;

    console.log("📝 Agent context prepared (length):", agentContext.length);

    const updatePayload = {
      voice_id: agent.voice_id || "pNInz6obpgDQGcFmaJgB",
      agent: {
        prompt: {
          prompt: agentContext,
        },
      },
    };

    console.log("📨 Update agent payload:", {
      voice_id: updatePayload.voice_id,
      prompt_length: updatePayload.agent.prompt.prompt.length,
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
    console.log(
      "📡 Update agent response headers:",
      Object.fromEntries(updateAgentResponse.headers.entries())
    );

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
      agent_id: agentId,
      conversation_id: conversation_id,
      success: true,
    };

    console.log("✅ Returning success response:", response);
    return NextResponse.json(response);
  } catch (error) {
    console.error(
      "❌ Unexpected error in /api/elevenlabs/manage-agent:",
      error
    );
    console.error(
      "❌ Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
