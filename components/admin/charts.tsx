"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";

const MOIS_FR = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

export function formatShortDate(d: Date): string {
  return `${d.getUTCDate()} ${MOIS_FR[d.getUTCMonth()]}`;
}

export function formatRelative(dateStr: string, nowTs: number): string {
  const d = new Date(dateStr);
  const diff = Math.floor((nowTs - d.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 7 * 86400) return `il y a ${Math.floor(diff / 86400)} j`;
  return formatShortDate(d);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}'${s.toString().padStart(2, "0")}`;
}

export function formatHours(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export function scoreColor(note: number): string {
  if (note >= 80) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (note >= 60) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}

export function scoreTextColor(note: number): string {
  if (note >= 80) return "text-emerald-600";
  if (note >= 60) return "text-amber-600";
  return "text-rose-600";
}

// =============================================================================
// KPI CARD
// =============================================================================

export function KpiCard({
  label,
  value,
  unit,
  delta,
  deltaPositive,
  icon,
  sparkline,
  accent = "#7403ce",
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string | null;
  deltaPositive?: boolean;
  icon?: string;
  /** Optional 6-12 numeric values to render a tiny trendline at the bottom of the card. */
  sparkline?: number[];
  accent?: string;
}) {
  return (
    <Card className="group relative overflow-hidden transition-all hover:border-[#7403ce]/30 hover:shadow-md">
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, rgba(255,187,117,.12) 0%, transparent 60%)",
        }}
      />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          {icon && <Icon icon={icon} className="size-4 text-[#7403ce]/60" />}
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-4xl font-extrabold tracking-tight leading-none">{value}</span>
          {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
        </div>
        {delta && (
          <p
            className={`mt-2 inline-flex items-center gap-1 font-mono text-[11px] font-semibold ${
              deltaPositive ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            <Icon
              icon={
                deltaPositive
                  ? "fluent:arrow-trending-24-filled"
                  : "fluent:arrow-trending-down-24-filled"
              }
              className="size-3.5"
            />
            {delta}
          </p>
        )}
        {sparkline && sparkline.length >= 2 && (
          <div className="-mx-5 -mb-5 mt-3">
            <MiniSparkline values={sparkline} accent={accent} height={28} fillOpacity={0.18} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MINI SPARKLINE — used inside cards
// =============================================================================

export function MiniSparkline({
  values,
  accent = "#7403ce",
  height = 18,
  width,
  fillOpacity = 0.25,
  showDots = false,
}: {
  values: number[];
  accent?: string;
  height?: number;
  width?: number;
  fillOpacity?: number;
  showDots?: boolean;
}) {
  if (values.length < 2) return null;
  const W = width ?? 120;
  const H = height;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const xs = values.map((_, i) => (i / (values.length - 1)) * W);
  const ys = values.map((v) => H - ((v - min) / range) * (H - 2) - 1);
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${ys[i].toFixed(2)}`).join(" ");
  const areaPath = `${path} L${W},${H} L0,${H} Z`;
  const id = `spark-${accent.replace("#", "")}-${values.length}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" preserveAspectRatio="none" height={H}>
      <defs>
        <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id}-area)`} />
      <path d={path} stroke={accent} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {showDots &&
        values.map((_, i) => (
          <circle key={i} cx={xs[i]} cy={ys[i]} r="1.5" fill={accent} />
        ))}
    </svg>
  );
}

// =============================================================================
// SCORE LINE CHART — enhanced with rolling avg + glow
// =============================================================================

