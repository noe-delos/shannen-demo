/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { conversation_id } = await request.json();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Get user's ElevenLabs agent ID
    const { data: userProfile, error: userError } = await supabase
      .from("users")
      .select("elevenlabs_agent_api_id")
      .eq("id", user.id)
      .single();

    if (userError || !userProfile?.elevenlabs_agent_api_id) {
      return NextResponse.json(
        {
          error: "Agent ElevenLabs non configuré",
        },
        { status: 400 }
      );
    }

    const agentId = userProfile.elevenlabs_agent_api_id;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      // Fallback for direct use without authentication
      return NextResponse.json({
        directUse: true,
        agentId,
      });
    }

    // Get signed URL from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("ElevenLabs get signed URL error:", errorData);
      return NextResponse.json(
        { error: "Impossible d'obtenir l'URL signée" },
        { status: 500 }
      );
    }

    const responseData = await response.json();

    return NextResponse.json({
      signedUrl: responseData.signed_url,
      agentId: agentId,
    });
  } catch (error) {
    console.error("Error getting signed URL:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
