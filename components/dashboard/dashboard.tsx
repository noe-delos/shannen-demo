/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import { createClient } from "@/utils/supabase/client";
import { Conversation, Agent, Product } from "@/lib/types/database";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export function Dashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Load conversations
          const { data: conversationsData } = await supabase
            .from("conversations")
            .select(
              `
              *,
              agents:agent_id (name, job_title, picture_url, firstname, lastname),
              feedback:feedback_id (note)
            `
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5);

          // Load agents
          const { data: agentsData } = await supabase
            .from("agents")
            .select("*")
            .limit(4);

          // Load products
          const { data: productsData } = await supabase
            .from("products")
            .select("*")
            .limit(4);

          setConversations(conversationsData || []);
          setAgents(agentsData || []);
          setProducts(productsData || []);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supabase]);

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  const getMarcheEmoji = (marche: string) => {
    if (
      marche.toLowerCase().includes("pme") ||
      marche.toLowerCase().includes("startup")
    )
      return "🚀";
    if (
      marche.toLowerCase().includes("commerce") ||
      marche.toLowerCase().includes("digital")
    )
      return "🛒";
    if (
      marche.toLowerCase().includes("entreprise") ||
      marche.toLowerCase().includes("grande")
    )
      return "🏢";
    if (
      marche.toLowerCase().includes("saas") ||
      marche.toLowerCase().includes("service")
    )
      return "💻";
    return "📦";
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

  const getDifficultyEmoji = (difficulty: string) => {
    switch (difficulty) {
      case "facile":
        return "😊";
      case "moyen":
        return "😐";
      case "difficile":
        return "😤";
      default:
        return "🤖";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return "Aujourd'hui";
    if (diffInDays === 1) return "Hier";
    if (diffInDays < 7) return `Il y a ${diffInDays} jours`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const handleAgentClick = (agent: Agent) => {
    router.push(`/agents?open=${agent.id}`);
  };

  const handleProductClick = (product: Product) => {
    router.push(`/products?open=${product.id}`);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>

        {/* Conversations Section Skeleton */}
        <div className="flex gap-6">
          <div className="flex-1 space-y-4">
            {/* Plus button skeleton */}
            <div className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
            {/* Conversation cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-gray-200 rounded-lg animate-pulse"
                ></div>
              ))}
            </div>
          </div>
          {/* CTA skeleton */}
          <div className="w-80 h-48 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>

        {/* Agents Section Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 rounded-lg animate-pulse"
              ></div>
            ))}
          </div>
        </div>

        {/* Products Section Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-36 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-gray-200 rounded-lg animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {/* Conversations Section */}
      <motion.section variants={item}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-2xl font-bold">Vos conversations</h1>
              <p className="text-muted-foreground">
                Liste de vos conversations passées
              </p>
            </div>
            <Badge variant="secondary" className="text-sm font-medium">
              {conversations.length} conversation
              {conversations.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex-1">
            <div className="flex flex-col md:flex-row gap-4 w-fit">
              {/* New Conversation CTA - Square with max width */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-shrink-0"
              >
                <Link href="/simulation/configure">
                  <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer size-[8rem] md:size-[10rem] flex items-center justify-center shadow-soft">
                    <div className="flex flex-col items-center gap-2">
                      <Icon
                        icon="mdi:plus"
                        className="h-6 w-6 text-muted-foreground"
                      />
                      <p className="text-sm font-medium text-muted-foreground text-center">
                        Nouvel appel
                      </p>
                    </div>
                  </Card>
                </Link>
              </motion.div>

              {/* Recent Conversations Grid */}
              {conversations.length > 0 && (
                <div className="relative">
                  <div className="flex flex-row gap-4 overflow-x-auto md:max-w-[40rem] scrollbar-hide pb-2 pr-20">
                    {conversations.slice(0, 4).map((conversation: any) => (
                      <motion.div key={conversation.id}>
                        <Link href={`/conversations/${conversation.id}`}>
                          <Card className="cursor-pointer hover:bg-foreground/5 hover:shadow-soft transition-all size-[8rem] md:size-[10rem] shadow-soft pt-0">
                            <CardContent className="p-3 md:p-4 h-full flex flex-col">
                              <div className="items-center gap-2 md:gap-3 h-full flex flex-col">
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
                                <div className="flex-1 min-w-0 text-center">
                                  <p className="font-medium text-xs md:text-sm truncate">
                                    {conversation.agents?.firstname &&
                                    conversation.agents?.lastname
                                      ? `${conversation.agents.firstname} ${conversation.agents.lastname}`
                                      : conversation.agents?.name ||
                                        "Agent inconnu"}
                                  </p>
                                  <p className="text-xs text-muted-foreground max-w-28 truncate">
                                    {conversation.agents?.job_title}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDate(conversation.created_at)}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                  {/* Fadeout gradient */}
                  <div className="absolute top-0 right-0 h-full w-8 md:w-12 bg-gradient-to-l from-background to-transparent pointer-events-none"></div>
                </div>
              )}
            </div>
          </div>

          {/* CTA Square on the right - Bigger Height */}
          <div className="hidden lg:block w-80">
            <Card className="h-[15rem] shannen-gradient border-purple-200/50 flex items-center justify-center shadow-soft overflow-hidden">
              <div className="text-center">
                <img
                  src={"/logo.png"}
                  className="w-12 h-12 mx-auto mb-3 filter brightness-0 invert"
                />
                <p className="text-lg font-semibold text-white mb-1 drop-shadow-md">
                  Vendez avec authenticité
                </p>
                <p className="text-sm text-white/90 mb-4 max-w-[15rem] drop-shadow-sm">
                  Méthode Shannen • Sans forcer, sans travestir
                </p>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm transition-all duration-300 hover:scale-105"
                  onClick={() =>
                    window.open(
                      "https://sforsales.substack.com/subscribe",
                      "_blank"
                    )
                  }
                >
                  Rejoindre la masterclass
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </motion.section>

      {/* Agents Section */}
      <motion.section variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Agents disponibles</h2>
          <Link href="/agents">
            <Button variant="outline" size="sm">
              <Icon icon="mdi:plus" className="h-4 w-4 mr-2" />
              Créer un agent
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent) => (
            <motion.div key={agent.id} whileHover={{ scale: 1.02 }}>
              <Card
                className="cursor-pointer hover:shadow-soft transition-shadow shadow-soft"
                onClick={() => handleAgentClick(agent)}
              >
                <CardContent className="p-4 py-0">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden flex-shrink-0">
                        <img
                          src={agent.picture_url || "/default-avatar.png"}
                          alt={agent.name || "Agent"}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <span className="absolute -bottom-1 -right-1 text-lg">
                        {getDifficultyEmoji(agent.difficulty || "")}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {agent.firstname && agent.lastname
                          ? `${agent.firstname} ${agent.lastname}`
                          : agent.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {agent.job_title}
                      </p>
                    </div>
                    <Badge
                      className={getDifficultyColor(agent.difficulty || "")}
                    >
                      {agent.difficulty}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Products Section */}
      <motion.section variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Produits</h2>
          <Link href="/products">
            <Button variant="outline" size="sm">
              <Icon icon="mdi:plus" className="h-4 w-4 mr-2" />
              Ajouter un produit
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <motion.div key={product.id} whileHover={{ scale: 1.02 }}>
              <Card
                className="cursor-pointer hover:shadow-soft transition-shadow shadow-soft"
                onClick={() => handleProductClick(product)}
              >
                <CardContent className="p-4 py-0">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">
                        {getMarcheEmoji(product.marche || "")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {product.marche}
                      </p>
                    </div>
                    {product.price && (
                      <span className="text-xs font-semibold text-green-600">
                        {product.price}€
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}
