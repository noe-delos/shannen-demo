/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

interface TranscriptViewerProps {
  transcript: any;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon icon="mdi:message-text" className="h-5 w-5" />
            Transcript de la conversation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Icon
              icon="mdi:message-off"
              className="h-12 w-12 mx-auto text-muted-foreground mb-2"
            />
            <p className="text-muted-foreground">Aucun transcript disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon icon="mdi:message-text" className="h-5 w-5" />
          Transcript de la conversation
          <Badge variant="outline">{transcript.length} messages</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {transcript.map((message: Message, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                } rounded-lg p-3`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    icon={message.role === "user" ? "mdi:account" : "mdi:robot"}
                    className="h-4 w-4"
                  />
                  <span className="text-xs font-medium">
                    {message.role === "user" ? "Vous" : "Agent"}
                  </span>
                  {message.timestamp && (
                    <span className="text-xs opacity-70">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
