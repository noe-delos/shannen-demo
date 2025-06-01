import { ConversationDetails } from "@/components/conversations/conversation-details";

interface ConversationPageProps {
  params: {
    id: string;
  };
}

export default function ConversationPage({ params }: ConversationPageProps) {
  return <ConversationDetails conversationId={params.id} />;
}
