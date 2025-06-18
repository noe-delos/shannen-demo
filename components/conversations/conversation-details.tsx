/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icon } from "@iconify/react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface ConversationDetailsProps {
  conversationId: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export function ConversationDetails({
  conversationId,
}: ConversationDetailsProps) {
  const [conversation, setConversation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if user is authenticated
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push("/login");
          return;
        }

        // Fetch conversation with related data
        const { data: conversationData, error: fetchError } = await supabase
          .from("conversations")
          .select(
            `
            *,
            agents:agent_id (
              id,
              name,
              job_title,
              picture_url,
              difficulty,
              personnality,
              firstname,
              lastname
            ),
            products:product_id (
              id,
              name,
              pitch,
              price,
              marche
            ),
            feedback:feedback_id (
              id,
              note,
              points_forts,
              axes_amelioration,
              moments_cles,
              suggestions,
              analyse_complete,
              created_at
            )
          `
          )
          .eq("id", conversationId)
          .single();

        if (fetchError) {
          console.error("Error fetching conversation:", fetchError);
          setError("Conversation introuvable");
          return;
        }

        // Check if user owns this conversation
        if (conversationData.user_id !== user.id) {
          setError("Accès non autorisé à cette conversation");
          return;
        }

        setConversation(conversationData);
      } catch (err) {
        console.error("Error:", err);
        setError("Erreur lors du chargement de la conversation");
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [conversationId, supabase, router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  const getCallTypeEmoji = (callType: string) => {
    switch (callType) {
      case "cold_call":
        return "🔍";
      case "discovery_meeting":
        return "📅";
      case "product_demo":
        return "💻";
      case "closing_call":
        return "✅";
      case "follow_up_call":
        return "🔄";
      default:
        return "📞";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "facile":
        return "bg-green-100 text-green-800";
      case "moyen":
        return "bg-yellow-100 text-yellow-800";
      case "difficile":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score <= 20) return "bg-red-600";
    if (score <= 40) return "bg-orange-600";
    if (score <= 60) return "bg-yellow-600";
    if (score <= 80) return "bg-[#33a725]";
    return "bg-emerald-600";
  };

  const getScoreLevel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Satisfaisant";
    if (score >= 40) return "À améliorer";
    return "Insuffisant";
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div>
                    <div className="h-8 bg-gray-200 rounded w-80 animate-pulse mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                  </div>
                </div>
                <div className="h-16 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </CardContent>
          </Card>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-3 space-y-6">
              <Card className="shadow-soft">
                <CardContent className="p-6">
                  <div className="h-10 bg-gray-200 rounded animate-pulse mb-6"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="h-24 bg-gray-200 rounded animate-pulse"
                      ></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-soft">
                <CardContent className="p-6">
                  <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="shadow-soft">
                  <CardContent className="p-6">
                    <div className="h-48 bg-gray-200 rounded animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-soft">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <Icon
                  icon="mdi:alert-circle"
                  className="h-16 w-16 text-red-500 mb-4"
                />
                <h2 className="text-2xl font-bold mb-2">Erreur</h2>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button onClick={() => router.push("/")} variant="outline">
                  <Icon icon="mdi:arrow-left" className="h-4 w-4 mr-2" />
                  Retour au tableau de bord
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-soft">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <Icon
                  icon="mdi:file-document-off"
                  className="h-16 w-16 text-muted-foreground mb-4"
                />
                <h2 className="text-2xl font-bold mb-2">
                  Conversation introuvable
                </h2>
                <p className="text-muted-foreground mb-6">
                  Cette conversation n'existe pas ou vous n'avez pas
                  l'autorisation de la consulter.
                </p>
                <Button onClick={() => router.push("/")} variant="outline">
                  <Icon icon="mdi:arrow-left" className="h-4 w-4 mr-2" />
                  Retour au tableau de bord
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/")}
                  className="w-fit"
                >
                  <Icon icon="mdi:arrow-left" className="h-4 w-4 mr-2" />
                  Retour
                </Button>

                <div>
                  <h1 className="text-xl md:text-2xl font-bold flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                    <span>
                      Conversation avec{" "}
                      {conversation.agents?.name || "Agent inconnu"}
                      {(conversation.agents?.firstname ||
                        conversation.agents?.lastname) && (
                        <span className="text-blue-600 font-medium">
                          {" "}
                          ({conversation.agents?.firstname}{" "}
                          {conversation.agents?.lastname})
                        </span>
                      )}
                    </span>
                    {conversation.feedback?.note && (
                      <Badge
                        className={`${getScoreBadgeColor(
                          conversation.feedback.note
                        )} rounded-sm font-mono px-1 text-white text-[.6rem] font-bold`}
                      >
                        {conversation.feedback.note}/100
                      </Badge>
                    )}
                  </h1>
                  <p className="text-muted-foreground text-sm md:text-base">
                    {formatDate(conversation.created_at)}
                  </p>
                </div>
              </div>

              {conversation.feedback?.note && (
                <div className="text-center md:text-right">
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
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Column - Main Content */}
          <div className="xl:col-span-3 space-y-6">
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                    <TabsTrigger value="transcript">Transcript</TabsTrigger>
                    <TabsTrigger value="feedback">Feedback</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    {/* Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {metrics.map((metric, index) => (
                        <Card key={metric.title} className="shadow-soft">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-lg ${metric.bgColor}`}
                              >
                                <Icon
                                  icon={metric.icon}
                                  className={`h-5 w-5 ${metric.color}`}
                                />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">
                                  {metric.title}
                                </p>
                                <p className="text-lg font-bold">
                                  {metric.value}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Context Information */}
                    <Card className="shadow-soft">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Icon icon="mdi:information" className="h-5 w-5" />
                          Contexte de l'appel
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Type d'appel
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-lg">
                                {getCallTypeEmoji(conversation.call_type)}
                              </span>
                              <span className="capitalize">
                                {conversation.call_type?.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Durée
                            </p>
                            <p className="font-medium">
                              {formatDuration(conversation.duration_seconds)}
                            </p>
                          </div>
                          {conversation.context?.company && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Entreprise
                              </p>
                              <p className="font-medium">
                                {conversation.context.company}
                              </p>
                            </div>
                          )}
                          {conversation.context?.secteur && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Secteur
                              </p>
                              <p className="font-medium">
                                {conversation.context.secteur}
                              </p>
                            </div>
                          )}
                        </div>

                        {conversation.goal && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Objectif de l'appel
                            </p>
                            <p className="mt-1">{conversation.goal}</p>
                          </div>
                        )}

                        {conversation.context?.historique_relation && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Historique relation
                            </p>
                            <Badge variant="outline" className="mt-1">
                              {conversation.context.historique_relation}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="transcript">
                    <Card className="shadow-soft">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Icon icon="mdi:message-text" className="h-5 w-5" />
                          Transcript de la conversation
                          {conversation.transcript &&
                            Array.isArray(conversation.transcript) && (
                              <Badge variant="outline">
                                {conversation.transcript.length} messages
                              </Badge>
                            )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!conversation.transcript ||
                        !Array.isArray(conversation.transcript) ||
                        conversation.transcript.length === 0 ? (
                          <div className="text-center py-8">
                            <Icon
                              icon="mdi:message-off"
                              className="h-12 w-12 mx-auto text-muted-foreground mb-2"
                            />
                            <p className="text-muted-foreground">
                              Aucun transcript disponible
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4 max-h-[600px] overflow-y-auto">
                            {conversation.transcript.map(
                              (message: Message, index: number) => (
                                <div
                                  key={index}
                                  className={`flex ${
                                    message.role === "user"
                                      ? "justify-end"
                                      : "justify-start"
                                  }`}
                                >
                                  <div
                                    className={`max-w-[80%] ${
                                      message.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                    } rounded-lg p-3 shadow-soft`}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <Icon
                                        icon={
                                          message.role === "user"
                                            ? "mdi:account"
                                            : "mdi:robot"
                                        }
                                        className="h-4 w-4"
                                      />
                                      <span className="text-xs font-medium">
                                        {message.role === "user"
                                          ? "Vous"
                                          : "Agent"}
                                      </span>
                                      {message.timestamp && (
                                        <span className="text-xs opacity-70">
                                          {formatTimestamp(message.timestamp)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm leading-relaxed">
                                      {message.content}
                                    </p>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="feedback">
                    <div className="space-y-6">
                      {!conversation.feedback ? (
                        <Card className="shadow-soft">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Icon
                                icon="mdi:comment-processing"
                                className="h-5 w-5"
                              />
                              Feedback et analyse
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-center py-8">
                              <Icon
                                icon="mdi:comment-off"
                                className="h-12 w-12 mx-auto text-muted-foreground mb-2"
                              />
                              <p className="text-muted-foreground">
                                Aucun feedback disponible
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Le feedback sera généré automatiquement après
                                l'analyse de la conversation
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <>
                          {/* Score Overview */}
                          {conversation.feedback.note && (
                            <Card className="shadow-soft border-2">
                              <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div>
                                    <h2 className="text-2xl font-bold mb-1">
                                      Score global
                                    </h2>
                                    <p className="text-muted-foreground">
                                      Performance globale de votre conversation
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <div
                                      className={`text-5xl font-bold ${getScoreColor(
                                        conversation.feedback.note
                                      )}`}
                                    >
                                      {conversation.feedback.note}
                                      <span className="text-2xl">/100</span>
                                    </div>
                                    <Badge
                                      className={`${getScoreBadgeColor(
                                        conversation.feedback.note
                                      )} rounded-sm font-mono px-2 py-1 text-white font-bold`}
                                    >
                                      {getScoreLevel(
                                        conversation.feedback.note
                                      )}
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Points forts */}
                          {conversation.feedback.points_forts &&
                            conversation.feedback.points_forts.length > 0 && (
                              <Card className="shadow-soft">
                                <CardHeader>
                                  <CardTitle className="flex items-center gap-2 text-green-600">
                                    <Icon
                                      icon="mdi:check-circle"
                                      className="h-5 w-5"
                                    />
                                    Points forts
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2">
                                    {conversation.feedback.points_forts.map(
                                      (point: string, index: number) => (
                                        <div
                                          key={index}
                                          className="flex items-start gap-3"
                                        >
                                          <Icon
                                            icon="mdi:plus-circle"
                                            className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0"
                                          />
                                          <p className="text-sm">{point}</p>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                          {/* Axes d'amélioration */}
                          {conversation.feedback.axes_amelioration &&
                            conversation.feedback.axes_amelioration.length >
                              0 && (
                              <Card className="shadow-soft">
                                <CardHeader>
                                  <CardTitle className="flex items-center gap-2 text-orange-600">
                                    <Icon
                                      icon="mdi:target"
                                      className="h-5 w-5"
                                    />
                                    Axes d'amélioration
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2">
                                    {conversation.feedback.axes_amelioration.map(
                                      (axe: string, index: number) => (
                                        <div
                                          key={index}
                                          className="flex items-start gap-3"
                                        >
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
                            )}

                          {/* Complete analysis */}
                          {conversation.feedback.analyse_complete && (
                            <Card className="shadow-soft">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <Icon
                                    icon="mdi:file-document-outline"
                                    className="h-5 w-5"
                                  />
                                  Analyse complète
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                  {conversation.feedback.analyse_complete}
                                </p>
                              </CardContent>
                            </Card>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Agent & Product Info */}
          <div className="space-y-6">
            {/* Agent Information */}
            {conversation.agents && (
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon icon="mdi:account" className="h-5 w-5" />
                    Agent
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden flex-shrink-0">
                      <img
                        src={
                          conversation.agents?.picture_url ||
                          "/default-avatar.png"
                        }
                        alt="Agent"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {conversation.agents.name}
                      </h3>
                      {(conversation.agents.firstname ||
                        conversation.agents.lastname) && (
                        <p className="text-sm font-medium text-blue-600">
                          {conversation.agents.firstname}{" "}
                          {conversation.agents.lastname}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {conversation.agents.job_title}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Difficulté
                    </p>
                    <Badge
                      className={getDifficultyColor(
                        conversation.agents.difficulty
                      )}
                    >
                      {conversation.agents.difficulty}
                    </Badge>
                  </div>

                  {conversation.agents.personnality && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Personnalité
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Attitude:</span>
                          <span className="font-medium">
                            {conversation.agents.personnality.attitude}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Écoute:</span>
                          <span className="font-medium">
                            {conversation.agents.personnality.écoute}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Verbalisation:</span>
                          <span className="font-medium">
                            {conversation.agents.personnality.verbalisation}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Product Information */}
            {conversation.products && (
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon icon="mdi:package-variant" className="h-5 w-5" />
                    Produit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold">
                      {conversation.products.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        {conversation.products.marche}
                      </Badge>
                      {conversation.products.price && (
                        <span className="text-sm font-semibold text-green-600">
                          {conversation.products.price}€
                        </span>
                      )}
                    </div>
                  </div>

                  {conversation.products.pitch && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Pitch
                      </p>
                      <p className="text-sm mt-1">
                        {conversation.products.pitch}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
