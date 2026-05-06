import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  console.log("📥 GET /api/admin/prompt called");

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Auth error on prompt fetch");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) {
      console.warn("⛔ Non-admin user blocked from prompt fetch:", user.id);
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("app_settings")
      .select("persona_instructions, behavior_instructions, updated_at")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("❌ app_settings fetch error:", error);
      return NextResponse.json(
        { error: "Échec de la lecture" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      persona_instructions: data?.persona_instructions ?? "",
      behavior_instructions: data?.behavior_instructions ?? "",
      updated_at: data?.updated_at ?? null,
    });
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log("📝 POST /api/admin/prompt called");

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Auth error on prompt route");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) {
      console.warn("⛔ Non-admin user blocked from prompt route:", user.id);
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const personaRaw =
      typeof body?.persona_instructions === "string" ? body.persona_instructions : "";
    const behaviorRaw =
      typeof body?.behavior_instructions === "string" ? body.behavior_instructions : "";

    const personaTrimmed = personaRaw.trim();
    const behaviorTrimmed = behaviorRaw.trim();
    const personaValue = personaTrimmed.length === 0 ? null : personaRaw;
    const behaviorValue = behaviorTrimmed.length === 0 ? null : behaviorRaw;

    const { error: updateError } = await supabase
      .from("app_settings")
      .update({
        persona_instructions: personaValue,
        behavior_instructions: behaviorValue,
        updated_by: user.id,
      })
      .eq("id", 1);

    if (updateError) {
      console.error("❌ app_settings update error:", updateError);
      return NextResponse.json(
        { error: "Échec de la mise à jour" },
        { status: 500 }
      );
    }

    console.log(
      "✅ app_settings updated by",
      user.id,
      "persona:",
      personaValue?.length ?? 0,
      "behavior:",
      behaviorValue?.length ?? 0
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
