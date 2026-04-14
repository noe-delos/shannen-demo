import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;

  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { elevenlabs_conversation_id } = await request.json();
    if (!elevenlabs_conversation_id) {
      return NextResponse.json({ error: "elevenlabs_conversation_id manquant" }, { status: 400 });
    }

    const { error } = await supabase
      .from("conversations")
      .update({ elevenlabs_conversation_id })
      .eq("id", conversationId)
      .eq("user_id", user.id);

    if (error) {
      console.error("❌ Error updating elevenlabs_conversation_id:", error);
      return NextResponse.json({ error: "Erreur mise à jour" }, { status: 500 });
    }

    console.log("✅ ElevenLabs conversation ID saved:", elevenlabs_conversation_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("💥 Fatal error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
