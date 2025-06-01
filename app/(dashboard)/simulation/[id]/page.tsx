import { SimulationConversation } from "@/components/simulation/simulation-conversation";

interface SimulationPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SimulationPage({ params }: SimulationPageProps) {
  const { id } = await params;
  return <SimulationConversation conversationId={id} />;
}
