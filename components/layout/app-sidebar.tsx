/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { useRouter, usePathname } from "next/navigation";

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: "fluent:home-24-filled",
  },
  {
    title: "Prospect",
    url: "/agents",
    icon: "fluent:people-12-filled",
  },
  {
    title: "Produits",
    url: "/products",
    icon: "majesticons:box",
  },
];

export function AppSidebar() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: conversationsData } = await supabase
          .from("conversations")
          .select(
            `
            *,
            agents:agent_id (name, job_title),
            feedback:feedback_id (note)
          `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        setConversations(conversationsData || []);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
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

  const isActiveRoute = (url: string) => {
    return pathname === url;
  };

  const isActiveConversation = (conversationId: string) => {
    return pathname === `/conversations/${conversationId}`;
  };

  const getScoreBadgeColor = (score: number) => {
    if (score <= 20) return "bg-red-600";
    if (score <= 40) return "bg-orange-600";
    if (score <= 60) return "bg-yellow-600";
    if (score <= 80) return "bg-[#33a725]";
    return "bg-emerald-600";
  };

  return (
    <Sidebar className="scrollbar-hide">
      <SidebarContent className="scrollbar-hide">
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold mb-4 pt-4 flex items-center gap-2">
            <img src={"/logo.png"} className="size-8" />
            <p className="text-xl font-bold text-foreground">SforSales</p>
          </SidebarGroupLabel>
          <SidebarGroupContent className="pt-4">
            <div className="mb-4">
              <Link href="/simulation/configure">
                <Button className="w-[60%] shannen-gradient font-bold hover:brightness-105 py-5 border-purple-200/50 text-white transition-opacity">
                  <Icon icon="mdi:phone" className="mr-1 h-4 w-4" />
                  Démarrer !
                </Button>
              </Link>
            </div>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      href={item.url}
                      className={`flex items-center gap-3 ${
                        isActiveRoute(item.url)
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }`}
                    >
                      <Icon
                        icon={item.icon}
                        className="size-5 text-foreground/80"
                      />
                      <span className="flex-1">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Conversations Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold text-muted-foreground">
            Conversations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                // Loading skeleton
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-8 bg-gray-100 rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : conversations.length > 0 ? (
                // Conversation list
                conversations.map((conversation) => (
                  <SidebarMenuItem key={conversation.id}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={`/conversations/${conversation.id}`}
                        className={`flex items-center gap-2 p-2 min-h-[2rem] ${
                          isActiveConversation(conversation.id)
                            ? "bg-accent text-accent-foreground"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 w-full min-w-0">
                          {/* Agent name */}
                          <p className="text-xs font-medium truncate flex-1">
                            {conversation.agents?.name || "Agent inconnu"}
                          </p>

                          {/* Score */}
                          {conversation.feedback?.note && (
                            <Badge
                              className={`${getScoreBadgeColor(
                                conversation.feedback.note
                              )} rounded-sm font-mono px-1 text-white text-[.6rem] font-bold`}
                            >
                              {conversation.feedback.note}/100
                            </Badge>
                          )}

                          {/* Date */}
                          <p className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDate(conversation.created_at)}
                          </p>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                // No conversations
                <div className="px-3 py-2">
                  <p className="text-sm text-muted-foreground text-center">
                    Aucune conversation
                  </p>
                  <Link
                    href="/simulation/configure"
                    className="text-sm text-[#781397] hover:text-[#79408a] block text-center mt-2"
                  >
                    Créer votre première
                  </Link>
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <Icon icon="mdi:logout" className="mr-2 h-4 w-4" />
          Se déconnecter
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
