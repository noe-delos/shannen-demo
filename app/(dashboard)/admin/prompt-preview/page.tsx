import { requireAdmin } from "@/utils/auth/require-admin";
import { Header } from "@/components/layout/header";
import { PromptPreview } from "@/components/admin/prompt-preview";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function PromptPreviewPage() {
  await requireAdmin();

  const admin = createAdminClient();
  const { data: agents } = await admin
    .from("agents")
    .select(
      "id, name, firstname, lastname, job_title, difficulty, personnality, picture_url"
    )
    .is("user_id", null)
    .limit(12);

  const breadcrumbs = [
    { label: "Suivi & analytics", href: "/admin" },
    { label: "Choix éditeur prompt" },
  ];

  return (
    <>
      <Header breadcrumbs={breadcrumbs} />
      <PromptPreview sampleAgents={(agents ?? []) as never[]} />
    </>
  );
}
