"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Icon } from "@iconify/react";
import {
  KpiCard,
  MiniSparkline,
  StatusPill,
  computeStudentStatus,
  formatHours,
  formatRelative,
  scoreColor,
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
  /** Last ~8 scores, oldest → newest. Used for the per-card sparkline. */
  recentScores?: number[];
};

type Props = {
  students: StudentRow[];
  totals: {
    studentsCount: number;
    totalSessions: number;
    teamAvgScore: number;
    sessionsThisWeek: number;
    /** 7-pt rolling team avg score for the KPI sparkline. */
    teamScoreSparkline?: number[];
  };
  demoMode?: boolean;
  nowIso: string;
};

type SortKey = "score" | "sessions" | "activity" | "name";

export function StudentsList({ students, totals, demoMode = false, nowIso }: Props) {
  const nowTs = new Date(nowIso).getTime();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("score");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = students;
    if (q) {
      rows = rows.filter((s) => {
        const name = `${s.firstname ?? ""} ${s.lastname ?? ""}`.toLowerCase();
        return name.includes(q) || (s.email ?? "").toLowerCase().includes(q);
      });
    }
    rows = [...rows].sort((a, b) => {
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
        case "name": {
          const na = `${a.firstname ?? ""} ${a.lastname ?? ""}`.trim() || (a.email ?? "");
          const nb = `${b.firstname ?? ""} ${b.lastname ?? ""}`.trim() || (b.email ?? "");
          return na.localeCompare(nb);
        }
      }
    });
    return rows;
  }, [students, search, sortKey]);

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
              Dès qu&apos;un commercial réalise sa première simulation, il apparaîtra ici avec ses statistiques.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7 p-6">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-7">
        {/* ambient backdrop */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 100% 0%, rgba(255,187,117,.18) 0%, transparent 45%), radial-gradient(circle at 0% 100%, rgba(116,3,206,.10) 0%, transparent 45%)",
          }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#7403ce]">
              <span className="mr-2 inline-block size-1.5 rounded-full bg-[#7403ce] align-middle" />
              Console administrateur
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight leading-[1.05]">
              Suivi des{" "}
              <span className="bg-gradient-to-r from-[#ffbb75] via-[#fa71ab] to-[#7403ce] bg-clip-text text-transparent">
                élèves
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Vue consolidée de l&apos;équipe — {totals.studentsCount} élève
              {totals.studentsCount > 1 ? "s" : ""} actif{totals.studentsCount > 1 ? "s" : ""} ·{" "}
              {totals.totalSessions} simulation{totals.totalSessions > 1 ? "s" : ""} cumulée
              {totals.totalSessions > 1 ? "s" : ""}.
            </p>
          </div>
          {demoMode ? (
            <Badge className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-amber-700">
              <span className="mr-1.5 inline-block size-2 rounded-full bg-amber-500" />
              mode démo
            </Badge>
          ) : (
            <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-emerald-700">
              <span className="mr-1.5 inline-block size-2 animate-pulse rounded-full bg-emerald-500" />
              données live
            </Badge>
          )}
        </div>
      </div>

      {/* Team KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Élèves actifs"
          value={totals.studentsCount.toString()}
          icon="fluent:people-team-24-filled"
        />
        <KpiCard
          label="Sessions totales"
          value={totals.totalSessions.toString()}
          icon="fluent:headset-24-filled"
        />
        <KpiCard
          label="Score moyen équipe"
          value={Math.round(totals.teamAvgScore).toString()}
          unit="/100"
          icon="fluent:trophy-24-filled"
          sparkline={totals.teamScoreSparkline}
          accent="#bc30c4"
        />
        <KpiCard
          label="Cette semaine"
          value={totals.sessionsThisWeek.toString()}
          unit="sessions"
          icon="fluent:calendar-24-filled"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Icon
            icon="fluent:search-24-regular"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="h-10 pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
          {(
            [
              ["score", "Score"],
              ["sessions", "Sessions"],
              ["activity", "Activité"],
              ["name", "Nom"],
            ] as [SortKey, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                sortKey === k
                  ? "bg-white text-[#7403ce] shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          {filtered.length} affiché{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.4) }}
          >
            <StudentCard student={s} demoMode={demoMode} nowTs={nowTs} />
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucun élève ne correspond à ta recherche.
        </p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        V0 démo · vue propriétaire/admin sur l&apos;ensemble des élèves. La V1 introduira un contrôle d&apos;accès par rôle.
      </p>
    </div>
  );
}

function StudentCard({
  student,
  demoMode,
  nowTs,
}: {
  student: StudentRow;
  demoMode: boolean;
  nowTs: number;
}) {
  const fullName =
    `${student.firstname ?? ""} ${student.lastname ?? ""}`.trim() || student.email || "Élève";

  const status = computeStudentStatus({
    trendDelta: student.trendDelta,
    lastActivityIso: student.lastActivityIso,
    totalSessions: student.totalSessions,
    nowTs,
  });

  const score = Math.round(student.avgScore);
  const isHighScore = score >= 80;

  const href = `/admin/eleves/${student.id}${demoMode ? "?demo=1" : ""}`;

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:border-[#7403ce]/30 hover:shadow-lg"
    >
      {/* hover glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(250,113,171,.08) 0%, transparent 50%)",
        }}
      />

      <div className="relative p-5">
        {/* Top row: avatar + identity + status */}
        <div className="flex items-start gap-3">
          <StudentAvatar
            pictureUrl={student.picture_url}
            userId={student.id}
            firstname={student.firstname}
            lastname={student.lastname}
            email={student.email}
            size={11}
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold leading-tight">{fullName}</h3>
            <p className="truncate text-xs text-muted-foreground">{student.email}</p>
            <div className="mt-1.5">
              <StatusPill status={status} />
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-2xl font-extrabold tracking-tight leading-none ${
                isHighScore
                  ? "bg-gradient-to-r from-[#ffbb75] via-[#fa71ab] to-[#7403ce] bg-clip-text text-transparent"
                  : ""
              }`}
            >
              {score}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              /100
            </div>
          </div>
        </div>

        {/* Sparkline */}
        {student.recentScores && student.recentScores.length >= 2 ? (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Tendance — {student.recentScores.length} dernières</span>
              <span
                className={
                  student.trendDelta > 1
                    ? "text-emerald-600"
                    : student.trendDelta < -1
                    ? "text-rose-600"
                    : "text-muted-foreground"
                }
              >
                {student.trendDelta > 0 ? "+" : ""}
                {Math.round(student.trendDelta)} pts
              </span>
            </div>
            <MiniSparkline values={student.recentScores} accent="#bc30c4" height={26} />
          </div>
        ) : (
          <div className="mt-4 flex h-[36px] items-center justify-center rounded-md bg-muted/30 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            pas assez de sessions
          </div>
        )}

        {/* Bottom stats */}
        <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4">
          <Stat label="Sessions" value={student.totalSessions.toString()} />
          <Stat label="Temps" value={formatHours(student.totalDurationSeconds)} />
          <Stat
            label="Activité"
            value={
              student.lastActivityIso
                ? formatRelative(student.lastActivityIso, nowTs)
                : "—"
            }
          />
        </div>

        {/* Bottom CTA */}
        <div className="mt-4 flex items-center justify-between text-xs">
          <Badge variant="outline" className={`font-mono text-[10px] ${scoreColor(score)}`}>
            {score}/100
          </Badge>
          <span className="inline-flex items-center gap-1 font-medium text-[#7403ce] opacity-0 transition-opacity group-hover:opacity-100">
            Voir détails <Icon icon="fluent:arrow-right-24-regular" className="size-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
