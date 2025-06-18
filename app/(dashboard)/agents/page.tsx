import { Header } from "@/components/layout/header";
import { AgentsGridWrapper } from "@/components/agents/agents-grid-wrapper";

export default function AgentsPage() {
  const breadcrumbs = [{ label: "Dashboard", href: "/" }, { label: "Agents" }];

  return (
    <>
      <Header breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <AgentsGridWrapper />
      </div>
    </>
  );
}
