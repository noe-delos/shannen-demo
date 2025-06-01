/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

interface ConversationMetricsProps {
  conversation: any;
}

export function ConversationMetrics({
  conversation,
}: ConversationMetricsProps) {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getMessageCount = (transcript: any) => {
    if (!transcript || !Array.isArray(transcript)) return 0;
    return transcript.length;
  };

  const getUserMessageCount = (transcript: any) => {
    if (!transcript || !Array.isArray(transcript)) return 0;
    return transcript.filter((msg: any) => msg.role === "user").length;
  };

  const getAgentMessageCount = (transcript: any) => {
    if (!transcript || !Array.isArray(transcript)) return 0;
    return transcript.filter((msg: any) => msg.role === "assistant").length;
  };

  const metrics = [
    {
      title: "Durée totale",
      value: formatDuration(conversation.duration_seconds || 0),
      icon: "mdi:clock-outline",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Messages échangés",
      value: getMessageCount(conversation.transcript),
      icon: "mdi:message-outline",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Vos interventions",
      value: getUserMessageCount(conversation.transcript),
      icon: "mdi:account-voice",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Réponses agent",
      value: getAgentMessageCount(conversation.transcript),
      icon: "mdi:robot",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <Icon
                    icon={metric.icon}
                    className={`h-6 w-6 ${metric.color}`}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
