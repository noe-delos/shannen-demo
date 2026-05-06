import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/utils/auth/require-admin";
import { Header } from "@/components/layout/header";
import { PromptEditor } from "@/components/admin/prompt-editor";

export default async function AdminPromptPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("persona_instructions, behavior_instructions, updated_at")
    .eq("id", 1)
    .single();

  const breadcrumbs = [
    { label: "Suivi & analytics", href: "/admin" },
    { label: "Prompt système" },
  ];

  return (
    <>
      <Header breadcrumbs={breadcrumbs} />
      <div className="px-4 py-6 sm:px-6 max-w-4xl mx-auto w-full">
        <PromptEditor
          initialPersona={settings?.persona_instructions ?? ""}
          initialBehavior={settings?.behavior_instructions ?? ""}
          updatedAt={settings?.updated_at ?? null}
        />
      </div>
    </>
  );
}
