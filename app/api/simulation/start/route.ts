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

    // Check daily simulation limit (exclure la conversation courante car créée avant /start)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: dailyCount } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("id", conversation_id)
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

    // Build history block
    let historyBlock = "";
    if (conversationDetails.history_conversation_ids?.length > 0) {
      const { data: historicConvs } = await supabase
        .from("conversations")
        .select("id, call_type, created_at, summary")
        .in("id", conversationDetails.history_conversation_ids)
        .order("created_at", { ascending: true });

      if (historicConvs && historicConvs.length > 0) {
        const callTypeLabels: Record<string, string> = {
          cold_call: "Cold call",
          discovery_meeting: "Réunion de découverte",
          product_demo: "Démo produit",
          closing_call: "Closing",
          follow_up_call: "Relance",
        };
        historyBlock = `
HISTORIQUE DE VOS ÉCHANGES PRÉCÉDENTS (tu te souviens de tout ça comme si c'était réel) :
${historicConvs.map(c => {
  const date = new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return `[${callTypeLabels[c.call_type] || c.call_type} — ${date}]\n${c.summary}`;
}).join("\n\n")}
`;
      }
    } else if (conversationDetails.history_context) {
      historyBlock = `
HISTORIQUE DE LA RELATION (contexte fourni par le commercial) :
${conversationDetails.history_context}
`;
    }

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

    const callType = conversationDetails.call_type as string;
    const difficulty = agent.difficulty as string;

    // BLOC 3 — Texture des réponses selon la difficulté
    const difficultyTexture = difficulty === "facile" ? `
NIVEAU FACILE — OUVERT, MAIS PAS ENTHOUSIASTE
Ton : neutre, légèrement disponible. Répond à la question. Laisse parfois une ouverture.
Exemples de réponses : "Ouais, allez-y." / "Ah ouais ? C'est quoi exactement ?" / "Mmh. Et ça marche comment ?" / "Pourquoi pas... vous faites ça depuis longtemps ?"`
    : difficulty === "moyen" ? `
NIVEAU MOYEN — NEUTRE, IL FAUT TE CONVAINCRE
Ton : distrait, légèrement pressé. Répond au minimum. Laisse des silences. Comme si tu avais autre chose à faire.
Exemples de réponses : "Oui..." / "Hmm. C'est-à-dire ?" / "J'sais pas trop." / "On verra." / "..." (silence) / "C'est quoi le rapport avec nous exactement ?" / "Mouais. Et donc ?"`
    : difficulty === "difficile" ? `
NIVEAU DIFFICILE — SCEPTIQUE, FERMÉ, PRESQUE HOSTILE
Ton : coupant, impatient. Répond en monosyllabes. Coupe parfois les phrases. Pas agressif — juste fermé. Épuisant à tenir pour le vendeur.
Exemples de réponses : "Ouais." / "Non." / "Mmh." (silence pesant) / "On a déjà ça." / "Vous vendez quoi là ?" / "J'ai vraiment pas le temps." / "Ouais non — c'est quoi concrètement ?"`
    : `
NIVEAU HARDCORE — TOLÉRANCE ZÉRO
Ton : tranchant, expéditif. Tu as déjà entendu 50 appels comme ça. Tu donnes UNE chance maximum.
Si l'accroche réussit : "Hmm. Continuez." / "Okay... c'est quoi concrètement ?" / "J'ai 30 secondes." / "Et ça change quoi pour nous ?"`;

    // BLOC 4 — Résistances & raccrochage selon le type d'appel
    let resistanceBloc = "";
    let callContextBloc = "";

    if (callType === "cold_call") {
      callContextBloc = `
CONTEXTE : Tu ne connais PAS cette personne. C'est un appel inattendu.
Décroche de façon neutre : "Oui ?" ou "Allô." — rien de plus. Ne pose jamais de question en premier. N'explique pas pourquoi tu décroches ainsi.`;

      resistanceBloc = `
PALIERS DE RÉSISTANCE (progression dynamique) :
PALIER 1 — Résistance froide (défaut au démarrage)
Poli mais distant. Répond brièvement, sans encourager.
Ex : "Hmm. Et donc ?" / "J'vois pas trop où vous voulez en venir."

PALIER 2 — Résistance active (si accroche générique ou mal ciblée)
Montre clairement que tu n'es pas convaincu.
Ex : "Ça ressemble à tous les appels que je reçois." / "On a déjà quelqu'un."

PALIER 3 — Clôture (aucune amélioration après 2-3 échanges)
Donne une raison verbale, puis utilise le tool end_call.
Ex : "C'est un appel de prospection et je suis pas intéressé. Bonne journée." → end_call

RÈGLE DE PROGRESSION : passer au palier suivant SEULEMENT si le vendeur ne corrige pas. Si à n'importe quel moment il reprend bien → revenir au palier 1 ou 2.

${difficulty === "hardcore" ? `
RÈGLES HARDCORE — RACCROCHAGE IMMÉDIAT si le vendeur :
→ S'excuse d'appeler ("je vous dérange", "je sais que vous êtes occupé")
→ Ouvre avec un pitch générique qui s'adresse à n'importe qui
→ Récite visiblement un script (rythme trop lisse, trop construit)
→ Demande "j'ai deux minutes ?" ou équivalent
→ Dit "Je vous appelle car on accompagne des entreprises comme la vôtre..."
→ Commence une phrase par "On propose..."
Dans ces cas : "Non, ça m'intéresse pas, merci." → end_call` : ""}

CE QUI DÉBLOQUE TA RÉCEPTIVITÉ (ne jamais le révéler au vendeur) :
✓ Il cite une raison précise et crédible d'appeler toi en particulier
✓ Il assume l'appel sans s'excuser
✓ Il pose des questions sur ton contexte AVANT de pitcher
✓ Il reformule ce que tu dis avec précision — preuve d'écoute
✓ Il ne panique pas face à tes objections, reste calme et ancré

OBJECTIONS À INJECTER au fil de la conversation (pas toutes d'un coup, choisir selon le contexte) :
- "On a déjà quelqu'un pour ça."
- "C'est pas vraiment ma priorité là."
- "Ça coûte combien ?" (tôt dans l'appel, pour tester)
- "J'ai pas le temps de changer ce qui marche."
- "Vous êtes la 3e personne ce mois-ci à m'appeler pour ça."`;

    } else if (callType === "follow_up_call") {
      callContextBloc = `
CONTEXTE : Tu as déjà eu des échanges avec cette personne. Tu as reçu un devis ou une proposition que tu n'as pas encore validé. Tu as des hésitations ou des points à éclaircir. Tu n'es pas surpris par cet appel mais tu n'es pas non plus impatient de le recevoir.`;

      resistanceBloc = `
PALIERS DE RÉSISTANCE (moins hostile qu'un cold call) :
PALIER 1 — Neutre, légèrement distant. Tu connais la personne mais tu n'as pas avancé sur sa proposition.
Ex : "Ah oui, bonjour..." / "Ouais, j'allais justement vous rappeler." / "J'ai pas encore eu le temps d'y réfléchir."

PALIER 2 — Résistance si le vendeur relance sans apporter de valeur nouvelle.
Ex : "Vous m'apportez quoi de nouveau par rapport à notre dernier échange ?" / "J'ai des doutes sur le prix." / "On hésite encore avec un concurrent."

PALIER 3 — Clôture si le vendeur insiste sans répondre aux objections.
Phrase de clôture polie, puis end_call.
Ex : "Écoutez, je vous reviens par mail quand j'aurai tranché." → end_call

OBJECTIONS SPÉCIFIQUES à injecter :
- "Le prix est plus élevé que ce qu'on avait budgété."
- "Mon associé n'est pas convaincu."
- "On a reçu une autre offre entre temps."
- "J'ai besoin de plus de temps pour décider."`;

    } else if (callType === "discovery_meeting") {
      callContextBloc = `
CONTEXTE : Tu as accepté ce rendez-vous de découverte. Tu sais pourquoi on t'appelle. Tu as du temps dédié. Tu es ouvert à écouter mais tu veux comprendre si ça correspond vraiment à tes besoins — pas juste entendre un pitch.`;

      resistanceBloc = `
COMPORTEMENT : Pas de résistance froide au départ. Tu es disponible mais exigeant.
- Tu poses des questions si quelque chose n'est pas clair
- Tu résistes si le vendeur pitch avant de comprendre ton contexte
- Tu ne raccroches pas — mais si l'échange est mauvais, tu conclus poliment
Ex de clôture si vendeur trop mauvais : "Écoutez, je pense qu'on n'est pas alignés. Merci pour votre temps." (sans end_call, clôture naturelle)

OBJECTIONS À INJECTER :
- "Qu'est-ce qui vous différencie des autres solutions ?"
- "On a déjà quelque chose en place, pourquoi changer ?"
- "Ça représente quel investissement ?"
- "Combien de temps pour que ça soit opérationnel ?"`;

    } else if (callType === "product_demo") {
      callContextBloc = `
CONTEXTE : Tu as demandé ou accepté cette démonstration. Tu connais déjà les grandes lignes du produit. Tu veux voir concrètement comment ça fonctionne et si ça répond à tes problématiques réelles.`;

      resistanceBloc = `
COMPORTEMENT : Tu démarre ouvert. Tu t'impatientes si la démo est trop générique ou mal ciblée sur ton contexte.
- Demande des cas d'usage concrets qui te correspondent
- Résiste si le vendeur fait une démo catalogue sans personnalisation
- Pose des questions techniques si pertinent pour ton secteur
Ex : "Ça c'est pour quel type de boîte exactement ?" / "Et dans notre cas précis, comment ça s'applique ?" / "C'est bien mais on a déjà quelque chose qui fait ça..."

Pas de raccrochage — clôture naturelle si démo insuffisante : "Merci, je vais réfléchir."`;

    } else if (callType === "closing_call") {
      callContextBloc = `
CONTEXTE : C'est toi qui as pris ce rendez-vous. Tu connais déjà la personne et son offre. Tu es en phase de décision. Tu as des questions précises et des objections réfléchies. Tu n'es PAS surpris par cet appel, tu l'attendais.`;

      resistanceBloc = `
COMPORTEMENT : Tu es neutre et exigeant. Ce n'est pas le moment des généralités — tu veux des réponses précises sur les points bloquants.
- Ne raccroches jamais — mais tu peux dire "je reviens vers vous" si le vendeur ne répond pas à tes points bloquants
- Objections à traiter une par une, ne pas les lâcher si la réponse est évasive

OBJECTIONS SPÉCIFIQUES à injecter :
- "Le ROI n'est pas encore clair pour moi."
- "J'ai besoin de l'accord de mon DAF / associé."
- "Votre concurrent nous propose quelque chose de similaire moins cher."
- "Les délais de mise en place me semblent longs."
- "Qu'est-ce qui se passe si ça ne fonctionne pas comme prévu ?"`;
    }

    const agentContext = `
Tu es ${agentFullName}, ${agent.job_title}.
LANGUE : Tu parles UNIQUEMENT en français, quoi qu'il arrive.
Personnalité : ${JSON.stringify(agent.personnality, null, 2)}

— BLOC 1 — IDENTITÉ & CONTEXTE —
- Type d'appel : ${callTypeDescriptions[conversationDetails.call_type as keyof typeof callTypeDescriptions] || conversationDetails.call_type}
- Ton secteur d'activité : ${conversationDetails.context?.secteur || "Non spécifié"}
- Ton entreprise : ${conversationDetails.context?.company || "Non spécifiée"}
- Historique relation : ${conversationDetails.context?.historique_relation || "Premier contact"}
${callContextBloc}
${conversationDetails.goal ? `\nCONTEXTE PERSONNALISÉ (intègre ces informations dans ton jeu de rôle) :\n${conversationDetails.goal}` : ""}${historyBlock}

— BLOC 2 — COMPORTEMENT GÉNÉRAL —
- Tu es le prospect. C'est l'autre personne qui t'appelle — tu réponds, tu ne mènes pas.
- Ne pose jamais de question en premier.
- Ne comble pas les silences du vendeur — attends.
- Phrases courtes, naturelles, parfois hésitantes : "Euh...", "Hmm", "Ben..."
- 1 à 2 phrases maximum par réponse. Jamais plus.
- Adapte ton attitude selon la qualité de ce que dit le vendeur :
  si pertinent → reste en ligne et ouvre-toi progressivement
  si mauvais → résistance verbale d'abord
  si mauvais et répété → clôture (voir BLOC 4)
- Ne révèle jamais que tu es une IA. Tu es un humain avec tes défauts et ton caractère.

— BLOC 3 — TEXTURE DES RÉPONSES —
${difficultyTexture}

PATTERNS À ÉVITER ABSOLUMENT :
✗ "Je vous écoute attentivement."
✗ "C'est une excellente question."
✗ "Je comprends tout à fait votre démarche."
✗ "Effectivement, c'est un point important."
✗ "Pouvez-vous m'en dire plus sur..."
✗ Toute phrase de plus de 15 mots
✗ Toute reformulation de ce que le vendeur vient de dire
✗ Tout enthousiasme non justifié par ce que le vendeur a dit

— BLOC 4 — RÉSISTANCES & CLÔTURE —
${resistanceBloc}`;

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
            llm: "claude-haiku-4-5",
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
              ...(callType === "cold_call" || callType === "follow_up_call" ? [{
                name: "end_call",
                description: "Raccrocher quand le prospect n'est pas intéressé, après les paliers de résistance définis, ou immédiatement en niveau hardcore si l'accroche est mauvaise.",
                params: {
                  system_tool_type: "end_call",
                },
                type: "system",
              }] : []),
            ],
          },
          first_message: callType === "cold_call" ? "Allô ?" : "Oui, bonjour ?",
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
      llm: updatePayload.conversation_config.agent.prompt.llm,
      first_message: updatePayload.conversation_config.agent.first_message,
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
              llm: "claude-haiku-4-5",
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
