import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { buildAgentPrompt } from "@/lib/prompt/build-agent-prompt";

const VALID_CALL_TYPES = [
  "cold_call",
  "discovery_meeting",
  "product_demo",
  "closing_call",
  "follow_up_call",
] as const;

export async function GET(request: NextRequest) {
  console.log("🔍 GET /api/admin/prompt/preview called");

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
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const url = new URL(request.url);
    const requestedCallType = url.searchParams.get("call_type") ?? "cold_call";
    const callType = VALID_CALL_TYPES.includes(
      requestedCallType as (typeof VALID_CALL_TYPES)[number]
    )
      ? requestedCallType
      : "cold_call";
    const agentIdParam = url.searchParams.get("agent_id");

    const admin = createAdminClient();

    // Pick an example agent: requested ID, or first system default (user_id IS NULL),
    // or any agent as a last resort.
    let agentQuery = admin.from("agents").select("*").limit(1);
    if (agentIdParam) {
      agentQuery = agentQuery.eq("id", agentIdParam);
    } else {
      agentQuery = agentQuery.is("user_id", null);
    }
    let { data: agent } = await agentQuery.maybeSingle();

    if (!agent) {
      const { data: fallback } = await admin
        .from("agents")
        .select("*")
        .limit(1)
        .maybeSingle();
      agent = fallback;
    }

    if (!agent) {
      return NextResponse.json(
        { error: "Aucun agent disponible pour générer un aperçu" },
        { status: 404 }
      );
    }

    const { data: settings } = await admin
      .from("app_settings")
      .select("persona_instructions, behavior_instructions")
      .eq("id", 1)
      .single();

    const sampleConversationDetails = {
      call_type: callType,
      context: {
        secteur: "SaaS B2B",
        company: "Acme Corp",
        historique_relation: "Premier contact",
      },
      goal: "Décrocher un rendez-vous de qualification de 30 minutes la semaine prochaine.",
    };

    const prompt = buildAgentPrompt({
      agent,
      conversationDetails: sampleConversationDetails,
      personaInstructions: settings?.persona_instructions ?? null,
      behaviorInstructions: settings?.behavior_instructions ?? null,
      historyBlock: "",
    });

    return NextResponse.json({
      prompt,
      example: {
        agent_name: agent.name,
        agent_difficulty: agent.difficulty,
        call_type: callType,
        secteur: sampleConversationDetails.context.secteur,
        company: sampleConversationDetails.context.company,
      },
    });
  } catch (err) {
    console.error("❌ Unexpected error in preview route:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
