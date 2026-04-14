/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@iconify/react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  Agent,
  Product,
  CallType,
  HistoriqueRelation,
} from "@/lib/types/database";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "../ui/skeleton";

type HistoryMode = "zero" | "manual" | "previous";

interface PreviousConversation {
  id: string;
  call_type: string;
  created_at: string;
  summary: string;
  feedback?: { note: number } | null;
}

interface SimulationConfig {
  agent: Agent | null;
  product: Product | null;
  callType: CallType | null;
  goal: string;
  maxDuration: number;
  historyMode: HistoryMode;
  historyContext: string;
  historyUntilId: string | null;
  context: {
    secteur: string;
    company: string;
    historique_relation: HistoriqueRelation;
  };
}

const durationOptions = [
  { label: "30 min", value: 1800 },
  { label: "45 min", value: 2700 },
  { label: "60 min", value: 3600 },
];

const callTypes = [
  {
    id: "cold_call" as CallType,
    title: "🔍 Cold call",
    objective: "Décrocher un rendez-vous",
    criteria: "RDV confirmé avec date/heure",
  },
  {
    id: "discovery_meeting" as CallType,
    title: "📅 Rendez-vous de découverte",
    objective: "Qualifier le besoin et budgeter",
    criteria: "Budget confirmé + besoins qualifiés",
  },
  {
    id: "product_demo" as CallType,
    title: "💻 Démo produit",
    objective: "Convaincre avec une proposition personnalisée",
    criteria: "Intérêt confirmé + next step défini",
  },
  {
    id: "closing_call" as CallType,
    title: "✅ Appel de closing",
    objective: "Signer le contrat",
    criteria: "Accord verbal ou signature",
  },
  {
    id: "follow_up_call" as CallType,
    title: "🔄 Appel de relance",
    objective: "Relancer après devis/proposition",
    criteria: "Déblocage d'objections + nouveau délai",
  },
];

const historiqueOptions: HistoriqueRelation[] = [
  "Premier contact",
  "2ème appel",
  "Relance post-devis",
];

