/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

interface FeedbackViewerProps {
  feedback: any;
}

export function FeedbackViewer({ feedback }: FeedbackViewerProps) {
  if (!feedback) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon icon="mdi:comment-processing" className="h-5 w-5" />
              Feedback et analyse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Icon
                icon="mdi:comment-off"
                className="h-12 w-12 mx-auto text-muted-foreground mb-2"
              />
              <p className="text-muted-foreground">Aucun feedback disponible</p>
              <p className="text-sm text-muted-foreground mt-1">
                Le feedback sera généré automatiquement après l'analyse de la
                conversation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getScoreLevel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Satisfaisant";
    if (score >= 40) return "À améliorer";
    return "Insuffisant";
  };

  return (
    <div className="space-y-6">
      {/* Score Overview */}
      {feedback.note && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Score global</h2>
                  <p className="text-muted-foreground">
                    Performance globale de votre conversation
                  </p>
                </div>
                <div className="text-center">
                  <div
                    className={`text-5xl font-bold ${getScoreColor(
                      feedback.note
                    )}`}
                  >
                    {feedback.note}
                    <span className="text-2xl">/100</span>
                  </div>
                  <Badge className={getScoreBadgeColor(feedback.note)}>
                    {getScoreLevel(feedback.note)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Points forts */}
      {feedback.points_forts && feedback.points_forts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Icon icon="mdi:check-circle" className="h-5 w-5" />
                Points forts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {feedback.points_forts.map((point: string, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <Icon
                      icon="mdi:plus-circle"
                      className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0"
                    />
                    <p className="text-sm">{point}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Axes d'amélioration */}
      {feedback.axes_amelioration && feedback.axes_amelioration.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <Icon icon="mdi:target" className="h-5 w-5" />
                Axes d'amélioration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {feedback.axes_amelioration.map(
                  (axe: string, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <Icon
                        icon="mdi:arrow-up-circle"
                        className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0"
                      />
                      <p className="text-sm">{axe}</p>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Moments clés */}
      {feedback.moments_cles && feedback.moments_cles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Icon icon="mdi:star" className="h-5 w-5" />
                Moments clés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {feedback.moments_cles.map((moment: string, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <Icon
                      icon="mdi:clock-star"
                      className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0"
                    />
                    <p className="text-sm">{moment}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Suggestions */}
      {feedback.suggestions && feedback.suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600">
                <Icon icon="mdi:lightbulb" className="h-5 w-5" />
                Suggestions d'amélioration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {feedback.suggestions.map(
                  (suggestion: string, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <Icon
                        icon="mdi:lightbulb-on"
                        className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0"
                      />
                      <p className="text-sm">{suggestion}</p>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Analyse complète */}
      {feedback.analyse_complete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon icon="mdi:file-document-outline" className="h-5 w-5" />
                Analyse complète
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {feedback.analyse_complete}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Feedback metadata */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon icon="mdi:information" className="h-4 w-4" />
              <span>
                Feedback généré le{" "}
                {new Date(feedback.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
