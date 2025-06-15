/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@iconify/react";
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Conversation, Agent, Product } from "@/lib/types/database";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { useConversation } from "@elevenlabs/react";

interface SimulationConversationProps {
  conversationId: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  source?: "ai" | "user";
}

const USER_PROFILE_PICTURE =
  "https://media.licdn.com/dms/image/v2/D4E03AQGeAAy1tqMunA/profile-displayphoto-shrink_400_400/B4EZZT3pJuHYAg-/0/1745163818003?e=1754524800&v=beta&t=3hO6A2Sr3AY80m-InCoKVyOfZ_5H_hJT4azu8lKHd44";

export function SimulationConversation({
  conversationId,
}: SimulationConversationProps) {
  const [conversationData, setConversationData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [conversationStatus, setConversationStatus] = useState<
    "waiting" | "connected" | "ended" | "analyzing"
  >("waiting");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false);
  const [urlFetchFailed, setUrlFetchFailed] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [elevenlabsConversationId, setElevenlabsConversationId] = useState<
    string | null
  >(null);

  const supabase = createClient();
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Add debug logging for state changes
  useEffect(() => {
    console.log(
      "🔄 State changed - initializing:",
      initializing,
      "loadingSignedUrl:",
      loadingSignedUrl,
      "conversationStatus:",
      conversationStatus
    );
  }, [initializing, loadingSignedUrl, conversationStatus]);

  // ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log("✅ Connected to ElevenLabs");
      console.log(
        "📊 Current state before onConnect - initializing:",
        initializing,
        "conversationStatus:",
        conversationStatus
      );
      setConversationStatus("connected");
      setInitializing(false);
      startTimer();
      setElevenlabsConversationId(conversation.getId() as string);
      console.log("🆔 Conversation ID:", conversation.getId());
      console.log(
        "📊 State after onConnect - initializing:",
        false,
        "conversationStatus:",
        "connected"
      );
      toast.success("Conversation connectée !");
    },
    onDisconnect: () => {
      console.log(
        "❌ Disconnected from ElevenLabs conversation with id:",
        conversation.getId()
      );
      console.log(
        "📊 Current state before onDisconnect - conversationStatus:",
        conversationStatus
      );
      setConversationStatus("ended");
      stopTimer();

      if (elapsedTime >= 10) {
        console.log("⏱️ Elapsed time >= 10 seconds, ending conversation");
        endConversation();
      }
    },
    onMessage: (message) => {
      console.log("💬 Message received:", message);

      // Save message to state
      const newMessage: ConversationMessage = {
        role: message.source === "ai" ? "assistant" : "user",
        content: message.message,
        timestamp: Date.now(),
        source: message.source,
      };

      setMessages((prev) => [...prev, newMessage]);
    },
    onError: (error) => {
      console.error("❌ ElevenLabs Error:", error);
      console.log(
        "📊 Current state before onError - initializing:",
        initializing,
        "urlFetchFailed:",
        urlFetchFailed
      );
      setUrlFetchFailed(true);
      setInitializing(false);
      console.log(
        "📊 State after onError - initializing:",
        false,
        "urlFetchFailed:",
        true
      );
      toast.error("Erreur de connexion ElevenLabs");
    },
  });

  useEffect(() => {
    console.log("🚀 Component mounted, conversationId:", conversationId);
    loadConversation();
    initializeMedia();
    return () => {
      console.log("🧹 Component cleanup");
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      // Stop all media tracks
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [conversationId]);

  const loadConversation = async () => {
    console.log("📥 Loading conversation:", conversationId);
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          agents:agent_id (*),
          products:product_id (*),
          feedback:feedback_id (*)
        `
        )
        .eq("id", conversationId)
        .single();

      if (error) {
        console.error("❌ Error loading conversation:", error);
        throw error;
      }

      console.log("✅ Conversation loaded:", data);
      setConversationData(data);

      // If conversation already has feedback, show it
      if (data.feedback) {
        console.log("📝 Conversation already has feedback:", data.feedback);
        setFeedback(data.feedback);
        setConversationStatus("ended");
      }

      // If conversation has transcript, load messages
      if (data.transcript && Array.isArray(data.transcript)) {
        console.log("💬 Loading existing messages:", data.transcript.length);
        setMessages(data.transcript);
      }

      setDuration(data.duration_seconds || 0);
      setInitializing(false);
    } catch (error) {
      console.error("❌ Error loading conversation:", error);
      toast.error("Erreur lors du chargement de la conversation");
    } finally {
      console.log("📊 Setting loading to false");
      setLoading(false);
    }
  };

  // Initialize media (camera and microphone)
  const initializeMedia = async () => {
    console.log("🎥 Initializing media devices...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });

      console.log("✅ Media stream obtained:", stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log("✅ Video element source set");
      }

      return true;
    } catch (error) {
      console.error("❌ Error accessing media devices:", error);
      return false;
    }
  };

  const getSignedUrl = async (): Promise<string | null> => {
    console.log("🔑 Getting signed URL for conversation:", conversationId);
    try {
      setLoadingSignedUrl(true);
      console.log("📊 Set loadingSignedUrl to true");

      const response = await fetch("/api/get-signed-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ conversation_id: conversationId }),
      });

      console.log("📡 get-signed-url response status:", response.status);

      if (!response.ok) {
        throw new Error(`Failed to get signed url: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📡 get-signed-url response data:", data);

      if (data.directUse) {
        console.log("🎯 Using direct agent ID:", data.agentId);
        setAgentId(data.agentId);
        return null;
      }

      console.log("🔑 Got signed URL, agentId:", data.agentId);
      setAgentId(data.agentId);
      return data.signedUrl;
    } catch (error) {
      console.error("❌ Error getting signed URL:", error);
      setUrlFetchFailed(true);
      return null;
    } finally {
      console.log("📊 Set loadingSignedUrl to false");
      setLoadingSignedUrl(false);
    }
  };

  const startConversation = async () => {
    console.log("🚀 startConversation called");
    console.log(
      "📊 Current state - conversationStatus:",
      conversationStatus,
      "loadingSignedUrl:",
      loadingSignedUrl
    );

    if (conversationStatus === "connected" || loadingSignedUrl) {
      console.log(
        "⏹️ Skipping start conversation - already connected or loading"
      );
      return;
    }

    try {
      console.log("📊 Setting initializing to true");
      setInitializing(true);

      // First configure the agent
      console.log("🔧 Configuring agent via /api/simulation/start");
      const response = await fetch("/api/simulation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
        }),
      });

      console.log("📡 simulation/start response status:", response.status);
      const data = await response.json();
      console.log("📡 simulation/start response data:", data);

      if (!response.ok) {
        console.error("❌ simulation/start failed:", data.error);
        throw new Error(data.error);
      }

      // Get signed URL
      console.log("🔑 Getting signed URL...");
      const signedUrl = await getSignedUrl();

      if (signedUrl) {
        console.log("🔑 Starting session with signed URL");
        await conversation.startSession({
          signedUrl,
        });
        console.log("✅ Session started with signed URL");
      } else if (!urlFetchFailed && agentId) {
        console.log("🎯 Starting session with public agent ID:", agentId);
        await conversation.startSession({
          agentId: agentId,
        });
        console.log("✅ Session started with agent ID");
      } else {
        console.error(
          "❌ No valid way to start session - signedUrl:",
          signedUrl,
          "urlFetchFailed:",
          urlFetchFailed,
          "agentId:",
          agentId
        );
        throw new Error("Unable to start conversation - no valid credentials");
      }
    } catch (error) {
      console.error("❌ Failed to start conversation:", error);
      console.log("📊 Setting initializing to false due to error");
      setInitializing(false);
      toast.error("Erreur lors du démarrage de la conversation");
    }
  };

  const endConversation = async () => {
    console.log("🔚 Ending conversation");
    console.log("💬 Messages to send:", messages);

    try {
      const currentConversationId = conversation.getId();
      console.log(
        "🆔 Current ElevenLabs conversation ID:",
        currentConversationId
      );

      // End the session
      await conversation.endSession();
      console.log("✅ ElevenLabs session ended");

      setConversationStatus("analyzing");
      stopTimer();

      // Show analysis starting toast
      toast.info("Analyse de la conversation en cours...", {
        duration: 2000,
      });

      console.log("📡 Calling end API endpoint with messages");
      const response = await fetch(`/api/simulation/${conversationId}/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages,
          duration: elapsedTime,
        }),
      });

      const data = await response.json();
      console.log("📡 End API response:", data);

      if (response.ok) {
        let processedFeedback = data.feedback;

        // Check if analyse_complete contains JSON wrapped in backticks
        if (
          data.feedback?.analyse_complete &&
          typeof data.feedback.analyse_complete === "string"
        ) {
          try {
            let jsonContent = data.feedback.analyse_complete.trim();

            // Remove JSON backticks if present
            if (
              jsonContent.startsWith("```json") &&
              jsonContent.endsWith("```")
            ) {
              jsonContent = jsonContent
                .replace(/^```json\s*/, "")
                .replace(/\s*```$/, "");
            }

            // Try to parse as JSON
            const parsedContent = JSON.parse(jsonContent);
            console.log("✅ Successfully parsed JSON content:", parsedContent);

            // Replace the entire feedback with the parsed content
            processedFeedback = {
              id: data.feedback.id,
              conversation_id: data.feedback.conversation_id,
              created_at: data.feedback.created_at,
              ...parsedContent,
            };
          } catch (parseError) {
            console.warn(
              "⚠️ Failed to parse JSON content, using original feedback:",
              parseError
            );
            // Keep original feedback if parsing fails
          }
        }

        setFeedback(processedFeedback);
        setMessages(data.transcript || messages);
        setConversationStatus("ended");
        toast.success("Conversation analysée avec succès !", {
          duration: 3000,
        });
      } else {
        console.error("❌ End API failed:", data);
        setConversationStatus("ended");
        toast.error("Erreur lors de l'analyse de la conversation");
      }
    } catch (error) {
      console.error("❌ Error ending conversation:", error);
      setConversationStatus("ended");
      toast.error("Erreur lors de la fin de conversation");
    }
  };

  const stopConversation = useCallback(async () => {
    await endConversation();
  }, [conversation, messages, elapsedTime]);

  const startTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    setElapsedTime(0);
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    setTimerInterval(interval);
  };

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format time in HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [hours, minutes, secs]
      .map((val) => val.toString().padStart(2, "0"))
      .join(":");
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

  const getCallTypeLabel = (callType: string) => {
    switch (callType) {
      case "cold_call":
        return "Appel à froid";
      case "discovery_meeting":
        return "Découverte";
      case "product_demo":
        return "Démonstration";
      case "closing_call":
        return "Closing";
      case "follow_up_call":
        return "Suivi";
      default:
        return callType;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="svg-spinners:ring-resize"
            className="w-8 h-8 mx-auto mb-4"
          />
          <p>Chargement de la simulation...</p>
        </div>
      </div>
    );
  }

  if (!conversationData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="material-symbols:error"
            className="w-12 h-12 mx-auto mb-4 text-red-500"
          />
          <h1 className="text-xl font-bold mb-2">Conversation introuvable</h1>
          <p className="text-muted-foreground mb-4">
            Cette simulation n'existe pas ou vous n'y avez pas accès.
          </p>
          <Link href="/">
            <Button>Retour au dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {getCallTypeEmoji(conversationData.call_type)}
                  </span>
                  <div>
                    <h1 className="text-2xl font-bold">
                      Simulation Commerciale
                    </h1>
                    <p className="text-muted-foreground">
                      {getCallTypeLabel(conversationData.call_type)} •{" "}
                      {conversationData.agents?.name}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    conversationStatus === "connected" ? "default" : "secondary"
                  }
                >
                  {conversationStatus === "waiting" && "En attente"}
                  {conversationStatus === "connected" && "En cours"}
                  {conversationStatus === "analyzing" && "Analyse..."}
                  {conversationStatus === "ended" && "Terminée"}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono font-bold">
                  {formatTime(elapsedTime)}
                </div>
                <p className="text-sm text-muted-foreground">Durée</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Conversation Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Conversation Interface */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon
                    icon="material-symbols:headset-mic"
                    className="w-5 h-5"
                  />
                  Interface de Conversation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {conversationStatus === "waiting" && (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <div className="size-20 rounded-full overflow-hidden flex-shrink-0">
                        <img
                          src={
                            conversationData.agents?.picture_url ||
                            "/default-avatar.png"
                          }
                          alt={conversationData.agents?.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {conversationData.agents?.name}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {(conversationData.agents?.firstname ||
                        conversationData.agents?.lastname) && (
                        <span className="font-medium text-blue-600">
                          {conversationData.agents?.firstname}{" "}
                          {conversationData.agents?.lastname}
                        </span>
                      )}
                      {conversationData.agents?.job_title && (
                        <span className="block text-sm">
                          {conversationData.agents?.job_title}
                        </span>
                      )}
                    </p>
                    <Button
                      onClick={startConversation}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={initializing || loadingSignedUrl}
                    >
                      {initializing || loadingSignedUrl ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Phone className="w-5 h-5 mr-2" />
                      )}
                      {initializing || loadingSignedUrl
                        ? "Initialisation..."
                        : "Démarrer l'appel"}
                    </Button>
                  </div>
                )}

                {conversationStatus === "connected" && (
                  <div className="space-y-6">
                    {/* Live conversation display */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Agent visual */}
                      <div className="text-center">
                        <motion.div
                          className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center relative"
                          animate={
                            conversation.isSpeaking
                              ? {
                                  scale: [1, 1.05, 1],
                                  boxShadow: [
                                    "0 0 0 0 rgba(34, 197, 94, 0.4)",
                                    "0 0 0 10px rgba(34, 197, 94, 0.1)",
                                    "0 0 0 0 rgba(34, 197, 94, 0)",
                                  ],
                                }
                              : {}
                          }
                          transition={{
                            duration: 1.5,
                            repeat: conversation.isSpeaking ? Infinity : 0,
                            ease: "easeInOut",
                          }}
                        >
                          <AnimatePresence>
                            {conversation.isSpeaking && (
                              <motion.div
                                className="absolute inset-0 rounded-full border-4 border-white"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{
                                  scale: [0.8, 1.1, 0.8],
                                  opacity: [0, 1, 0],
                                }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                              />
                            )}
                          </AnimatePresence>
                          <div className="size-28 rounded-full overflow-hidden flex-shrink-0">
                            <img
                              src={
                                conversationData.agents?.picture_url ||
                                "/default-avatar.png"
                              }
                              alt={conversationData.agents?.name}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                        </motion.div>
                        <motion.p
                          className="text-sm text-muted-foreground"
                          animate={{
                            color: conversation.isSpeaking
                              ? "#22c55e"
                              : "#6b7280",
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          {conversation.isSpeaking
                            ? "En train de parler..."
                            : "À l'écoute"}
                        </motion.p>
                      </div>

                      {/* User camera */}
                      <div className="text-center">
                        <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-gray-100">
                          <img
                            src={USER_PROFILE_PICTURE}
                            alt="Votre profil"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">Vous</p>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex justify-center gap-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setIsMuted(!isMuted)}
                        className="flex items-center gap-2"
                      >
                        {isMuted ? (
                          <VolumeX className="w-5 h-5" />
                        ) : (
                          <Volume2 className="w-5 h-5" />
                        )}
                        {isMuted ? "Réactiver" : "Couper le son"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="lg"
                        onClick={stopConversation}
                        className="flex items-center gap-2"
                      >
                        <PhoneOff className="w-5 h-5" />
                        Terminer l'appel
                      </Button>
                    </div>
                  </div>
                )}

                {conversationStatus === "analyzing" && (
                  <div className="text-center py-8 space-y-6">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center"
                    >
                      <Icon
                        icon="svg-spinners:ring-resize"
                        className="w-16 h-16 mx-auto mb-4 text-blue-600"
                      />
                      <h3 className="text-xl font-semibold mb-2">
                        Analyse en cours...
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Nous analysons votre conversation pour générer un
                        feedback personnalisé
                      </p>
                    </motion.div>

                    {/* Skeleton for feedback */}
                    <div className="space-y-4">
                      <Skeleton className="h-8 w-32 mx-auto" />
                      <Skeleton className="h-4 w-64 mx-auto" />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="space-y-2">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {conversationStatus === "ended" && feedback && (
                  <motion.div
                    className="text-center py-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon
                      icon="material-symbols:check-circle"
                      className="w-16 h-16 mx-auto mb-4 text-green-600"
                    />
                    <h3 className="text-xl font-semibold mb-2">
                      Conversation terminée
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Votre performance a été analysée
                    </p>
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {feedback.note}/100
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Score global
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Feedback Section */}
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon
                        icon="material-symbols:analytics"
                        className="w-5 h-5"
                      />
                      Analyse de Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Score */}
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600 mb-2">
                        {feedback.note}/100
                      </div>
                      <Progress
                        value={feedback.note}
                        className="w-full max-w-md mx-auto"
                      />
                    </div>

                    {/* Points forts */}
                    {feedback.points_forts &&
                      feedback.points_forts.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                            <Icon
                              icon="material-symbols:thumb-up"
                              className="w-4 h-4"
                            />
                            Points forts
                          </h4>
                          <ul className="space-y-1">
                            {feedback.points_forts?.map(
                              (point: string, index: number) => (
                                <li
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <Icon
                                    icon="material-symbols:check"
                                    className="w-4 h-4 text-green-600 mt-0.5"
                                  />
                                  <span className="text-sm">{point}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                    {/* Axes d'amélioration */}
                    {feedback.axes_amelioration &&
                      feedback.axes_amelioration.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-orange-600 mb-2 flex items-center gap-2">
                            <Icon
                              icon="material-symbols:trending-up"
                              className="w-4 h-4"
                            />
                            Axes d'amélioration
                          </h4>
                          <ul className="space-y-1">
                            {feedback.axes_amelioration?.map(
                              (axe: string, index: number) => (
                                <li
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <Icon
                                    icon="material-symbols:arrow-right"
                                    className="w-4 h-4 text-orange-600 mt-0.5"
                                  />
                                  <span className="text-sm">{axe}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                    {/* Moments clés */}
                    {feedback.moments_cles &&
                      feedback.moments_cles.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-purple-600 mb-2 flex items-center gap-2">
                            <Icon
                              icon="material-symbols:key"
                              className="w-4 h-4"
                            />
                            Moments clés
                          </h4>
                          <ul className="space-y-1">
                            {feedback.moments_cles?.map(
                              (moment: string, index: number) => (
                                <li
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <Icon
                                    icon="material-symbols:timeline"
                                    className="w-4 h-4 text-purple-600 mt-0.5"
                                  />
                                  <span className="text-sm">{moment}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                    {/* Suggestions */}
                    {feedback.suggestions &&
                      feedback.suggestions.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                            <Icon
                              icon="material-symbols:lightbulb"
                              className="w-4 h-4"
                            />
                            Suggestions
                          </h4>
                          <ul className="space-y-1">
                            {feedback.suggestions?.map(
                              (suggestion: string, index: number) => (
                                <li
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <Icon
                                    icon="material-symbols:star"
                                    className="w-4 h-4 text-blue-600 mt-0.5"
                                  />
                                  <span className="text-sm">{suggestion}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                    {/* Analyse complète */}
                    {feedback.analyse_complete &&
                      typeof feedback.analyse_complete === "string" && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Icon
                              icon="material-symbols:article"
                              className="w-4 h-4"
                            />
                            Analyse détaillée
                          </h4>
                          <div className="space-y-3">
                            {feedback.analyse_complete
                              .split("\n\n")
                              .map((paragraph: string, index: number) => (
                                <p
                                  key={index}
                                  className="text-sm text-muted-foreground leading-relaxed text-justify"
                                >
                                  {paragraph.trim()}
                                </p>
                              ))}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Context Info */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Contexte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Agent</h4>
                  <p className="text-sm text-muted-foreground">
                    {conversationData.agents?.name}
                  </p>
                  {(conversationData.agents?.firstname ||
                    conversationData.agents?.lastname) && (
                    <p className="text-xs font-medium text-blue-600">
                      {conversationData.agents?.firstname}{" "}
                      {conversationData.agents?.lastname}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {conversationData.agents?.job_title}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Produit</h4>
                  <p className="text-sm text-muted-foreground">
                    {conversationData.products?.name}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Objectif</h4>
                  <p className="text-sm text-muted-foreground">
                    {conversationData.goal}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Secteur</h4>
                  <p className="text-sm text-muted-foreground">
                    {conversationData.context?.secteur || "Non spécifié"}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Entreprise</h4>
                  <p className="text-sm text-muted-foreground">
                    {conversationData.context?.company || "Non spécifiée"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Messages in sidebar during conversation */}
            {conversationStatus === "connected" && messages.length > 0 && (
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Icon icon="material-symbols:chat" className="w-4 h-4" />
                    Messages ({messages.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {messages.slice(-5).map((msg, index) => (
                      <motion.div
                        key={index}
                        initial={{
                          opacity: 0,
                          x: msg.role === "user" ? 20 : -20,
                        }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`text-xs p-2 rounded ${
                          msg.role === "user"
                            ? "bg-blue-100 text-blue-800 ml-4"
                            : "bg-gray-100 text-gray-800 mr-4"
                        }`}
                      >
                        <div className="font-medium">
                          {msg.role === "user" ? "Vous" : "Agent"}
                        </div>
                        <div className="truncate">{msg.content}</div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/simulation/configure" className="block">
                  <Button variant="outline" className="w-full">
                    <Icon
                      icon="material-symbols:refresh"
                      className="w-4 h-4 mr-2"
                    />
                    Nouvelle simulation
                  </Button>
                </Link>
                <Link href="/" className="block">
                  <Button variant="outline" className="w-full">
                    <Icon
                      icon="material-symbols:home"
                      className="w-4 h-4 mr-2"
                    />
                    Retour dashboard
                  </Button>
                </Link>
                {feedback && (
                  <Link
                    href={`/conversations/${conversationId}`}
                    className="block"
                  >
                    <Button variant="outline" className="w-full">
                      <Icon
                        icon="material-symbols:visibility"
                        className="w-4 h-4 mr-2"
                      />
                      Voir les détails
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
