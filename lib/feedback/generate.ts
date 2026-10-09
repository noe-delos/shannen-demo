import Anthropic from "@anthropic-ai/sdk";

const FEEDBACK_MODEL = "claude-haiku-4-5-20251001";

// Budgets de sortie successifs. Le premier couvre largement un appel de 60 min ;
// le second ne sert que si Claude a malgré tout été coupé (stop_reason "max_tokens").
// L'ancien budget unique de 2000 tokens tronquait les feedbacks des appels longs (#29).
const MAX_TOKENS_ATTEMPTS = [8000, 16000];

export type FeedbackContent = {
  note: number;
  points_forts: string[];
  axes_amelioration: string[];
  moments_cles: string[];
  suggestions: string[];
  analyse_complete: string;
};

type TranscriptMessage = {
  role?: string;
  source?: string;
  content?: string;
  message?: string;
  text?: string;
};

type ConversationForFeedback = {
  call_type?: string | null;
  goal?: string | null;
  agents?: { name?: string | null; job_title?: string | null } | null;
  products?: { name?: string | null } | null;
};

// Sortie structurée : l'API garantit un JSON conforme à ce schéma.
// Les contraintes non exprimables ici (bornes de la note, nombre d'éléments)
// sont dans les descriptions et revérifiées dans parseFeedback().
const FEEDBACK_SCHEMA = {
  type: "object",
  properties: {
    note: {
      type: "integer",
      description: "Note sur 100 de la performance commerciale, entre 0 et 100.",
    },
    points_forts: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      description: "3 à 5 points forts identifiés dans la conversation.",
    },
    axes_amelioration: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      description: "3 à 5 axes d'amélioration concrets.",
    },
    moments_cles: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      description: "2 à 3 moments clés de la conversation.",
    },
    suggestions: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      description: "3 à 5 suggestions pratiques pour améliorer les performances.",
    },
    analyse_complete: {
      type: "string",
      description: "Analyse complète en 2 à 3 paragraphes détaillés, séparés par une ligne vide.",
    },
  },
  required: [
    "note",
    "points_forts",
    "axes_amelioration",
    "moments_cles",
    "suggestions",
    "analyse_complete",
  ],
  additionalProperties: false,
};

export class FeedbackGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedbackGenerationError";
  }
}

export function buildFeedbackPrompt(
  conversation: ConversationForFeedback,
  transcript: TranscriptMessage[],
  durationSeconds: number
): string {
  return `
Analysez cette conversation commerciale et fournissez un feedback détaillé en français.

**CONTEXTE:**
- Agent: ${conversation.agents?.name} (${conversation.agents?.job_title})
- Produit: ${conversation.products?.name}
- Type d'appel: ${conversation.call_type}
- Objectif: ${conversation.goal}
- Durée: ${durationSeconds} secondes

**TRANSCRIPT:**
${transcript
  .map(
    (msg, i) =>
      `${i + 1}. ${
        msg.role === "user" || msg.source === "user"
          ? "**Commercial**"
          : "**Client**"
      }: ${msg.content || msg.message || msg.text}`
  )
  .join("\n")}

**INSTRUCTIONS:**
Fournissez un feedback structuré avec:
1. Une note sur 100 (basée sur la performance commerciale)
2. 3-5 points forts identifiés dans la conversation
3. 3-5 axes d'amélioration concrets
4. 2-3 moments clés de la conversation
5. 3-5 suggestions pratiques pour améliorer les performances
6. Une analyse complète (2-3 paragraphes détaillés)

**IMPORTANT:** Votre réponse DOIT être au format JSON valide exactement comme ceci:
{
  "note": 75,
  "points_forts": ["Point 1", "Point 2", "Point 3"],
  "axes_amelioration": ["Axe 1", "Axe 2", "Axe 3"],
  "moments_cles": ["Moment 1", "Moment 2"],
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
  "analyse_complete": "Analyse détaillée en 2-3 paragraphes..."
}`;
}

function isNonEmptyStringList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && item.trim() !== "")
  );
}

function parseFeedback(text: string): FeedbackContent {
  const data = JSON.parse(text);

  if (typeof data?.note !== "number" || !Number.isFinite(data.note)) {
    throw new FeedbackGenerationError("Note absente ou invalide dans le feedback");
  }
  for (const field of [
    "points_forts",
    "axes_amelioration",
    "moments_cles",
    "suggestions",
  ] as const) {
    if (!isNonEmptyStringList(data[field])) {
      throw new FeedbackGenerationError(`Champ "${field}" vide ou invalide dans le feedback`);
    }
  }
  if (typeof data.analyse_complete !== "string" || data.analyse_complete.trim() === "") {
    throw new FeedbackGenerationError("Analyse complète absente du feedback");
  }

  return {
    // La colonne feedback.note est contrainte entre 0 et 100.
    note: Math.min(100, Math.max(0, Math.round(data.note))),
    points_forts: data.points_forts,
    axes_amelioration: data.axes_amelioration,
    moments_cles: data.moments_cles,
    suggestions: data.suggestions,
    analyse_complete: data.analyse_complete.trim(),
  };
}

export async function generateFeedback(
  anthropic: Anthropic,
  prompt: string
): Promise<FeedbackContent> {
  for (const maxTokens of MAX_TOKENS_ATTEMPTS) {
    const response = await anthropic.messages.create({
      model: FEEDBACK_MODEL,
      max_tokens: maxTokens,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
      output_config: {
        format: { type: "json_schema", schema: FEEDBACK_SCHEMA },
      },
    });

    console.log("🤖 Feedback Claude reçu:", {
      stopReason: response.stop_reason,
      maxTokens,
      outputTokens: response.usage.output_tokens,
    });

    if (response.stop_reason === "max_tokens") {
      console.warn(`⚠️ Feedback tronqué à ${maxTokens} tokens, nouvel essai avec un budget plus large`);
      continue;
    }
    if (response.stop_reason === "refusal") {
      throw new FeedbackGenerationError("Claude a refusé de générer le feedback");
    }

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    if (!textBlock) {
      throw new FeedbackGenerationError("Réponse de Claude sans contenu texte");
    }
    return parseFeedback(textBlock.text);
  }

  throw new FeedbackGenerationError(
    `Feedback toujours tronqué avec ${MAX_TOKENS_ATTEMPTS[MAX_TOKENS_ATTEMPTS.length - 1]} tokens`
  );
}
