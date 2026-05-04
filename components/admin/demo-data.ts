// Deterministic demo data for the admin dashboard. All references use a fixed
// timestamp so SSR and CSR produce identical output (no hydration mismatch).

export type DemoConversation = {
  id: string;
  user_id: string;
  call_type: string | null;
  duration_seconds: number | null;
  created_at: string;
  agents: {
    name: string | null;
    firstname: string | null;
    lastname: string | null;
    job_title: string | null;
  } | null;
  feedback: {
    note: number | null;
    points_forts: string[] | null;
    axes_amelioration: string[] | null;
    moments_cles: string[] | null;
    suggestions: string[] | null;
    analyse_complete: string | null;
  } | null;
};

export type DemoStudent = {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  picture_url: string | null;
};

export const REFERENCE_DATE_ISO = "2026-05-04T12:00:00.000Z";

const PERSONAS = [
  { name: "CEO Pressé", firstname: "Marc", lastname: "Dubois", job_title: "Directeur Général" },
  { name: "Directrice Analytique", firstname: "Sophie", lastname: "Martin", job_title: "Directrice Marketing" },
  { name: "DSI Prudent", firstname: "Pierre", lastname: "Moreau", job_title: "DSI" },
  { name: "Manager Enthousiaste", firstname: "Julie", lastname: "Leblanc", job_title: "Resp. Commercial" },
  { name: "Startup Founder", firstname: "Thomas", lastname: "Rousseau", job_title: "Fondateur" },
];

const TYPES = ["cold_call", "discovery_meeting", "product_demo", "closing_call", "follow_up_call"];

const POINTS_FORTS_SAMPLES = [
  "Bonne écoute active des objections du prospect",
  "Argumentation claire et structurée sur les bénéfices",
  "Reformulation pertinente des besoins exprimés",
  "Très bon ton, chaleureux et professionnel",
  "Présentation produit fluide et convaincante",
  "Empathie et création d'un climat de confiance",
  "Gestion des objections sur le prix très efficace",
  "Closing engagé avec proposition de prochaine étape claire",
  "Questions ouvertes pertinentes en phase de découverte",
  "Bonne maîtrise du vocabulaire métier du prospect",
  "Relance habile sans paraître insistant",
  "Conclusion avec engagement clair sur les prochaines étapes",
];

const AXES_SAMPLES = [
  "Travailler la gestion des objections sur le timing",
  "Être plus direct sur la proposition de closing",
  "Approfondir la phase de découverte avant l'argumentation",
  "Mieux gérer les objections sur le ROI",
  "Améliorer l'écoute active et la reformulation",
  "Renforcer la relation client en début d'appel",
  "Préparer mieux la réponse aux objections sur le prix",
  "Conclure avec un engagement plus ferme",
  "Poser plus de questions ouvertes en début d'appel",
  "Éviter de couper la parole pendant les objections",
];

const MOMENTS_CLES_SAMPLES = [
  "À 3'45 — bonne reformulation de l'objection sur le budget",
  "À 7'12 — moment où le prospect a basculé sur l'aspect ROI",
  "À 11'30 — argumentation sur les bénéfices très convaincante",
  "À 5'08 — léger flottement sur la question des intégrations",
  "À 9'22 — bonne relance après une objection sur le timing",
  "À 13'45 — closing engagé avec une question ouverte parfaite",
  "À 2'30 — accroche initiale qui a capté l'attention",
  "À 16'10 — proposition de prochaine étape claire et acceptée",
];

const SUGGESTIONS_SAMPLES = [
  "Lors de la prochaine simulation, essaie de reformuler 2 fois minimum avant de proposer une réponse à l'objection.",
  "Travaille un script de closing avec 3 variantes selon le profil du prospect.",
  "Prépare une bibliothèque de cas clients pour appuyer ton argumentation chiffres à l'appui.",
  "Entraîne-toi sur les objections prix avec un persona de type DSI prudent.",
  "Le ton est bon, continue dans cette direction. Travaille maintenant la structure du discours.",
];

const ANALYSES_COMPLETES = [
  "Belle simulation maîtrisée, le commercial a su installer un climat de confiance dès les premières minutes. Le prospect (CEO pressé) est exigeant mais l'argumentation a tenu. Reste à travailler la gestion fine des objections de timing — c'est là que le closing s'est fait attendre.",
  "Bon début de session avec une accroche claire. La phase de découverte est encore un peu courte : poser deux questions ouvertes supplémentaires aurait permis de mieux qualifier le besoin. L'argumentation est solide mais le closing manque d'un appel à l'action explicite.",
  "Excellente performance. La reformulation des objections est devenue naturelle, le ton est juste, et le commercial a su rebondir sur les signaux d'achat. Continue exactement dans cette direction — c'est l'archétype d'une session réussie.",
  "Session avec une marge de progression claire sur la gestion des objections prix. Le commercial bascule trop vite vers la justification au lieu de creuser la véritable préoccupation. À retravailler avec le persona DSI Prudent.",
  "Très belle progression par rapport aux sessions précédentes. La maîtrise du vocabulaire métier s'améliore et l'écoute active est plus présente. Prochaine étape : travailler le closing avec engagement ferme.",
];