export function ScoreLineChart({
  points,
  accent = "#7403ce",
  accentEnd = "#fa71ab",
  showRollingAvg = true,
}: {
  points: { x: number; y: number; date: Date }[];
  accent?: string;
  accentEnd?: string;
  showRollingAvg?: boolean;
}) {
  if (points.length < 2) {
    return (
      <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">
        Pas encore assez de données pour tracer une courbe (au moins 2 points sur 30 j).
      </div>
    );
  }
  const W = 600;
  const H = 180;
  const PAD_X = 12;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 24;
  const xs = points.map((p) => PAD_X + (p.x / 100) * (W - 2 * PAD_X));
  const ys = points.map((p) => H - PAD_BOTTOM - (p.y / 100) * (H - PAD_TOP - PAD_BOTTOM));
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const areaPath = `${path} L${xs[xs.length - 1]},${H - PAD_BOTTOM} L${xs[0]},${H - PAD_BOTTOM} Z`;

  // Rolling 7-point avg over the points array (not days — points are days-with-data)
  const window = Math.min(7, Math.max(2, Math.floor(points.length / 3)));
  const rolling = points.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = points.slice(start, i + 1);
    const avg = slice.reduce((a, p) => a + p.y, 0) / slice.length;
    return avg;
  });
  const ysRolling = rolling.map((v) => H - PAD_BOTTOM - (v / 100) * (H - PAD_TOP - PAD_BOTTOM));
  const rollingPath = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ysRolling[i]}`).join(" ");

  const gradId = `lineGrad-${accent.replace("#", "")}`;
  const areaGradId = `areaGrad-${accent.replace("#", "")}`;
  const glowId = `glow-${accent.replace("#", "")}`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[180px] w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={accent} />
            <stop offset="100%" stopColor={accentEnd} />
          </linearGradient>
          <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* gridlines */}
        {[20, 40, 60, 80].map((g) => {
          const y = H - PAD_BOTTOM - (g / 100) * (H - PAD_TOP - PAD_BOTTOM);
          return (
            <g key={g}>
              <line
                x1={PAD_X}
                x2={W - PAD_X}
                y1={y}
                y2={y}
                stroke="#ebe7ef"
                strokeWidth="0.5"
                strokeDasharray="3 4"
              />
              <text
                x={W - PAD_X}
                y={y - 2}
                textAnchor="end"
                fontSize="9"
                fontFamily="Geist Mono, monospace"
                fill="#a8a2b3"
              >
                {g}
              </text>
            </g>
          );
        })}

        {/* area */}
        <path d={areaPath} fill={`url(#${areaGradId})`} />

        {/* rolling avg (subtle) */}
        {showRollingAvg && (
          <path
            d={rollingPath}
            stroke="#bc30c4"
            strokeWidth="1"
            fill="none"
            strokeDasharray="4 3"
            opacity="0.55"
          />
        )}

        {/* main line with glow */}
        <path
          d={path}
          stroke={`url(#${gradId})`}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
        />

        {/* data points */}
        {points.map((_, i) => (
          <g key={i}>
            <circle cx={xs[i]} cy={ys[i]} r="4" fill="white" />
            <circle cx={xs[i]} cy={ys[i]} r="3" fill={accent} />
          </g>
        ))}
      </svg>
      <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>{formatShortDate(points[0].date)}</span>
        {showRollingAvg && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 bg-[#bc30c4] opacity-60" /> moyenne mobile
          </span>
        )}
        <span>auj.</span>
      </div>
    </div>
  );
}

// =============================================================================
// SKILLS RADAR
// =============================================================================