export function SimulationStepper() {
  const [currentStep, setCurrentStep] = useState(1);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingSimulation, setStartingSimulation] = useState(false);
  const [previousConversations, setPreviousConversations] = useState<PreviousConversation[]>([]);
  const [config, setConfig] = useState<SimulationConfig>({
    agent: null,
    product: null,
    callType: null,
    goal: "",
    maxDuration: 2700,
    historyMode: "zero",
    historyContext: "",
    historyUntilId: null,
    context: {
      secteur: "",
      company: "",
      historique_relation: "Premier contact",
    },
  });

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  // Load saved config when agent is selected
  useEffect(() => {
    if (config.agent?.id) {
      loadSavedConfig(config.agent.id);
    }
  }, [config.agent?.id]);

  // Load previous conversations when agent + product are selected
  useEffect(() => {
    if (config.agent?.id && config.product?.id) {
      loadPreviousConversations(config.agent.id, config.product.id);
    } else {
      setPreviousConversations([]);
    }
  }, [config.agent?.id, config.product?.id]);

  const loadPreviousConversations = async (agentId: string, productId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("conversations")
        .select("id, call_type, created_at, summary, feedback:feedback_id(note)")
        .eq("user_id", user.id)
        .eq("agent_id", agentId)
        .eq("product_id", productId)
        .not("summary", "is", null)
        .order("created_at", { ascending: true });

      setPreviousConversations((data as any) || []);
    } catch (error) {
      console.error("Error loading previous conversations:", error);
    }
  };

  const loadSavedConfig = (agentId: string) => {
    try {
      const savedConfig = localStorage.getItem(`agent_config_${agentId}`);
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        console.log(`📂 Loading saved config for agent ${agentId}:`, parsedConfig);
        setConfig((prevConfig) => ({
          ...prevConfig,
          goal: parsedConfig.goal || "",
          context: {
            ...prevConfig.context,
            secteur: parsedConfig.context?.secteur || "",
            company: parsedConfig.context?.company || "",
            historique_relation:
              parsedConfig.context?.historique_relation || "Premier contact",
          },
          // Also restore product and call type if saved
          product: parsedConfig.product_id ? 
            products.find(p => p.id === parsedConfig.product_id) || prevConfig.product : 
            prevConfig.product,
          callType: parsedConfig.call_type || prevConfig.callType,
        }));
        console.log("✅ Configuration loaded successfully");
      } else {
        console.log(`📭 No saved config found for agent ${agentId}`);
      }
    } catch (error) {
      console.error("Error loading saved config:", error);
    }
  };

  const saveConfig = (agentId: string, configToSave: any) => {
    try {
      const currentSaved = localStorage.getItem(`agent_config_${agentId}`);
      const existingConfig = currentSaved ? JSON.parse(currentSaved) : {};

      const updatedConfig = {
        ...existingConfig,
        ...configToSave,
        context: {
          ...existingConfig.context,
          ...configToSave.context,
        },
      };

      localStorage.setItem(
        `agent_config_${agentId}`,
        JSON.stringify(updatedConfig)
      );
      console.log(`💾 Saved config for agent ${agentId}:`, updatedConfig);
    } catch (error) {
      console.error("Error saving config:", error);
    }
  };

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté");
        return;
      }

      const [agentsResponse, productsResponse] = await Promise.all([
        supabase
          .from("agents")
          .select("*")
          .or(`user_id.eq.${user.id},user_id.is.null`)
          .order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select("*")
          .or(`user_id.eq.${user.id},user_id.is.null`)
          .order("created_at", { ascending: false }),
      ]);

      setAgents(agentsResponse.data || []);
      setProducts(productsResponse.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return config.agent !== null;
      case 2:
        return config.product !== null;
      case 3:
        return config.callType !== null;
      case 4:
        return (
          config.goal.trim() !== "" &&
          config.context.secteur.trim() !== "" &&
          config.context.company.trim() !== ""
        );
      default:
        return false;
    }
  };

  const startSimulation = async () => {
    if (!canProceed()) return;

    try {
      setStartingSimulation(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté");
        return;
      }

      // Save the final complete configuration before starting
      if (config.agent?.id) {
        console.log("💾 Saving final configuration before starting simulation");
        saveConfig(config.agent.id, {
          goal: config.goal,
          context: config.context,
          // Also save product and call type for complete config
          product_id: config.product?.id,
          call_type: config.callType,
        });
      }

      // Clean up any previous localStorage configurations to avoid conflicts (except current agent)
      console.log("🧹 Cleaning up previous localStorage configurations");
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('agent_config_') && key !== `agent_config_${config.agent?.id}`) {
          localStorage.removeItem(key);
        }
      });

      // Build history fields
      const historyConversationIds =
        config.historyMode === "previous" && config.historyUntilId
          ? previousConversations
              .slice(0, previousConversations.findIndex(c => c.id === config.historyUntilId) + 1)
              .map(c => c.id)
          : null;

      // Create conversation record
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          agent_id: config.agent!.id,
          product_id: config.product!.id,
          goal: config.goal,
          context: config.context,
          call_type: config.callType,
          max_duration_seconds: config.maxDuration,
          history_context: config.historyMode === "manual" ? config.historyContext : null,
          history_conversation_ids: historyConversationIds,
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to simulation
      router.push(`/simulation/${conversation.id}`);
    } catch (error) {
      console.error("Error starting simulation:", error);
      toast.error("Erreur lors du démarrage de la simulation");
    } finally {
      setStartingSimulation(false);
    }
  };

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-full min-w-[500px]" />
        <div className="space-y-6">
          <Skeleton className="h-8 w-full min-w-[400px]" />
          <div className="grid grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full min-w-[250px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-0">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center pl-0 ml-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep
                  ? "bg-[#9516C7] text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {step}
            </div>
            {step < 4 && (
              <div
                className={`w-14 h-0.5 ${
                  step < currentStep ? "bg-[#9516C7]" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="min-h-[500px] shadow-soft overflow-hidden">
        <CardHeader>
          <CardTitle>
            {currentStep === 1 && "Choisissez votre prospect"}
            {currentStep === 2 && "Sélectionnez le produit"}
            {currentStep === 3 && "Type d'appel"}
            {currentStep === 4 && "Contexte et situation"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <AnimatePresence mode="wait" custom={currentStep}>
            <motion.div
              key={currentStep}
              custom={currentStep}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
            >
              {/* Step 1: Choose Agent */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Sélectionnez l'agent avec qui vous souhaitez vous entraîner
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map((agent) => (
                      <motion.div
                        key={agent.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card
                          className={`cursor-pointer transition-all ${
                            config.agent?.id === agent.id
                              ? "ring-2 ring-[#9516C7] bg-blue-50"
                              : "hover:shadow-md"
                          } shadow-soft`}
                          onClick={() => setConfig({ ...config, agent })}
                        >
                          <CardContent className="p-4 py-0">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden flex-shrink-0">
                                <img
                                  src={
                                    agent.picture_url || "/default-avatar.png"
                                  }
                                  alt={agent.name || "Agent"}
                                  className="w-full h-full object-cover object-top"
                                />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold">
                                  {agent.firstname && agent.lastname
                                    ? `${agent.firstname} ${agent.lastname}`
                                    : agent.name}
                                </h3>
                                <p className="text-sm text-muted-foreground truncate max-w-[10rem]">
                                  {agent.job_title}
                                </p>
                                <Badge variant="outline" className="mt-1">
                                  {agent.difficulty}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Choose Product */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Choisissez le produit que vous allez présenter
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map((product) => (
                      <motion.div
                        key={product.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card
                          className={`cursor-pointer transition-all ${
                            config.product?.id === product.id
                              ? "ring-2 ring-[#9516C7] bg-blue-50"
                              : "hover:shadow-md"
                          } shadow-soft`}
                          onClick={() => setConfig({ ...config, product })}
                        >
                          <CardContent className="p-4 py-0">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Icon
                                  icon="material-symbols:package-2"
                                  className="h-5 w-5 text-[#9516C7]"
                                />
                                <h3 className="font-semibold">
                                  {product.name}
                                </h3>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {product.pitch}
                              </p>
                              <div className="flex items-center justify-between">
                                <Badge variant="outline">
                                  {product.marche}
                                </Badge>
                                {product.price && (
                                  <span className="text-sm font-semibold text-green-600">
                                    {product.price}€
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Choose Call Type */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Définissez l'objectif de votre appel
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {callTypes.map((callType) => (
                      <motion.div
                        key={callType.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card
                          className={`cursor-pointer transition-all ${
                            config.callType === callType.id
                              ? "ring-2 ring-[#9516C7] bg-blue-50"
                              : "hover:shadow-md"
                          } shadow-soft`}
                          onClick={() =>
                            setConfig({ ...config, callType: callType.id })
                          }
                        >
                          <CardContent className="p-4 py-0">
                            <div className="space-y-2">
                              <h3 className="font-semibold text-lg">
                                {callType.title}
                              </h3>
                              <p className="text-sm">
                                <strong>Objectif:</strong> {callType.objective}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <strong>Critères de réussite:</strong>{" "}
                                {callType.criteria}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Context and Goal */}
              {currentStep === 4 && (
                <div className="space-y-6 w-full max-w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Contexte de l'appel</h3>
                      <div>
                        <Label htmlFor="secteur">Secteur d'activité</Label>
                        <Input
                          id="secteur"
                          placeholder="Ex: E-commerce, SaaS, Finance..."
                          value={config.context.secteur}
                          onChange={(e) => {
                            const newConfig = {
                              ...config,
                              context: {
                                ...config.context,
                                secteur: e.target.value,
                              },
                            };
                            setConfig(newConfig);
                            // Save to localStorage
                            if (config.agent?.id) {
                              saveConfig(config.agent.id, {
                                context: {
                                  ...config.context,
                                  secteur: e.target.value,
                                },
                              });
                            }
                          }}
                          className="shadow-soft mt-3 placeholder:text-foreground/20"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company">Nom de l'entreprise</Label>
                        <Input
                          id="company"
                          placeholder="Ex: TechCorp, StartupXYZ..."
                          value={config.context.company}
                          onChange={(e) => {
                            const newConfig = {
                              ...config,
                              context: {
                                ...config.context,
                                company: e.target.value,
                              },
                            };
                            setConfig(newConfig);
                            // Save to localStorage
                            if (config.agent?.id) {
                              saveConfig(config.agent.id, {
                                context: {
                                  ...config.context,
                                  company: e.target.value,
                                },
                              });
                            }
                          }}
                          className="shadow-soft mt-3 placeholder:text-foreground/20"
                        />
                      </div>
                      <div>
                        <Label htmlFor="historique">
                          Historique de la relation
                        </Label>
                        <select
                          className="w-full p-2 border rounded-md shadow-soft mt-3"
                          value={config.context.historique_relation}
                          onChange={(e) => {
                            const newConfig = {
                              ...config,
                              context: {
                                ...config.context,
                                historique_relation: e.target
                                  .value as HistoriqueRelation,
                              },
                            };
                            setConfig(newConfig);
                            // Save to localStorage
                            if (config.agent?.id) {
                              saveConfig(config.agent.id, {
                                context: {
                                  ...config.context,
                                  historique_relation: e.target
                                    .value as HistoriqueRelation,
                                },
                              });
                            }
                          }}
                        >
                          {historiqueOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="duration">Durée de l'appel</Label>
                        <select
                          id="duration"
                          className="w-full p-2 border rounded-md shadow-soft mt-3"
                          value={config.maxDuration}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              maxDuration: Number(e.target.value),
                            })
                          }
                        >
                          {durationOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold">Contexte personnalis&eacute;</h3>
                      <div>
                        <Label htmlFor="goal">
                          D&eacute;crivez la situation pour que le prospect comprenne le contexte de l&apos;appel
                        </Label>
                        <Textarea
                          id="goal"
                          placeholder="Ex: Le prospect a déjà vu une démo la semaine dernière. Il hésite entre nous et un concurrent. Il a un budget de 50k et veut closer avant fin de mois. Il a des questions sur l'intégration technique..."
                          value={config.goal}
                          onChange={(e) => {
                            const newConfig = {
                              ...config,
                              goal: e.target.value,
                            };
                            setConfig(newConfig);
                            // Save to localStorage
                            if (config.agent?.id) {
                              saveConfig(config.agent.id, {
                                goal: e.target.value,
                              });
                            }
                          }}
                          rows={6}
                          className="shadow-soft resize-none mt-3 placeholder:text-foreground/20 min-h-[10rem]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Historique de la relation */}
                  <div className="space-y-3 pt-2">
                    <Label className="font-semibold text-base">Historique de la relation</Label>
                    <div className="space-y-3 mt-1">
                      <label className="flex items-center gap-3 cursor-pointer py-1">
                        <input type="radio" name="historyMode" value="zero" checked={config.historyMode === "zero"} onChange={() => setConfig({ ...config, historyMode: "zero", historyContext: "", historyUntilId: null })} className="accent-[#9516C7] w-4 h-4 shrink-0" />
                        <span className="text-sm">Repartir de zéro</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer py-1">
                        <input type="radio" name="historyMode" value="manual" checked={config.historyMode === "manual"} onChange={() => setConfig({ ...config, historyMode: "manual", historyUntilId: null })} className="accent-[#9516C7] w-4 h-4 shrink-0" />
                        <span className="text-sm">Saisir manuellement</span>
                      </label>
                      {config.historyMode === "manual" && (
                        <Textarea
                          placeholder="Décrivez le contexte de vos échanges précédents avec ce prospect..."
                          value={config.historyContext}
                          onChange={(e) => setConfig({ ...config, historyContext: e.target.value })}
                          rows={5}
                          className="shadow-soft resize-none placeholder:text-foreground/20 ml-7 w-[calc(100%-1.75rem)] max-w-full min-h-[8rem]"
                        />
                      )}
                      <label className={`flex items-start gap-3 py-1 ${previousConversations.length === 0 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
                        <input type="radio" name="historyMode" value="previous" checked={config.historyMode === "previous"} disabled={previousConversations.length === 0} onChange={() => setConfig({ ...config, historyMode: "previous", historyContext: "" })} className="accent-[#9516C7] w-4 h-4 shrink-0 mt-0.5" />
                        <span className="text-sm flex flex-col gap-0.5">
                          <span>Reprendre l&apos;historique des appels</span>
                          {previousConversations.length === 0 && (
                            <span className="text-xs text-muted-foreground">Aucun appel précédent pour ce prospect + produit</span>
                          )}
                        </span>
                      </label>
                      {config.historyMode === "previous" && previousConversations.length > 0 && (
                        <div className="ml-6">
                          <Label className="text-xs text-muted-foreground mb-2 block">Reprendre l&apos;historique jusqu&apos;à :</Label>
                          <select
                            className="w-full p-2 border rounded-md shadow-soft text-sm"
                            value={config.historyUntilId ?? ""}
                            onChange={(e) => setConfig({ ...config, historyUntilId: e.target.value || null })}
                          >
                            <option value="">-- Choisir un appel --</option>
                            {previousConversations.map((conv, index) => {
                              const callTypeLabels: Record<string, string> = { cold_call: "Cold call", discovery_meeting: "Découverte", product_demo: "Démo produit", closing_call: "Closing", follow_up_call: "Relance" };
                              const date = new Date(conv.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
                              const label = `${callTypeLabels[conv.call_type] || conv.call_type} — ${date}${(conv.feedback as any)?.note ? ` — ${(conv.feedback as any).note}/100` : ""}`;
                              return (
                                <option key={conv.id} value={conv.id}>
                                  {label} {index > 0 ? `(inclut ${index + 1} appels)` : ""}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">
                      Récapitulatif de votre simulation
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="pt-4 shadow-soft">
                        <CardContent className="p-4 py-0">
                          <h4 className="font-medium mb-2">Prospect</h4>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden flex-shrink-0">
                              <img
                                src={
                                  config.agent?.picture_url ||
                                  "/default-avatar.png"
                                }
                                alt={config.agent?.name || "Agent"}
                                className="w-full h-full object-cover object-top"
                              />
                            </div>

                            <div>
                              <p className="text-sm font-medium">
                                {config.agent?.firstname &&
                                config.agent?.lastname
                                  ? `${config.agent.firstname} ${config.agent.lastname}`
                                  : config.agent?.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {config.agent?.job_title}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="py-4 shadow-soft">
                        <CardContent className="p-4 py-0">
                          <h4 className="font-medium mb-2">Produit</h4>
                          <p className="text-sm font-medium">
                            {config.product?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {config.product?.marche}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="pt-0 shadow-soft">
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">Type d'appel</h4>
                          <p className="text-sm">
                            {
                              callTypes.find((ct) => ct.id === config.callType)
                                ?.title
                            }
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Précédent
        </Button>

        {currentStep < 4 ? (
          <Button onClick={nextStep} disabled={!canProceed()}>
            Suivant
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={startSimulation}
            disabled={!canProceed() || startingSimulation}
            className="bg-[#9516C7] hover:bg-[#c074de] cursor-pointer"
          >
            {startingSimulation ? (
              <Icon icon="mdi:loading" className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {startingSimulation ? "Démarrage..." : "Démarrer la simulation"}
          </Button>
        )}
      </div>
    </div>
  );
}
