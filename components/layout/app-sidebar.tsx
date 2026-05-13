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
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { Dancing_Script } from "next/font/google";

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: "fluent:home-24-filled",
    adminOnly: false,
  },
  {
    title: "Suivi & analytics",
    url: "/admin",
    icon: "fluent:chart-multiple-24-filled",
    adminOnly: true,
  },
  {
    title: "Prospect",
    url: "/agents",
    icon: "fluent:people-12-filled",
    adminOnly: false,
  },
  {
    title: "Produits",
    url: "/products",
    icon: "majesticons:box",
    adminOnly: false,
  },
];

export function AppSidebar() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { setOpenMobile } = useSidebar();

  const closeMobile = () => setOpenMobile(false);

  useEffect(() => {
    loadConversations();
  }, []);

  // Refresh conversations when navigating back to dashboard or key routes
  useEffect(() => {
    if (pathname === "/" || pathname.startsWith("/conversations")) {
      loadConversations();
    }
  }, [pathname]);

  // Also refresh on window focus (when user comes back to the app)
  useEffect(() => {
    const handleFocus = () => {
      loadConversations();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const loadConversations = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [conversationsResponse, monthlyResponse, profileResponse] = await Promise.all([
          supabase
            .from("conversations")
            .select(`*, agents:agent_id (name, job_title), feedback:feedback_id (note)`)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .gte("created_at", monthStart.toISOString()),
          supabase
            .from("users")
            .select("firstname, lastname, picture_url, email, is_admin")
            .eq("id", user.id)
            .single(),
        ]);

        setConversations(conversationsResponse.data || []);
        setMonthlyCount(monthlyResponse.count ?? 0);
        setUserProfile(profileResponse.data);
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
    const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffInDays = Math.round((nowDay.getTime() - dateDay.getTime()) / (1000 * 60 * 60 * 24));

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
            <img src={"/logo.png"} className="size-6" />
            <p
              className={`text-2xl font-extrabold text-foreground ${dancingScript.className}`}
            >
              Hello Michel.
            </p>
          </SidebarGroupLabel>
          <SidebarGroupContent className="pt-4">
            <div className="mb-4">
              {monthlyCount >= 90 ? (
                <div className="flex flex-col items-center gap-3">
                  <Button
                    className="w-full shannen-gradient font-bold py-5 border-purple-200/50 text-white opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <Icon icon="mdi:phone" className="mr-1 h-4 w-4" />
                    Démarrer !
                  </Button>
                  <p className="text-xs text-red-500 font-medium text-center">
                    Limite atteinte · Réinitialisation le 1er
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Link href="/simulation/configure" onClick={closeMobile}>
                    <Button className="w-full shannen-gradient font-bold hover:brightness-105 py-5 border-purple-200/50 text-white transition-opacity">
                      <Icon icon="mdi:phone" className="mr-1 h-4 w-4" />
                      Démarrer !
                    </Button>
                  </Link>
                  <div className="w-full">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-muted-foreground">Simulations ce mois-ci</span>
                      <span className="text-xs font-semibold text-[#9516C7]">{monthlyCount}/90</span>
                    </div>
                    <div className="h-1 w-full bg-purple-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#9516C7] rounded-full transition-all duration-300"
                        style={{ width: `${(monthlyCount / 90) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <SidebarMenu>
              {items
                .filter((item) => !item.adminOnly || userProfile?.is_admin)
                .map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      href={item.url}
                      onClick={closeMobile}
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
                        onClick={closeMobile}
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
                    onClick={closeMobile}
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
      <SidebarFooter className="border-t pt-3">
        <div className="flex items-center gap-3 px-2 py-1">
          <Link href="/profile" onClick={closeMobile} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
            <div className="relative h-8 w-8 shrink-0">
              {userProfile?.picture_url ? (
                <img src={userProfile.picture_url} alt="Avatar" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[#9516C7]/10 flex items-center justify-center text-[#9516C7] text-xs font-semibold">
                  {userProfile?.firstname?.[0]}{userProfile?.lastname?.[0]}
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              {(userProfile?.firstname || userProfile?.lastname) && (
                <span className="text-sm font-medium truncate">
                  {userProfile?.firstname} {userProfile?.lastname}
                </span>
              )}
              <span className="text-xs text-muted-foreground truncate">{userProfile?.email}</span>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => { closeMobile(); handleLogout(); }}
            title="Se déconnecter"
          >
            <Icon icon="mdi:logout" className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
