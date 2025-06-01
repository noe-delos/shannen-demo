import { ConversationDetails } from "@/components/conversations/conversation-details";

interface ConversationPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { id } = await params;
  return <ConversationDetails conversationId={id} />;
}
