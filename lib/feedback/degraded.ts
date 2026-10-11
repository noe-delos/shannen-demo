// Avant le correctif de l'issue #29, un feedback qui n'avait pas pu être généré
// était quand même enregistré avec une note fixe de 70 et un texte générique.
// Ces feedbacks n'ont aucune valeur pédagogique : on les repère pour proposer
// de les régénérer. Module sans dépendance serveur, utilisable côté client.

const LEGACY_FALLBACK_NOTE = 70;
const LEGACY_FALLBACK_POINTS_FORTS = [
  "Feedback généré avec succès", // JSON de Claude illisible (réponse tronquée)
  "Conversation complétée", // erreur lors de l'appel à Claude
];

type FeedbackLike = {
  note?: number | null;
  points_forts?: string[] | null;
};

export function isDegradedFeedback(feedback: FeedbackLike | null | undefined): boolean {
  const pointsForts = feedback?.points_forts;
  return (
    feedback?.note === LEGACY_FALLBACK_NOTE &&
    Array.isArray(pointsForts) &&
    pointsForts.length === 1 &&
    LEGACY_FALLBACK_POINTS_FORTS.includes(pointsForts[0])
  );
}
