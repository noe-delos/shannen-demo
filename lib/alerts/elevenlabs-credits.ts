// Surveillance des crédits ElevenLabs. Sans crédits, aucune simulation ne peut
// démarrer (panne du 08/10/2026, #32). Chaque seuil franchi déclenche un email,
// une seule fois par seuil et par cycle de facturation.

const ELEVENLABS_API = "https://api.elevenlabs.io";
const RESEND_API = "https://api.resend.com/emails";
const SUBSCRIPTION_URL = "https://elevenlabs.io/app/subscription";

// La tâche tourne toutes les heures ; la fenêtre couvre deux heures pour ne
// rater aucun franchissement. Les doublons sont écartés par la clé
// d'idempotence de l'email.
const WINDOW_HOURS = 2;

type Snapshot = {
  used: number; // crédits consommés sur le cycle en cours
  included: number; // crédits inclus dans l'abonnement
  cap: number; // plafond : inclus + dépassement autorisé (au-delà, blocage)
  resetAt: Date; // prochaine remise à zéro
  tier: string;
};

type SubscriptionResponse = {
  character_count: number;
  character_limit: number;
  can_extend_character_limit?: boolean;
  max_credit_limit_extension?: number;
  next_character_count_reset_unix: number;
  tier: string;
};

type UsageStatsResponse = { usage?: Record<string, number[]> };

type Level = {
  id: string;
  threshold: (s: Snapshot) => number;
  subject: string;
  summary: (s: Snapshot) => string;
};

const formatNumber = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n));
const formatDate = (d: Date) =>
  d.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "full",
    timeStyle: "short",
  });

// Du moins grave au plus grave. Si plusieurs seuils sont franchis d'un coup,
// seul le plus grave est envoyé.
const LEVELS: Level[] = [
  {
    id: "inclus-80",
    threshold: (s) => 0.8 * s.included,
    subject: "⚠️ Hello Michel : 80 % des crédits ElevenLabs inclus consommés",
    summary: (s) =>
      `80 % des ${formatNumber(s.included)} crédits inclus dans l'abonnement ElevenLabs sont consommés.`,
  },
  {
    id: "inclus-100",
    threshold: (s) => s.included,
    subject: "💶 Hello Michel : crédits ElevenLabs inclus épuisés",
    summary: (s) =>
      `Les ${formatNumber(s.included)} crédits inclus sont épuisés. La suite est facturée en dépassement par ElevenLabs, jusqu'au plafond de ${formatNumber(s.cap)} crédits. Au-delà, les simulations sont bloquées.`,
  },
  {
    id: "plafond-90",
    threshold: (s) => 0.9 * s.cap,
    subject: "🟠 Hello Michel : blocage imminent, 90 % du plafond de crédits",
    summary: (s) =>
      `90 % du plafond de ${formatNumber(s.cap)} crédits est atteint. Une fois le plafond atteint, plus aucune simulation ne pourra démarrer.`,
  },
  {
    id: "plafond-100",
    threshold: (s) => s.cap,
    subject: "🔴 Hello Michel est bloqué : plus de crédits ElevenLabs",
    summary: (s) =>
      `Le plafond de ${formatNumber(s.cap)} crédits est atteint : aucune simulation ne peut démarrer.`,
  },
];

async function elevenlabs<T>(path: string): Promise<T> {
  const response = await fetch(`${ELEVENLABS_API}${path}`, {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`ElevenLabs ${path} → ${response.status}`);
  }
  return response.json();
}

async function fetchSnapshot(): Promise<Snapshot> {
  const sub = await elevenlabs<SubscriptionResponse>("/v1/user/subscription");
  const extension = sub.can_extend_character_limit
    ? sub.max_credit_limit_extension ?? 0
    : 0;
  return {
    used: sub.character_count,
    included: sub.character_limit,
    cap: sub.character_limit + extension,
    resetAt: new Date(sub.next_character_count_reset_unix * 1000),
    tier: sub.tier,
  };
}

// Crédits consommés depuis le début de l'heure, WINDOW_HOURS heures plus tôt.
async function fetchRecentUsage(now: Date): Promise<number> {
  const start = new Date(now);
  start.setUTCMinutes(0, 0, 0);
  start.setUTCHours(start.getUTCHours() - WINDOW_HOURS);
  const stats = await elevenlabs<UsageStatsResponse>(
    `/v1/usage/character-stats?start_unix=${start.getTime()}&end_unix=${now.getTime()}&aggregation_interval=hour`
  );
  return Object.values(stats.usage ?? {})
    .flat()
    .reduce((sum, value) => sum + (value || 0), 0);
}

export function crossedLevel(
  previouslyUsed: number,
  snapshot: Snapshot
): Level | null {
  const crossed = LEVELS.filter((level) => {
    const threshold = level.threshold(snapshot);
    return previouslyUsed < threshold && snapshot.used >= threshold;
  });
  return crossed[crossed.length - 1] ?? null;
}

