import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/utils/auth/require-admin";
import { Header } from "@/components/layout/header";
import { StudentsList, type StudentRow } from "@/components/admin/students-list";
import { getDemoConversationsAll, getDemoStudents, REFERENCE_DATE_ISO } from "@/components/admin/demo-data";

type SearchParams = Promise<{ demo?: string }>;

function buildTeamScoreSparkline(
  conversations: Array<{ created_at: string; feedback: { note: number | null } | null }>
) {
  const scored = conversations.filter((conversation) => conversation.feedback?.note != null);
  if (scored.length < 2) return undefined;

  return [...scored]
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    .slice(-10)
    .map((conversation) => conversation.feedback!.note ?? 0);
}

export default async function AdminListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();

  const { demo } = await searchParams;
  const demoMode = demo === "1";

  let students: StudentRow[];
  let totals: {
    studentsCount: number;
    totalSessions: number;
    teamAvgScore: number;
    sessionsThisWeek: number;
    teamScoreSparkline?: number[];
  };
  let nowIso: string;

  if (demoMode) {
    const allConvs = getDemoConversationsAll();
    const allStudents = getDemoStudents();
    const now = new Date(REFERENCE_DATE_ISO).getTime();
    const weekAgo = now - 7 * 86400 * 1000;
    const twoWeekAgo = now - 14 * 86400 * 1000;

    students = allStudents
      .map((s) => {
        const convs = allConvs.filter((c) => c.user_id === s.id);
        const fb = convs.filter((c) => c.feedback?.note != null);
        const avg = fb.length ? fb.reduce((a, c) => a + (c.feedback!.note ?? 0), 0) / fb.length : 0;
        const totalDur = convs.reduce((a, c) => a + (c.duration_seconds ?? 0), 0);
        const last7 = fb.filter((c) => new Date(c.created_at).getTime() >= weekAgo);
        const prev7 = fb.filter((c) => {
          const t = new Date(c.created_at).getTime();
          return t >= twoWeekAgo && t < weekAgo;
        });
        const last7Avg = last7.length ? last7.reduce((a, c) => a + (c.feedback!.note ?? 0), 0) / last7.length : 0;
        const prev7Avg = prev7.length ? prev7.reduce((a, c) => a + (c.feedback!.note ?? 0), 0) / prev7.length : 0;
        const trend = prev7Avg > 0 ? last7Avg - prev7Avg : 0;
        const lastConv = convs[0];
        // recentScores: last 8 chronologically (oldest → newest)
        const recentScores = [...fb]
          .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
          .slice(-8)
          .map((c) => c.feedback!.note ?? 0);
        return {
          id: s.id,
          email: s.email,
          firstname: s.firstname,
          lastname: s.lastname,
          picture_url: s.picture_url,
          totalSessions: convs.length,
          totalDurationSeconds: totalDur,
          avgScore: avg,
          trendDelta: trend,
          lastActivityIso: lastConv?.created_at ?? null,
          recentScores,
        } satisfies StudentRow;
      })
      .filter((s) => s.totalSessions > 0);

    totals = {
      studentsCount: students.length,
      totalSessions: allConvs.length,
      teamAvgScore: students.length ? students.reduce((a, s) => a + s.avgScore, 0) / students.length : 0,
      sessionsThisWeek: allConvs.filter((c) => new Date(c.created_at).getTime() >= weekAgo).length,
      teamScoreSparkline: buildTeamScoreSparkline(allConvs),
    };
    nowIso = REFERENCE_DATE_ISO;
  } else {
    // Real data via service-role admin client (bypasses RLS).
    const admin = createAdminClient();

    // Pull all conversations (with feedback) and all users in parallel.
    const [convsRes, usersRes] = await Promise.all([
      admin
        .from("conversations")
        .select("id, user_id, duration_seconds, created_at, feedback:feedback_id (note)")
        .order("created_at", { ascending: false })
        .limit(2000),
      admin.from("users").select("id, email, firstname, lastname, picture_url"),
    ]);

    const allConvs = (convsRes.data ?? []) as unknown as Array<{
      id: string;
      user_id: string;
      duration_seconds: number | null;
      created_at: string;
      feedback: { note: number | null } | null;
    }>;
    const allUsers = (usersRes.data ?? []) as Array<{
      id: string;
      email: string | null;
      firstname: string | null;
      lastname: string | null;
      picture_url: string | null;
    }>;

    const now = Date.now();
    const weekAgo = now - 7 * 86400 * 1000;
    const twoWeekAgo = now - 14 * 86400 * 1000;

    students = allUsers
      .map((u) => {
        const convs = allConvs.filter((c) => c.user_id === u.id);
        const fb = convs.filter((c) => c.feedback?.note != null);
        const avg = fb.length ? fb.reduce((a, c) => a + (c.feedback!.note ?? 0), 0) / fb.length : 0;
        const totalDur = convs.reduce((a, c) => a + (c.duration_seconds ?? 0), 0);
        const last7 = fb.filter((c) => new Date(c.created_at).getTime() >= weekAgo);
        const prev7 = fb.filter((c) => {
          const t = new Date(c.created_at).getTime();
          return t >= twoWeekAgo && t < weekAgo;
        });
        const last7Avg = last7.length ? last7.reduce((a, c) => a + (c.feedback!.note ?? 0), 0) / last7.length : 0;
        const prev7Avg = prev7.length ? prev7.reduce((a, c) => a + (c.feedback!.note ?? 0), 0) / prev7.length : 0;
        const trend = prev7Avg > 0 ? last7Avg - prev7Avg : 0;
        const lastConv = convs[0];
        const recentScores = [...fb]
          .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
          .slice(-8)
          .map((c) => c.feedback!.note ?? 0);
        return {
          id: u.id,
          email: u.email,
          firstname: u.firstname,
          lastname: u.lastname,
          picture_url: u.picture_url,
          totalSessions: convs.length,
          totalDurationSeconds: totalDur,
          avgScore: avg,
          trendDelta: trend,
          lastActivityIso: lastConv?.created_at ?? null,
          recentScores,
        } satisfies StudentRow;
      })
      .filter((s) => s.totalSessions > 0);

    totals = {
      studentsCount: students.length,
      totalSessions: allConvs.length,
      teamAvgScore: students.length ? students.reduce((a, s) => a + s.avgScore, 0) / students.length : 0,
      sessionsThisWeek: allConvs.filter((c) => new Date(c.created_at).getTime() >= weekAgo).length,
      teamScoreSparkline: buildTeamScoreSparkline(allConvs),
    };
    nowIso = new Date().toISOString();
  }

  const breadcrumbs = [{ label: "Suivi & analytics" }];

  return (
    <>
      <Header breadcrumbs={breadcrumbs} />
      <StudentsList students={students} totals={totals} demoMode={demoMode} nowIso={nowIso} />
    </>
  );
}
