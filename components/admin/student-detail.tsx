"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import {
  CALL_TYPE_COLOR,
  CALL_TYPE_LABEL,
  KpiCard,
  ScoreLineChart,
  SkillsRadar,
  SKILL_ICON,
  StatusPill,
  classifySkill,
  computeStudentStatus,
  formatDuration,
  formatHours,
  formatRelative,
  scoreColor,
} from "./charts";
import { StudentAvatar } from "./student-avatar";

type Conversation = {
  id: string;
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

type Student = {
  id: string;
  email: string | null;
  firstname: string | null;
  lastname: string | null;
  picture_url?: string | null;
};

type Props = {
  student: Student;
  conversations: Conversation[];
  demoMode?: boolean;
  nowIso: string;
};

export function StudentDetail({ student, conversations, demoMode = false, nowIso }: Props) {
  const nowTs = new Date(nowIso).getTime();
  const [sessionsLimit, setSessionsLimit] = useState(20);

  const kpis = useMemo(() => {
    const withFb = conversations.filter((c) => c.feedback?.note != null);
    const avg = withFb.length
      ? withFb.reduce((a, c) => a + (c.feedback!.note ?? 0), 0) / withFb.length
      : 0;
    const totalSec = conversations.reduce((a, c) => a + (c.duration_seconds ?? 0), 0);

    const days = new Set(conversations.map((c) => c.created_at.slice(0, 10)));
    let streak = 0;
    const today = new Date(nowTs);
    for (let k = 0; k < 60; k++) {
      const d = new Date(today.getTime() - k * 86400 * 1000);
      const key = d.toISOString().slice(0, 10);
      if (days.has(key)) streak++;
      else if (k === 0) continue;
      else break;
    }

    const weekAgo = nowTs - 7 * 86400 * 1000;
    const twoWeekAgo = nowTs - 14 * 86400 * 1000;
    const last7 = withFb.filter((c) => new Date(c.created_at).getTime() >= weekAgo);
    const prev7 = withFb.filter((c) => {
      const t = new Date(c.created_at).getTime();
      return t >= twoWeekAgo && t < weekAgo;
    });
    const last7Avg = last7.length
      ? last7.reduce((a, c) => a + (c.feedback!.note ?? 0), 0) / last7.length
      : 0;
    const prev7Avg = prev7.length
      ? prev7.reduce((a, c) => a + (c.feedback!.note ?? 0), 0) / prev7.length
      : 0;
    const trend = prev7Avg > 0 ? last7Avg - prev7Avg : 0;

    return {
      avgScore: Math.round(avg),
      totalSessions: conversations.length,
      totalDurationSec: totalSec,
      totalDuration: formatHours(totalSec),
      streak,
      trend: Math.round(trend),
    };
  }, [conversations, nowTs]);

  const scoreSeries = useMemo(() => {
    const points: { x: number; y: number; date: Date }[] = [];
    const startTs = nowTs - 30 * 86400 * 1000;
    const buckets: Record<string, number[]> = {};
    conversations.forEach((c) => {
      if (c.feedback?.note == null) return;
      const t = new Date(c.created_at).getTime();
      if (t < startTs) return;
      const key = c.created_at.slice(0, 10);
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(c.feedback.note);
    });
    Object.entries(buckets)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .forEach(([key, values]) => {
        const date = new Date(key);
        const x = (date.getTime() - startTs) / (30 * 86400 * 1000);
        const y = values.reduce((a, b) => a + b, 0) / values.length;
        points.push({ x: x * 100, y, date });
      });
    return points;
  }, [conversations, nowTs]);

  const skills = useMemo(() => {
    const SKILLS = ["Écoute", "Argumentation", "Objections", "Closing", "Relation"];
    const scores: Record<string, { plus: number; minus: number }> = {};
    SKILLS.forEach((s) => (scores[s] = { plus: 0, minus: 0 }));
    let total = 0;
    conversations.forEach((c) => {
      c.feedback?.points_forts?.forEach((t) => {
        const s = classifySkill(t);
        if (s) {
          scores[s].plus += 1;
          total += 1;
        }
      });
      c.feedback?.axes_amelioration?.forEach((t) => {
        const s = classifySkill(t);
        if (s) {
          scores[s].minus += 1;
          total += 1;
        }
      });
    });
    if (total < 3) {
      return SKILLS.map((s, i) => ({ skill: s, value: [3.2, 4.1, 2.8, 3.5, 3.8][i] }));
    }
    return SKILLS.map((s) => {
      const { plus, minus } = scores[s];
      const denom = plus + minus;
      const ratio = denom === 0 ? 0.5 : plus / denom;
      const value = 1 + ratio * 4;
      return { skill: s, value: Math.round(value * 10) / 10 };
    });
  }, [conversations]);

  const topPointsForts = useMemo(() => {
    const counts: Record<string, number> = {};
    conversations.forEach((c) => {
      c.feedback?.points_forts?.forEach((t) => {
        counts[t] = (counts[t] ?? 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [conversations]);

  const topAxes = useMemo(() => {
    const counts: Record<string, number> = {};
    conversations.forEach((c) => {
      c.feedback?.axes_amelioration?.forEach((t) => {
        counts[t] = (counts[t] ?? 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [conversations]);

  const recentMoments = useMemo(() => {
    return conversations
      .slice(0, 8)
      .flatMap((c) =>
        (c.feedback?.moments_cles ?? []).map((m) => ({
          text: m,
          at: c.created_at,
          conversationId: c.id,
        }))
      )
      .slice(0, 12);
  }, [conversations]);

  const recentSuggestions = useMemo(() => {
    return conversations
      .slice(0, 5)
      .flatMap((c) =>
        (c.feedback?.suggestions ?? []).map((s) => ({
          text: s,
          at: c.created_at,
          conversationId: c.id,
        }))
      )
      .slice(0, 8);
  }, [conversations]);

  const lastAnalysis = useMemo(() => {
    const c = conversations.find((c) => c.feedback?.analyse_complete);
    return c ? { text: c.feedback!.analyse_complete!, at: c.created_at, id: c.id } : null;
  }, [conversations]);

  const distribution = useMemo(() => {
    const counts: Record<string, number> = {};
    conversations.forEach((c) => {
      const k = c.call_type ?? "autre";
      counts[k] = (counts[k] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count, label: CALL_TYPE_LABEL[type] ?? type }))
      .sort((a, b) => b.count - a.count);
  }, [conversations]);

  const dominantCallType = distribution[0] ?? null;
  const primaryStrength = topPointsForts[0] ?? null;
  const primaryAxis = topAxes[0] ?? null;
  const latestScore = conversations[0]?.feedback?.note ?? null;

  const fullName =
    `${student.firstname ?? ""} ${student.lastname ?? ""}`.trim() || student.email || "Élève";

  const status = computeStudentStatus({
    trendDelta: kpis.trend,
    lastActivityIso: conversations[0]?.created_at ?? null,
    totalSessions: kpis.totalSessions,
    nowTs,
  });

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <BackLink demoMode={demoMode} />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <StudentAvatar
              pictureUrl={student.picture_url}
              userId={student.id}
              firstname={student.firstname}
              lastname={student.lastname}
              email={student.email}
              size={14}
            />
            <h2 className="text-2xl font-bold">{fullName}</h2>
            <p className="text-sm text-muted-foreground">{student.email}</p>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Cet élève n&apos;a pas encore lancé de simulation depuis son
              compte. Les KPIs, l&apos;évolution du score et l&apos;historique
              des sessions apparaîtront ici dès la première session terminée.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <BackLink demoMode={demoMode} />

      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-[28px] border bg-card p-7"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 100% 0%, rgba(255,187,117,.20) 0%, transparent 40%), radial-gradient(circle at 0% 100%, rgba(116,3,206,.10) 0%, transparent 45%)",
          }}
        />
        <div className="relative">
          <div className="flex flex-wrap items-start gap-5">
            <StudentAvatar
              pictureUrl={student.picture_url}
              userId={student.id}
              firstname={student.firstname}
              lastname={student.lastname}
              email={student.email}
              size={20}
            />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#7403ce]">
                Fiche élève
              </p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight leading-[1.05]">
                {fullName}
              </h1>
              <p className="mt-1.5 truncate text-sm text-muted-foreground">{student.email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusPill status={status} />
                <span className="font-mono text-[11px] text-muted-foreground">
                  {kpis.totalSessions} session{kpis.totalSessions > 1 ? "s" : ""} · dernière
                  activité {formatRelative(conversations[0].created_at, nowTs)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <HeroFact
                  label="Dernière note"
                  value={latestScore != null ? `${latestScore}/100` : "—"}
                />
                <HeroFact
                  label="Variation 7 j"
                  value={
                    kpis.trend === 0
                      ? "stable"
                      : `${kpis.trend > 0 ? "+" : ""}${kpis.trend} pts`
                  }
                />
                <HeroFact
                  label="Type dominant"
                  value={
                    dominantCallType
                      ? `${dominantCallType.label} · ${dominantCallType.count}`
                      : "—"
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Score moyen"
          value={kpis.avgScore.toString()}
          unit="/100"
          delta={kpis.trend !== 0 ? `${kpis.trend > 0 ? "+" : ""}${kpis.trend} pts / 7j` : null}
          deltaPositive={kpis.trend >= 0}
          icon="fluent:trophy-24-filled"
        />
        <KpiCard label="Sessions" value={kpis.totalSessions.toString()} icon="fluent:headset-24-filled" />
        <KpiCard label="Temps cumulé" value={kpis.totalDuration} icon="fluent:clock-24-filled" />
        <KpiCard label="Série en cours" value={`${kpis.streak} j`} icon="fluent:fire-24-filled" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SummaryCard
          icon="fluent:star-24-filled"
          title="Point fort dominant"
          value={primaryStrength?.[0] ?? "Pas encore assez de matière"}
          hint={
            primaryStrength
              ? `Revient ${primaryStrength[1]} fois dans les retours IA`
              : "Les synthèses IA apparaîtront ici"
          }
          accent="emerald"
        />
        <SummaryCard
          icon="fluent:target-arrow-24-filled"
          title="Priorité coaching"
          value={primaryAxis?.[0] ?? "Aucun axe prioritaire détecté"}
          hint={
            primaryAxis
              ? `Revient ${primaryAxis[1]} fois dans les axes d'amélioration`
              : "Le suivi coaching s’enrichira avec plus de sessions"
          }
          accent="amber"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon icon="fluent:chart-multiple-24-filled" className="size-4 text-[#7403ce]" />
                Évolution du score
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">30 derniers jours · note /100</p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {scoreSeries.length} points
            </span>
          </CardHeader>
          <CardContent>
            <ScoreLineChart points={scoreSeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon icon="fluent:target-24-filled" className="size-4 text-[#7403ce]" />
              Compétences
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">5 axes · agrégés depuis l&apos;IA</p>
          </CardHeader>
          <CardContent className="flex justify-center">
            <SkillsRadar skills={skills} />
          </CardContent>
        </Card>
      </div>

      {/* Points forts + axes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon icon="fluent:star-24-filled" className="size-4 text-emerald-500" />
              Points forts récurrents
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ce que cet élève réussit le plus souvent
            </p>
          </CardHeader>
          <CardContent>
            {topPointsForts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Pas encore de points forts agrégés.
              </p>
            ) : (
              <ul className="space-y-2">
                {topPointsForts.map(([text, count], idx) => {
                  const skill = classifySkill(text);
                  const icon = skill ? SKILL_ICON[skill] : "fluent:star-24-filled";
                  return (
                    <motion.li
                      key={text}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-transparent p-3"
                    >
                      <Icon icon={icon} className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                      <p className="flex-1 text-sm leading-snug">{text}</p>
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 font-mono text-[11px] font-bold text-white shadow-sm">
                        {count}
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon icon="fluent:target-arrow-24-filled" className="size-4 text-amber-500" />
              Axes d&apos;amélioration prioritaires
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">À travailler en coaching</p>
          </CardHeader>
          <CardContent>
            {topAxes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Pas encore d&apos;axes identifiés par l&apos;IA.
              </p>
            ) : (
              <ul className="space-y-2">
                {topAxes.map(([text, count], idx) => {
                  const skill = classifySkill(text);
                  const icon = skill ? SKILL_ICON[skill] : "fluent:target-arrow-24-filled";
                  return (
                    <motion.li
                      key={text}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      className="flex items-start gap-3 rounded-lg border border-amber-100 bg-gradient-to-br from-amber-50/60 to-transparent p-3"
                    >
                      <Icon icon={icon} className="mt-0.5 size-5 shrink-0 text-amber-600" />
                      <p className="flex-1 text-sm leading-snug">{text}</p>
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 font-mono text-[11px] font-bold text-white shadow-sm">
                        {count}
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coaching panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon icon="fluent:bookmark-24-filled" className="size-4 text-[#7403ce]" />
              Moments clés récents
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Identifiés par l&apos;IA</p>
          </CardHeader>
          <CardContent>
            {recentMoments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Pas de moments clés pour les sessions récentes.
              </p>
            ) : (
              <ul className="space-y-3">
                {recentMoments.map((m, i) => (
                  <li
                    key={i}
                    className="relative border-l-2 border-[#7403ce]/30 pl-4 hover:border-[#7403ce]"
                  >
                    <div className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-[#7403ce]" />
                    <p className="text-sm leading-snug">{m.text}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {formatRelative(m.at, nowTs)} ·{" "}
                      <Link
                        href={`/conversations/${m.conversationId}`}
                        className="text-[#7403ce] hover:underline"
                      >
                        voir la session →
                      </Link>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon icon="fluent:lightbulb-24-filled" className="size-4 text-[#ffbb75]" />
              Suggestions de coaching
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Pistes données par l&apos;IA</p>
          </CardHeader>
          <CardContent>
            {recentSuggestions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Pas de suggestions disponibles.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {recentSuggestions.map((s, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-purple-100 bg-gradient-to-br from-purple-50/40 to-transparent p-3"
                  >
                    <div className="flex items-start gap-2">
                      <Icon
                        icon="fluent:sparkle-24-filled"
                        className="mt-0.5 size-4 shrink-0 text-[#7403ce]"
                      />
                      <p className="flex-1 text-sm leading-snug">{s.text}</p>
                    </div>
                    <p className="mt-1.5 pl-6 font-mono text-[10px] text-muted-foreground">
                      {formatRelative(s.at, nowTs)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last analysis */}
      {lastAnalysis && (
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#ffbb75] via-[#fa71ab] to-[#7403ce]" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon
                icon="fluent:document-bullet-list-24-filled"
                className="size-4 text-[#7403ce]"
              />
              Analyse complète — dernière session
            </CardTitle>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {formatRelative(lastAnalysis.at, nowTs)}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-[15px] leading-relaxed text-foreground/85">{lastAnalysis.text}</p>
            <Link
              href={`/conversations/${lastAnalysis.id}`}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#7403ce]/5 px-3 py-1.5 text-xs font-semibold text-[#7403ce] transition-colors hover:bg-[#7403ce]/10"
            >
              Ouvrir la session
              <Icon icon="fluent:arrow-right-24-regular" className="size-3.5" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Distribution + sessions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition par type d&apos;appel</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{kpis.totalSessions} sessions</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {distribution.map((it) => {
                const pct = kpis.totalSessions
                  ? Math.round((it.count / kpis.totalSessions) * 100)
                  : 0;
                const color = CALL_TYPE_COLOR[it.type] ?? "#7403ce";
                return (
                  <li key={it.type}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-sm" style={{ background: color }} />
                        {it.label}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {it.count} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Toutes les sessions</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {conversations.length} simulation{conversations.length > 1 ? "s" : ""}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b">
                    <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Date
                    </th>
                    <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Persona
                    </th>
                    <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Durée
                    </th>
                    <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Note
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {conversations.slice(0, sessionsLimit).map((c) => (
                    <tr
                      key={c.id}
                      className="group border-b transition-all last:border-0 hover:bg-gradient-to-r hover:from-[#7403ce]/5 hover:to-transparent"
                    >
                      <td className="border-l-2 border-transparent px-4 py-2.5 text-muted-foreground group-hover:border-[#7403ce]">
                        {formatRelative(c.created_at, nowTs)}
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {c.agents?.name ??
                          `${c.agents?.firstname ?? ""} ${c.agents?.lastname ?? ""}`.trim() ??
                          "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {c.call_type ? CALL_TYPE_LABEL[c.call_type] ?? c.call_type : "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {c.duration_seconds ? formatDuration(c.duration_seconds) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {c.feedback?.note != null ? (
                          <Badge
                            variant="outline"
                            className={`font-mono ${scoreColor(c.feedback.note)}`}
                          >
                            {c.feedback.note}/100
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">en attente</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/conversations/${c.id}`}
                          className="text-[#7403ce] hover:underline"
                        >
                          <Icon icon="fluent:open-24-regular" className="inline size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {conversations.length > sessionsLimit && (
              <div className="mt-3 flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSessionsLimit((n) => n + 20)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-[#7403ce]/40 hover:bg-[#7403ce]/5 hover:text-[#7403ce]"
                >
                  <Icon icon="fluent:chevron-down-24-regular" className="size-3.5" />
                  Voir {Math.min(20, conversations.length - sessionsLimit)} sessions plus anciennes
                </button>
                <p className="text-[11px] text-muted-foreground">
                  {sessionsLimit} sur {conversations.length} sessions affichées
                </p>
              </div>
            )}
            {sessionsLimit > 20 && conversations.length <= sessionsLimit && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setSessionsLimit(20)}
                  className="text-xs text-muted-foreground hover:text-[#7403ce]"
                >
                  Réduire la liste
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BackLink({ demoMode }: { demoMode: boolean }) {
  return (
    <Link
      href={`/admin${demoMode ? "?demo=1" : ""}`}
      className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Icon icon="fluent:arrow-left-24-regular" className="size-4" />
      Retour à la liste des élèves
    </Link>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  hint,
  accent,
}: {
  icon: string;
  title: string;
  value: string;
  hint: string;
  accent: "emerald" | "amber" | "violet";
}) {
  const accentClasses = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    violet: "bg-[#7403ce]/7 text-[#7403ce] border-[#7403ce]/10",
  };

  return (
    <Card className="py-0">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={`rounded-2xl border p-3 ${accentClasses[accent]}`}>
            <Icon icon={icon} className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {title}
            </p>
            <p className="mt-2 text-[15px] font-semibold leading-6 text-foreground">{value}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{hint}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeroFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-white/70 bg-white/80 px-3 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <span className="ml-2 text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
