import { requireAdmin } from "@/utils/auth/require-admin";
import { Header } from "@/components/layout/header";
import { PromptPreview } from "@/components/admin/prompt-preview";

export default async function PromptPreviewPage() {
  await requireAdmin();

  const breadcrumbs = [
    { label: "Suivi & analytics", href: "/admin" },
    { label: "Choix éditeur prompt" },
  ];

  return (
    <>
      <Header breadcrumbs={breadcrumbs} />
      <PromptPreview />
    </>
  );
}