function forecast(snapshot: Snapshot, now: Date): string {
  const cycleStart = new Date(snapshot.resetAt);
  cycleStart.setUTCMonth(cycleStart.getUTCMonth() - 1);
  const elapsedDays = Math.max((now.getTime() - cycleStart.getTime()) / 86_400_000, 1 / 24);
  const perDay = snapshot.used / elapsedDays;
  if (snapshot.used >= snapshot.cap) {
    return `Rythme moyen sur le cycle : ${formatNumber(perDay)} crédits par jour.`;
  }
  const capAt = new Date(now.getTime() + ((snapshot.cap - snapshot.used) / perDay) * 86_400_000);
  return capAt < snapshot.resetAt
    ? `Au rythme moyen du cycle (${formatNumber(perDay)} crédits par jour), le plafond sera atteint vers le ${formatDate(capAt)}, avant la remise à zéro.`
    : `Au rythme moyen du cycle (${formatNumber(perDay)} crédits par jour), le plafond ne devrait pas être atteint avant la remise à zéro.`;
}

function buildEmail(intro: string, snapshot: Snapshot, now: Date) {
  const lines = [
    intro,
    "",
    `Consommation du cycle : ${formatNumber(snapshot.used)} crédits (${formatNumber(snapshot.included)} inclus, plafond ${formatNumber(snapshot.cap)}, plan ${snapshot.tier}).`,
    `Remise à zéro automatique : ${formatDate(snapshot.resetAt)}.`,
    forecast(snapshot, now),
    "",
    snapshot.used >= snapshot.cap
      ? `Pour rétablir le service avant la remise à zéro, passer au plan supérieur : ${SUBSCRIPTION_URL}`
      : `Pour éviter un blocage, passer au plan supérieur : ${SUBSCRIPTION_URL}`,
    "",
    "Alerte automatique Hello Michel.",
  ];
  const text = lines.join("\n");
  const html = lines
    .map((line) =>
      line === ""
        ? ""
        : `<p style="margin:0 0 8px">${line
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(SUBSCRIPTION_URL, `<a href="${SUBSCRIPTION_URL}">${SUBSCRIPTION_URL}</a>`)}</p>`
    )
    .join("\n");
  return { text, html };
}

async function sendEmail(
  subject: string,
  body: { text: string; html: string },
  idempotencyKey: string
): Promise<"sent" | "duplicate"> {
  const response = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: process.env.ALERT_EMAIL_FROM,
      to: process.env.ALERT_EMAIL_TO!.split(",").map((email) => email.trim()),
      subject,
      ...body,
    }),
  });
  // 409 : même clé d'idempotence déjà utilisée, l'alerte est déjà partie.
  if (response.status === 409) return "duplicate";
  if (!response.ok) {
    throw new Error(`Resend → ${response.status} ${await response.text()}`);
  }
  return "sent";
}

export async function checkElevenLabsCredits({ test = false } = {}) {
  if (!process.env.RESEND_API_KEY || !process.env.ALERT_EMAIL_FROM || !process.env.ALERT_EMAIL_TO) {
    console.warn("⚠️ Alerte crédits ElevenLabs : envoi d'email non configuré");
    return { status: "not_configured" as const };
  }

  const now = new Date();
  const snapshot = await fetchSnapshot();

  if (test) {
    const body = buildEmail(
      "Email de test : l'alerte sur les crédits ElevenLabs de Hello Michel est en place. Vous serez prévenu(e) à 80 % des crédits inclus, à leur épuisement, à 90 % du plafond et en cas de blocage.",
      snapshot,
      now
    );
    const result = await sendEmail(
      "✅ Hello Michel : alerte crédits ElevenLabs activée",
      body,
      `elevenlabs-credits/test/${now.toISOString()}`
    );
    return { status: result, test: true, used: snapshot.used, cap: snapshot.cap };
  }

  const recentUsage = await fetchRecentUsage(now);
  const level = crossedLevel(Math.max(0, snapshot.used - recentUsage), snapshot);
  console.log("🔎 Crédits ElevenLabs:", {
    used: snapshot.used,
    included: snapshot.included,
    cap: snapshot.cap,
    recentUsage,
    level: level?.id ?? null,
  });

  if (!level) {
    return { status: "ok" as const, used: snapshot.used, cap: snapshot.cap };
  }

  const result = await sendEmail(
    level.subject,
    buildEmail(level.summary(snapshot), snapshot, now),
    `elevenlabs-credits/${snapshot.resetAt.getTime()}/${level.id}`
  );
  console.log(`📧 Alerte crédits ElevenLabs "${level.id}":`, result);
  return { status: result, level: level.id, used: snapshot.used, cap: snapshot.cap };
}