const STUDENTS: Array<{
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  // 24 scores spread over 30 days, lower or higher to vary the level
  scoreCurve: number[];
  trendBias: "up" | "down" | "flat";
}> = [
  {
    id: "demo-stu-1",
    email: "sarah.k@neocell.demo",
    firstname: "Sarah",
    lastname: "Kanter",
    scoreCurve: [62, 65, 68, 64, 70, 72, 75, 73, 78, 80, 78, 82, 85, 83, 86, 88],
    trendBias: "up",
  },
  {
    id: "demo-stu-2",
    email: "lucas.b@neocell.demo",
    firstname: "Lucas",
    lastname: "Beaumont",
    scoreCurve: [55, 58, 62, 60, 65, 68, 66, 70, 72, 70, 74, 76, 75, 78, 80, 82],
    trendBias: "up",
  },
  {
    id: "demo-stu-3",
    email: "alex.d@neocell.demo",
    firstname: "Alex",
    lastname: "Diallo",
    scoreCurve: [70, 68, 66, 65, 62, 60, 58, 60, 56, 54, 58, 55, 52, 56, 53, 50],
    trendBias: "down",
  },
  {
    id: "demo-stu-4",
    email: "marie.c@neocell.demo",
    firstname: "Marie",
    lastname: "Cachat",
    scoreCurve: [60, 62, 65, 63, 66, 68, 65, 70, 72, 68, 71, 74, 72, 75, 73, 76],
    trendBias: "up",
  },
  {
    id: "demo-stu-5",
    email: "julien.r@neocell.demo",
    firstname: "Julien",
    lastname: "Reynaud",
    scoreCurve: [75, 72, 76, 74, 78, 73, 77, 76, 75, 78, 76, 79, 77, 80, 78, 81],
    trendBias: "flat",
  },
  {
    id: "demo-stu-6",
    email: "emma.t@neocell.demo",
    firstname: "Emma",
    lastname: "Tessier",
    scoreCurve: [50, 53, 56, 58, 60, 63, 66, 64, 68, 70, 72, 74, 73, 76, 78, 81],
    trendBias: "up",
  },
];

function pickDeterministic<T>(arr: T[], n: number, seed: number): T[] {
  const take = Math.min(n, arr.length);
  const out: T[] = [];
  for (let k = 0; k < take; k++) {
    out.push(arr[(seed * 7 + k * 3) % arr.length]);
  }
  return out;
}

function pickOne<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export function getDemoStudents(): DemoStudent[] {
  return STUDENTS.map((s) => ({
    id: s.id,
    email: s.email,
    firstname: s.firstname,
    lastname: s.lastname,
    picture_url: null,
  }));
}

export function getDemoConversationsAll(): DemoConversation[] {
  const out: DemoConversation[] = [];
  const now = new Date(REFERENCE_DATE_ISO).getTime();
  const day = 86400 * 1000;

  STUDENTS.forEach((stu, sIdx) => {
    stu.scoreCurve.forEach((note, idx) => {
      const daysAgo = Math.max(0, 28 - Math.floor(idx * 1.6));
      const persona = PERSONAS[(idx + sIdx) % PERSONAS.length];
      const type = TYPES[(idx + sIdx * 2) % TYPES.length];
      const seed = sIdx * 100 + idx + 1;
      out.push({
        id: `demo-${stu.id}-${idx}`,
        user_id: stu.id,
        call_type: type,
        duration_seconds: 480 + ((seed * 173) % 700),
        created_at: new Date(now - daysAgo * day - (sIdx * 47 + idx * 31) * 60 * 1000).toISOString(),
        agents: persona,
        feedback: {
          note,
          points_forts: pickDeterministic(POINTS_FORTS_SAMPLES, 2 + (idx % 3), seed),
          axes_amelioration: pickDeterministic(AXES_SAMPLES, 2 + ((idx + 1) % 3), seed + 17),
          moments_cles: pickDeterministic(MOMENTS_CLES_SAMPLES, 2 + (idx % 2), seed + 31),
          suggestions: pickDeterministic(SUGGESTIONS_SAMPLES, 1 + (idx % 2), seed + 43),
          analyse_complete: pickOne(ANALYSES_COMPLETES, seed + 7),
        },
      });
    });
  });

  return out.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function getDemoConversationsForStudent(studentId: string): DemoConversation[] {
  return getDemoConversationsAll().filter((c) => c.user_id === studentId);
}

// Backwards-compat alias used by the previous single-user dashboard.
export function getDemoConversations(): DemoConversation[] {
  return getDemoConversationsAll();
}
