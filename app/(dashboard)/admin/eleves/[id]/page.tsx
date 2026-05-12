import { notFound } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/utils/auth/require-admin";
import { Header } from "@/components/layout/header";
import { StudentDetail } from "@/components/admin/student-detail";
import {
  getDemoConversationsForStudent,
  getDemoStudents,
  REFERENCE_DATE_ISO,
} from "@/components/admin/demo-data";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ demo?: string }>;

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireAdmin();

  const { id } = await params;
  const { demo } = await searchParams;
  const demoMode = demo === "1";

  type Student = {
    id: string;
    email: string | null;
    firstname: string | null;
    lastname: string | null;
  };
  type Conversation = Parameters<typeof StudentDetail>[0]["conversations"][number];

  let student: Student | null = null;
  let conversations: Conversation[] = [];
  let nowIso: string;

  if (demoMode) {
    const demoStudents = getDemoStudents();
    const found = demoStudents.find((s) => s.id === id);
    if (!found) notFound();
    student = {
      id: found.id,
      email: found.email,
      firstname: found.firstname,
      lastname: found.lastname,
    };
    conversations = getDemoConversationsForStudent(id);
    nowIso = REFERENCE_DATE_ISO;
  } else {
    const admin = createAdminClient();
    const [userRes, convsRes] = await Promise.all([
      admin
        .from("users")
        .select("id, email, firstname, lastname")
        .eq("id", id)
        .maybeSingle(),
      admin
        .from("conversations")
        .select(
          `id, call_type, duration_seconds, created_at,
           agents:agent_id (name, firstname, lastname, job_title),
           feedback:feedback_id (note, points_forts, axes_amelioration, moments_cles, suggestions, analyse_complete)`
        )
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (!userRes.data) notFound();
    student = userRes.data as Student;
    conversations = (convsRes.data ?? []) as unknown as Conversation[];
    nowIso = new Date().toISOString();
  }

  const fullName =
    `${student.firstname ?? ""} ${student.lastname ?? ""}`.trim() || student.email || "Élève";

  const breadcrumbs = [
    { label: "Suivi & analytics", href: `/admin${demoMode ? "?demo=1" : ""}` },
    { label: fullName },
  ];

  return (
    <>
      <Header breadcrumbs={breadcrumbs} />
      <StudentDetail
        student={student}
        conversations={conversations}
        demoMode={demoMode}
        nowIso={nowIso}
      />
    </>
  );
}
