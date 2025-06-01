/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface ConversationHeaderProps {
  conversation: any;
}

export function ConversationHeader({ conversation }: ConversationHeaderProps) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <Icon icon="mdi:arrow-left" className="h-4 w-4" />
          Retour
        </Button>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Conversation avec {conversation.agents?.name || "Agent inconnu"}
            {conversation.feedback?.note && (
              <Badge className={getScoreBadgeColor(conversation.feedback.note)}>
                {conversation.feedback.note}/100
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            {formatDate(conversation.created_at)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {conversation.feedback?.note && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Score global</p>
            <p
              className={`text-2xl font-bold ${getScoreColor(
                conversation.feedback.note
              )}`}
            >
              {conversation.feedback.note}/100
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