export function SkillsRadar({ skills }: { skills: { skill: string; value: number }[] }) {
  const N = skills.length;
  const SIZE = 240;
  const C = SIZE / 2;
  const R = SIZE / 2 - 36;

  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
  const point = (i: number, value: number) => {
    const r = (value / 5) * R;
    return [C + r * Math.cos(angle(i)), C + r * Math.sin(angle(i))];
  };
  const labelPoint = (i: number) => {
    const r = R + 16;
    return [C + r * Math.cos(angle(i)), C + r * Math.sin(angle(i))];
  };

  const dataPoints = skills.map((s, i) => point(i, s.value));
  const polygon = dataPoints.map(([x, y]) => `${x},${y}`).join(" ");
  const minVal = Math.min(...skills.map((s) => s.value));
  const polyStroke = minVal < 2.5 ? "#d97706" : "#7403ce";
  const polyFill = minVal < 2.5 ? "rgba(217,119,6,0.18)" : "rgba(188,48,196,0.20)";

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-[240px]" style={{ overflow: "visible" }}>
      {/* concentric pentagons */}
      {[1, 2, 3, 4, 5].map((step) => {
        const pts = skills
          .map((_, i) => point(i, step))
          .map(([x, y]) => `${x},${y}`)
          .join(" ");
        return (
          <polygon
            key={step}
            points={pts}
            fill={step === 5 ? "rgba(116,3,206,.02)" : "none"}
            stroke="#ebe7ef"
            strokeWidth="0.5"
          />
        );
      })}
      {/* radial lines */}
      {skills.map((_, i) => {
        const [x, y] = point(i, 5);
        return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="#ebe7ef" strokeWidth="0.5" />;
      })}
      {/* data shape */}
      <polygon points={polygon} fill={polyFill} stroke={polyStroke} strokeWidth="2" />
      {/* vertices */}
      {dataPoints.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4" fill="white" />
          <circle cx={x} cy={y} r="3" fill={polyStroke} />
        </g>
      ))}
      {/* labels */}
      {skills.map((s, i) => {
        const [x, y] = labelPoint(i);
        const anchor = x < C - 4 ? "end" : x > C + 4 ? "start" : "middle";
        return (
          <g key={s.skill}>
            <text
              x={x}
              y={y - 5}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize="9.5"
              fontFamily="Geist Mono, monospace"
              fill="#5a5366"
              fontWeight="600"
            >
              {s.skill}
            </text>
            <text
              x={x}
              y={y + 7}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize="10"
              fontFamily="Geist Mono, monospace"
              fill={polyStroke}
              fontWeight="700"
            >
              {s.value.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// =============================================================================
// STATUS PILL
// =============================================================================

export type StudentStatus = "fire" | "progressing" | "plateau" | "declining" | "inactive";

export function computeStudentStatus(opts: {
  trendDelta: number;
  lastActivityIso: string | null;
  totalSessions: number;
  nowTs: number;
}): StudentStatus {
  const { trendDelta, lastActivityIso, totalSessions, nowTs } = opts;
  const lastTs = lastActivityIso ? new Date(lastActivityIso).getTime() : 0;
  const daysSinceLast = lastTs ? (nowTs - lastTs) / 86400000 : Infinity;
  if (daysSinceLast > 14 || totalSessions === 0) return "inactive";
  if (trendDelta > 5) return "fire";
  if (trendDelta > 1) return "progressing";
  if (trendDelta < -1) return "declining";
  return "plateau";
}

const STATUS_META: Record<
  StudentStatus,
  { label: string; icon: string; classes: string }
> = {
  fire: {
    label: "On fire",
    icon: "fluent:fire-24-filled",
    classes: "bg-orange-100 text-orange-700 border-orange-200",
  },
  progressing: {
    label: "En progression",
    icon: "fluent:arrow-trending-24-filled",
    classes: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  plateau: {
    label: "Plateau",
    icon: "fluent:line-horizontal-1-24-filled",
    classes: "bg-slate-100 text-slate-700 border-slate-200",
  },
  declining: {
    label: "En décrochage",
    icon: "fluent:arrow-trending-down-24-filled",
    classes: "bg-rose-100 text-rose-700 border-rose-200",
  },
  inactive: {
    label: "Inactif",
    icon: "fluent:moon-24-filled",
    classes: "bg-zinc-100 text-zinc-600 border-zinc-200",
  },
};

export function StatusPill({ status }: { status: StudentStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${meta.classes}`}
    >
      <Icon icon={meta.icon} className="size-3" />
      {meta.label}
    </span>
  );
}

// =============================================================================
// SHARED ANALYSIS HELPERS
// =============================================================================

export const SKILL_KEYWORDS: Record<string, string[]> = {
  Écoute: [
    "écoute",
    "écouter",
    "comprendre",
    "reformulation",
    "reformuler",
    "attention",
    "questions ouvertes",
  ],
  Argumentation: [
    "argument",
    "argumenter",
    "valeur",
    "bénéfice",
    "présentation",
    "proposition",
    "pitch",
  ],
  Objections: [
    "objection",
    "objections",
    "réponse",
    "défendre",
    "contre",
    "résistance",
    "doute",
  ],
  Closing: [
    "closing",
    "conclure",
    "engagement",
    "décision",
    "prochaine étape",
    "signer",
    "valider",
  ],
  Relation: [
    "empathie",
    "relation",
    "confiance",
    "rapport",
    "ton",
    "chaleur",
    "courtoisie",
  ],
};

export const SKILL_ICON: Record<string, string> = {
  Écoute: "fluent:ear-24-filled",
  Argumentation: "fluent:chat-multiple-24-filled",
  Objections: "fluent:shield-24-filled",
  Closing: "fluent:checkmark-circle-24-filled",
  Relation: "fluent:heart-24-filled",
};

export function classifySkill(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return skill;
  }
  return null;
}

export const CALL_TYPE_LABEL: Record<string, string> = {
  cold_call: "Prospection",
  discovery_meeting: "Découverte",
  product_demo: "Démo produit",
  closing_call: "Closing",
  follow_up_call: "Relance",
};

export const CALL_TYPE_COLOR: Record<string, string> = {
  cold_call: "#7403ce",
  discovery_meeting: "#bc30c4",
  product_demo: "#fa71ab",
  closing_call: "#ffbb75",
  follow_up_call: "#3b026d",
};
