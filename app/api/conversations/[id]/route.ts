import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log("📥 GET /api/conversations/[id] called", id);

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

    const { data: conversation, error: fetchError } = await db
      .from("conversations")
      .select(
        `
        *,
        agents:agent_id (
          id,
          name,
          job_title,
          picture_url,
          difficulty,
          personnality,
          firstname,
          lastname
        ),
        products:product_id (
          id,
          name,
          pitch,
          price,
          marche
        ),
        feedback:feedback_id (
          id,
          note,
          points_forts,
          axes_amelioration,
          moments_cles,
          suggestions,
          analyse_complete,
          created_at
        )
      `
      )
      .eq("id", id)
      .single();

    if (fetchError || !conversation) {
      console.error("❌ conversation fetch error:", fetchError);
      return NextResponse.json(
        { error: "Conversation introuvable" },
        { status: 404 }
      );
    }

    if (!isAdmin && conversation.user_id !== user.id) {
      console.warn("⛔ Non-owner non-admin blocked:", user.id, "→", id);
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    return NextResponse.json({ conversation });
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
