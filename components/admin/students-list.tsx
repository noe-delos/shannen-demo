"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MiniSparkline,
  StatusPill,
  computeStudentStatus,
  formatHours,
  formatRelative,
  scoreColor,
  type StudentStatus,
} from "./charts";
import { StudentAvatar } from "./student-avatar";

export type StudentRow = {
  id: string;
  email: string | null;
  firstname: string | null;
  lastname: string | null;
  picture_url: string | null;
  totalSessions: number;
  totalDurationSeconds: number;
  avgScore: number;
  trendDelta: number;
  lastActivityIso: string | null;
  recentScores?: number[];
};

type Props = {
  students: StudentRow[];
  totals: {
    studentsCount: number;
    totalSessions: number;
    teamAvgScore: number;
    sessionsThisWeek: number;
    teamScoreSparkline?: number[];
  };
  demoMode?: boolean;
  nowIso: string;
};

type SortKey = "score" | "sessions" | "activity" | "name";

type StudentAnalytics = StudentRow & {
  status: StudentStatus;
  lastActivityDays: number | null;
  lastScore: number | null;
};

export function StudentsList({ students, totals, demoMode = false, nowIso }: Props) {
  const nowTs = new Date(nowIso).getTime();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("score");

  const analytics = useMemo<StudentAnalytics[]>(() => {
    return students.map((student) => {
      const status = computeStudentStatus({
        trendDelta: student.trendDelta,
        lastActivityIso: student.lastActivityIso,
        totalSessions: student.totalSessions,
        nowTs,
      });

      return {
        ...student,
        status,
        lastActivityDays: student.lastActivityIso
          ? Math.floor((nowTs - new Date(student.lastActivityIso).getTime()) / 86400000)
          : null,
        lastScore:
          student.recentScores && student.recentScores.length > 0
            ? student.recentScores[student.recentScores.length - 1]
            : null,
      };
    });
  }, [nowTs, students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = analytics;

    if (q) {
      rows = rows.filter((student) => {
        const name = `${student.firstname ?? ""} ${student.lastname ?? ""}`.toLowerCase();
        return name.includes(q) || (student.email ?? "").toLowerCase().includes(q);
      });
    }

    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case "score":
          return b.avgScore - a.avgScore;
        case "sessions":
          return b.totalSessions - a.totalSessions;
        case "activity": {
          const ta = a.lastActivityIso ? new Date(a.lastActivityIso).getTime() : 0;
          const tb = b.lastActivityIso ? new Date(b.lastActivityIso).getTime() : 0;
          return tb - ta;
        }
        case "name":
          return getFullName(a).localeCompare(getFullName(b));
      }
    });
  }, [analytics, search, sortKey]);

  const summary = useMemo(() => {
    const active7d = analytics.filter(
      (student) => student.lastActivityDays !== null && student.lastActivityDays <= 7
    ).length;
    const inactive14d = analytics.filter(
      (student) => student.lastActivityDays === null || student.lastActivityDays > 14
    ).length;
    const lowScore = analytics.filter((student) => Math.round(student.avgScore) < 60).length;
    const highScore = analytics.filter((student) => Math.round(student.avgScore) >= 80).length;
    const avgSessions = analytics.length ? totals.totalSessions / analytics.length : 0;

    const momentum = [...analytics]
      .filter((student) => student.trendDelta > 0)
      .sort((a, b) => b.trendDelta - a.trendDelta)
      .slice(0, 2);

    const priority = [...analytics]
      .filter(
        (student) =>
          student.status === "inactive" ||
          student.status === "declining" ||
          Math.round(student.avgScore) < 60
      )
      .sort((a, b) => getPriorityWeight(b) - getPriorityWeight(a))
      .slice(0, 2);

    return {
      active7d,
      inactive14d,
      lowScore,
      highScore,
      avgSessions,
      momentum,
      priority,
    };
  }, [analytics, totals.totalSessions]);

  if (students.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <Card className="max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-4 p-10">
            <div className="rounded-full bg-gradient-to-br from-[#ffbb75] via-[#fa71ab] to-[#7403ce] p-4 text-white">
              <Icon icon="fluent:people-24-filled" className="size-8" />
            </div>
            <h2 className="mb-1 text-xl font-bold">Aucun élève actif</h2>
            <p className="text-sm text-muted-foreground">
              Les statistiques apparaîtront ici dès les premières simulations.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <section className="rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                Suivi élèves
              </h1>
              <Badge
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]",
                  demoMode
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                )}
              >
                {demoMode ? "démo" : "live"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {totals.studentsCount} élèves · {totals.totalSessions} simulations · {Math.round(
                totals.teamAvgScore
              )}
              /100
            </p>
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-2 md:grid-cols-5">
            <TopMetric label="Actifs 7 j" value={summary.active7d.toString()} />
            <TopMetric label="Inactifs 14 j+" value={summary.inactive14d.toString()} tone="amber" />
            <TopMetric label="Score < 60" value={summary.lowScore.toString()} tone="rose" />
            <TopMetric label="Score ≥ 80" value={summary.highScore.toString()} tone="emerald" />
            <TopMetric
              label="Sessions / élève"
              value={summary.avgSessions.toFixed(1)}
              className="col-span-2 md:col-span-1"
            />
          </div>
        </div>

        <div className="grid gap-2 px-5 py-3 md:grid-cols-2">
          <CompactPanel
            title="Meilleure dynamique"
            icon="fluent:arrow-trending-24-filled"
            tone="emerald"
            rows={summary.momentum.map((student) => ({
              id: student.id,
              name: getFullName(student),
              right: `+${Math.round(student.trendDelta)} pts`,
              meta: `${Math.round(student.avgScore)}/100`,
            }))}
            emptyLabel="Aucune progression nette."
          />
          <CompactPanel
            title="À traiter"
            icon="fluent:alert-24-filled"
            tone="amber"
            rows={summary.priority.map((student) => ({
              id: student.id,
              name: getFullName(student),
              right: getPriorityBadge(student),
              meta: getPriorityReason(student),
            }))}
            emptyLabel="Aucun signal faible."
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Icon
            icon="fluent:search-24-regular"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="h-9 border-slate-200 bg-white pl-9 shadow-none"
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {(
            [
              ["score", "Score"],
              ["sessions", "Sessions"],
              ["activity", "Activité"],
              ["name", "Nom"],
            ] as [SortKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                sortKey === key ? "bg-slate-950 text-white" : "text-slate-500 hover:text-slate-950"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((student, index) => (
          <motion.div
            key={student.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(index * 0.015, 0.18) }}
          >
            <StudentCard student={student} demoMode={demoMode} nowTs={nowTs} />
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucun élève ne correspond à ta recherche.
        </p>
      )}
    </div>
  );
}

function StudentCard({
  student,
  demoMode,
  nowTs,
}: {
  student: StudentAnalytics;
  demoMode: boolean;
  nowTs: number;
}) {
  const score = Math.round(student.avgScore);

  return (
    <Link
      href={`/admin/eleves/${student.id}${demoMode ? "?demo=1" : ""}`}
      className="group block rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,.04)] transition-all hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <StudentAvatar
            pictureUrl={student.picture_url}
            userId={student.id}
            firstname={student.firstname}
            lastname={student.lastname}
            email={student.email}
            size={10}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-slate-950">{getFullName(student)}</h3>
              <StatusPill status={student.status} />
            </div>
            <p className="truncate text-xs text-slate-500">{student.email}</p>
          </div>
        </div>

        <div className="text-right">
          <div
            className={cn(
              "text-2xl font-black leading-none tracking-[-0.05em] text-slate-950",
              score >= 80 &&
                "bg-gradient-to-r from-[#ffbb75] via-[#fa71ab] to-[#7403ce] bg-clip-text text-transparent"
            )}
          >
            {score}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
            /100
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <CompactStat label="Sess." value={student.totalSessions.toString()} />
        <CompactStat label="Temps" value={formatHours(student.totalDurationSeconds)} />
        <CompactStat
          label="Actif"
          value={student.lastActivityIso ? formatRelative(student.lastActivityIso, nowTs) : "—"}
        />
        <CompactStat
          label="Dernière"
          value={student.lastScore != null ? `${Math.round(student.lastScore)}` : "—"}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
        <span className="truncate text-xs font-medium text-slate-600">{getPriorityReason(student)}</span>
        <Badge variant="outline" className={cn("shrink-0 font-mono text-[10px]", scoreColor(score))}>
          {student.trendDelta > 0 ? "+" : ""}
          {Math.round(student.trendDelta)} pts
        </Badge>
      </div>

      <div className="mt-3">
        {student.recentScores && student.recentScores.length >= 2 ? (
          <MiniSparkline
            values={student.recentScores}
            accent={student.status === "declining" ? "#f43f5e" : "#7403ce"}
            height={24}
            fillOpacity={0.12}
          />
        ) : (
          <div className="h-6 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
        )}
      </div>
    </Link>
  );
}

function TopMetric({
  label,
  value,
  tone = "slate",
  className,
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "amber" | "rose";
  className?: string;
}) {
  const toneClasses = {
    slate: "border-slate-200 bg-slate-50",
    emerald: "border-emerald-200 bg-emerald-50",
    amber: "border-amber-200 bg-amber-50",
    rose: "border-rose-200 bg-rose-50",
  };

  return (
    <div className={cn("rounded-xl border px-3 py-2", toneClasses[tone], className)}>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-[-0.03em] text-slate-950">{value}</p>
    </div>
  );
}

function CompactPanel({
  title,
  icon,
  tone,
  rows,
  emptyLabel,
}: {
  title: string;
  icon: string;
  tone: "emerald" | "amber";
  rows: Array<{ id: string; name: string; right: string; meta: string }>;
  emptyLabel: string;
}) {
  const toneClasses = {
    emerald: "text-emerald-600 border-emerald-200 bg-emerald-50",
    amber: "text-amber-600 border-amber-200 bg-amber-50",
  };

  return (
    <div className="rounded-2xl border border-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className={cn("rounded-lg border p-1.5", toneClasses[tone])}>
          <Icon icon={icon} className="size-4" />
        </span>
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{row.name}</p>
                <p className="truncate text-xs text-slate-500">{row.meta}</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                {row.right}
              </span>
            </div>
          ))
        ) : (
          <p className="px-4 py-3 text-sm text-slate-500">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}

function CompactStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function getFullName(student: Pick<StudentRow, "firstname" | "lastname" | "email">) {
  return `${student.firstname ?? ""} ${student.lastname ?? ""}`.trim() || student.email || "Élève";
}

function getPriorityWeight(student: StudentAnalytics) {
  if (student.status === "inactive") return 100 + (student.lastActivityDays ?? 0);
  if (student.status === "declining") return 80 + Math.abs(student.trendDelta);
  if (Math.round(student.avgScore) < 60) return 60 - Math.round(student.avgScore);
  return 0;
}

function getPriorityBadge(student: StudentAnalytics) {
  if (student.status === "inactive") return "inactif";
  if (student.status === "declining") return "baisse";
  if (Math.round(student.avgScore) < 60) return "score bas";
  return "stable";
}

function getPriorityReason(student: StudentAnalytics) {
  if (student.status === "inactive") {
    return student.lastActivityDays != null
      ? `Aucune activité depuis ${student.lastActivityDays} j`
      : "Aucune activité";
  }
  if (student.status === "declining") {
    return `${Math.round(student.trendDelta)} pts sur 7 j`;
  }
  if (Math.round(student.avgScore) < 60) {
    return `Score moyen ${Math.round(student.avgScore)}/100`;
  }
  if (student.trendDelta > 0) {
    return `Progression +${Math.round(student.trendDelta)} pts`;
  }
  return "Performance stable";
}
