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
import { Playwrite_IE } from "next/font/google";

const playwriteIE = Playwrite_IE({
  weight: "400",
});

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
  const feedbackRef = useRef<HTMLDivElement>(null);

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

  // Smooth scroll to feedback when it's available
  useEffect(() => {
    if (feedback && feedbackRef.current) {
      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 500);
    }
  }, [feedback]);

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
            </div>
          </CardHeader>
        </Card>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-0">
          {/* Left Context Cards */}
          <div className="space-y-3 lg:flex-shrink-0">
            {/* Post-it Note Style Card */}
            <div
              className={`relative w-full max-w-[22rem] mx-auto lg:mx-0 h-[22rem] p-8 rounded-lg shadow-lg transform rotate-[-1deg] hover:rotate-0 transition-transform duration-300 ${playwriteIE.className}`}
              style={{
                backgroundColor: "#E9E27B",
                boxShadow:
                  "0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              {/* Post-it tape effect */}
              <div
                className="absolute -top-2 left-8 w-16 h-6 bg-white/40 rounded-sm transform rotate-[-15deg]"
                style={{
                  background:
                    "linear-gradient(45deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)",
                }}
              />

              {/* Content */}
              <div className="space-y-4 text-left h-full flex flex-col">
                {/* Header */}
                <div className="border-b-2 border-yellow-600/30 pb-3">
                  <h3 className="text-lg font-bold text-zinc-900 opacity-60 mb-1">
                    Briefing de Simulation
                  </h3>
                  <div className="text-sm text-zinc-800 opacity-50 font-medium">
                    {getCallTypeLabel(conversationData.call_type)}
                  </div>
                </div>

                {/* Two Column Layout */}
                <div className="flex-1 flex">
                  {/* Left Column */}
                  <div className="flex-1 space-y-3 pr-4">
                    <div>
                      <div className="text-xs font-semibold text-zinc-900 opacity-60">
                        Commercial:
                      </div>
                      <div className="text-sm text-gray-700 font-medium opacity-60">
                        {conversationData.agents?.firstname &&
                        conversationData.agents?.lastname
                          ? `${conversationData.agents.firstname} ${conversationData.agents.lastname}`
                          : conversationData.agents?.name}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-zinc-900 opacity-60">
                        Poste:
                      </div>
                      <div className="text-sm text-gray-700 font-medium opacity-60">
                        {conversationData.agents?.job_title}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-zinc-900 opacity-60">
                        Objectif:
                      </div>
                      <div className="text-sm text-gray-700 font-medium opacity-60">
                        {conversationData.goal}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-zinc-900 opacity-60">
                        Secteur:
                      </div>
                      <div className="text-sm text-gray-700 font-medium opacity-60">
                        {conversationData.context?.secteur || "Non spécifié"}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="flex-1 space-y-3 pl-4">
                    <div>
                      <div className="text-xs font-semibold text-zinc-900 opacity-60">
                        Entreprise:
                      </div>
                      <div className="text-sm  text-gray-700 font-medium opacity-60">
                        {conversationData.context?.company || "Non spécifiée"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-zinc-900 opacity-60">
                        Produit:
                      </div>
                      <div className="text-sm  text-gray-700 font-medium opacity-60">
                        {conversationData.products?.name}
                      </div>
                    </div>

                    <div className="mt-auto pt-6">
                      <div className="text-xs font-semibold text-zinc-900 opacity-60">
                        Simulation:
                      </div>
                      <div className="text-xs text-gray-700 font-medium opacity-60">
                        #{conversationId.slice(-6)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* iPhone Interface */}
          <div className="flex justify-center lg:justify-start lg:pl-4">
            <div className="relative">
              {/* Side buttons positioned absolutely outside the iPhone */}
              {/* Volume buttons (left side) */}
              <div className="absolute left-[-4px] top-[100px] w-1 h-10 bg-gradient-to-r from-black to-gray-900 rounded-l-md z-30" />
              <div className="absolute left-[-4px] top-[150px] w-1 h-10 bg-gradient-to-r from-black to-gray-900 rounded-l-md z-30" />

              {/* Power button (right side) */}
              <div className="absolute right-[-4px] top-[120px] w-1 h-14 bg-gradient-to-l from-black to-gray-900 rounded-r-md z-30" />

              {/* iPhone Body with realistic metal edges */}
              <div
                className="relative w-72 h-[600px] rounded-[3rem] shadow-2xl overflow-hidden"
                style={{
                  border: "6px solid #000000",
                }}
              >
                {/* Background image with blur */}
                <div
                  className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage:
                      "url('https://i.pinimg.com/736x/d9/12/2f/d9122faa11f13d77fb39af1c81abe96c.jpg')",
                    filter: "blur(5px)",
                    transform: "scale(1.1)", // Slightly scale to hide blur edges
                  }}
                />

                {/* Outer shine ring */}
                <div
                  className="absolute -inset-1 rounded-[3.2rem] -z-10"
                  style={{
                    background:
                      "linear-gradient(135deg, #4a4a4a 0%, #000000 15%, #1a1a1a 30%, #000000 45%, #2a2a2a 60%, #000000 75%, #1a1a1a 90%, #000000 100%)",
                    padding: "2px",
                  }}
                />

                {/* Inner metal reflection */}
                <div
                  className="absolute -inset-0.5 rounded-[3.1rem] -z-5"
                  style={{
                    background:
                      "linear-gradient(45deg, #333333 0%, #000000 25%, #666666 50%, #000000 75%, #333333 100%)",
                    opacity: 0.3,
                  }}
                />

                {/* Dynamic Island (iPhone 15 Pro camera) */}
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />

                {/* iPhone Content */}
                <div className="absolute inset-4 flex flex-col justify-between">
                  {/* Top area with agent */}
                  <div className="flex-1 flex flex-col items-center justify-start mt-12">
                    {conversationStatus === "waiting" && (
                      <div className="text-center">
                        <div className="size-20 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <div className="size-18 rounded-full overflow-hidden">
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
                        <h3 className="text-white text-xl font-semibold mb-2 drop-shadow-lg">
                          {conversationData.agents?.firstname &&
                          conversationData.agents?.lastname
                            ? `${conversationData.agents.firstname} ${conversationData.agents.lastname}`
                            : conversationData.agents?.name}
                        </h3>
                      </div>
                    )}

                    {conversationStatus === "connected" && (
                      <div className="text-center">
                        {/* Timer above character circle */}
                        <motion.p
                          className="text-white text-lg font-semibold mb-6 drop-shadow-lg"
                          animate={{
                            color: conversation.isSpeaking
                              ? "#ffffff"
                              : "rgba(255, 255, 255, 0.9)",
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          {formatTime(elapsedTime)}
                        </motion.p>

                        {/* Smaller character circle, moved higher */}
                        <motion.div
                          className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center relative"
                          animate={
                            conversation.isSpeaking
                              ? {
                                  scale: [1, 1.08, 1],
                                  boxShadow: [
                                    "0 0 0 0 rgba(255, 255, 255, 0.4)",
                                    "0 0 0 8px rgba(255, 255, 255, 0.1)",
                                    "0 0 0 0 rgba(255, 255, 255, 0)",
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
                          <div className="w-12 h-12 rounded-full overflow-hidden">
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

                        <h3 className="text-white text-lg font-semibold mb-2 drop-shadow-lg">
                          {conversationData.agents?.firstname &&
                          conversationData.agents?.lastname
                            ? `${conversationData.agents.firstname} ${conversationData.agents.lastname}`
                            : conversationData.agents?.name}
                        </h3>

                        <motion.p
                          className="text-white/80 text-sm drop-shadow-lg"
                          animate={{
                            opacity: conversation.isSpeaking ? 1 : 0.8,
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          {conversation.isSpeaking
                            ? "En train de parler..."
                            : "En attente..."}
                        </motion.p>
                      </div>
                    )}

                    {conversationStatus === "analyzing" && (
                      <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Icon
                            icon="svg-spinners:ring-resize"
                            className="w-12 h-12 text-white"
                          />
                        </div>
                        <h3 className="text-white text-xl font-semibold mb-2 drop-shadow-lg">
                          Analyse en cours...
                        </h3>
                        <p className="text-white/80 text-sm drop-shadow-lg">
                          Génération du feedback
                        </p>
                      </div>
                    )}

                    {conversationStatus === "ended" && feedback && (
                      <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Icon
                            icon="material-symbols:check-circle"
                            className="w-12 h-12 text-green-400"
                          />
                        </div>
                        <h3 className="text-white text-xl font-semibold mb-2 drop-shadow-lg">
                          Appel terminé
                        </h3>
                        <p className="text-white/80 text-sm drop-shadow-lg">
                          Score: {feedback.note}/100
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bottom button area - moved higher */}
                  <div className="flex flex-col items-center pb-12 space-y-4">
                    {conversationStatus === "waiting" && (
                      <Button
                        onClick={startConversation}
                        size="lg"
                        disabled={initializing || loadingSignedUrl}
                        className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 border-0 shadow-lg"
                      >
                        {initializing || loadingSignedUrl ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        ) : (
                          <Icon icon="ion:call" className="w-6 h-6" />
                        )}
                      </Button>
                    )}

                    {conversationStatus === "connected" && (
                      <div className="flex flex-col items-center space-y-4">
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => setIsMuted(!isMuted)}
                          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
                        >
                          {isMuted ? (
                            <VolumeX className="w-5 h-5" />
                          ) : (
                            <Volume2 className="w-5 h-5" />
                          )}
                        </Button>
                        <Button
                          onClick={stopConversation}
                          size="lg"
                          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 border-0 shadow-lg"
                        >
                          <Icon
                            icon="majesticons:phone-hangup"
                            className="w-6 h-6"
                          />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Home indicator bar - smaller width */}
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-white/60 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions below iPhone */}
        <div className="flex justify-center">
          <div className="flex gap-4">
            <Link href="/simulation/configure">
              <Button variant="outline" className="flex items-center gap-2">
                <Icon icon="material-symbols:refresh" className="w-4 h-4" />
                Nouvelle simulation
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">
                <Icon icon="material-symbols:home" className="w-4 h-4" />
                Retour dashboard
              </Button>
            </Link>
            {feedback && (
              <Link href={`/conversations/${conversationId}`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <Icon
                    icon="material-symbols:visibility"
                    className="w-4 h-4"
                  />
                  Voir les détails
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Feedback Section */}
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            ref={feedbackRef}
          >
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon icon="material-symbols:analytics" className="w-5 h-5" />
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
                {feedback.points_forts && feedback.points_forts.length > 0 && (
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
                          <li key={index} className="flex items-start gap-2">
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
                            <li key={index} className="flex items-start gap-2">
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
                {feedback.moments_cles && feedback.moments_cles.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-purple-600 mb-2 flex items-center gap-2">
                      <Icon icon="material-symbols:key" className="w-4 h-4" />
                      Moments clés
                    </h4>
                    <ul className="space-y-1">
                      {feedback.moments_cles?.map(
                        (moment: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
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
                {feedback.suggestions && feedback.suggestions.length > 0 && (
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
                          <li key={index} className="flex items-start gap-2">
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
    </div>
  );
}
