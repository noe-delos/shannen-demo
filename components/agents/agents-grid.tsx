/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@iconify/react";
import { Plus, Search } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Agent } from "@/lib/types/database";
import { motion } from "framer-motion";
import { toast } from "sonner";

export function AgentsGrid() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    const filtered = agents.filter(
      (agent) =>
        agent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.difficulty?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAgents(filtered);
  }, [agents, searchTerm]);

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error("Error loading agents:", error);
      toast.error("Erreur lors du chargement des agents");
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>

        {/* Search Skeleton */}
        <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse shadow-soft">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground">
            Gérez vos agents conversationnels
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Créer un agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouvel agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nom de l'agent</Label>
                <Input id="name" placeholder="Ex: CEO Pressé" />
              </div>
              <div>
                <Label htmlFor="job_title">Poste</Label>
                <Input id="job_title" placeholder="Ex: Directeur Général" />
              </div>
              <div>
                <Label htmlFor="difficulty">Difficulté</Label>
                <select className="w-full p-2 border rounded-md">
                  <option value="facile">Facile</option>
                  <option value="moyen">Moyen</option>
                  <option value="difficile">Difficile</option>
                </select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Décrivez la personnalité de l'agent..."
                />
              </div>
              <Button className="w-full">Créer l'agent</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Rechercher un agent..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Agents Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
      >
        {filteredAgents.map((agent) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className="cursor-pointer"
          >
            <Card className="hover:shadow-soft transition-shadow shadow-soft py-0">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
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
                    <h3 className="font-semibold text-lg truncate">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {agent.job_title}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        className={getDifficultyColor(agent.difficulty || "")}
                      >
                        {agent.difficulty}
                      </Badge>
                      {agent.voice_id && (
                        <Icon
                          icon="material-symbols:mic"
                          className="h-4 w-4 text-blue-600"
                        />
                      )}
                    </div>
                    {agent.personnality && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        <p>
                          <strong>Attitude:</strong>{" "}
                          {agent.personnality.attitude}
                        </p>
                        <p>
                          <strong>Communication:</strong>{" "}
                          {agent.personnality.verbalisation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {filteredAgents.length === 0 && !loading && (
        <div className="text-center py-12">
          <Icon
            icon="material-symbols:search-off"
            className="h-12 w-12 mx-auto text-muted-foreground mb-4"
          />
          <h3 className="text-lg font-semibold mb-2">Aucun agent trouvé</h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? "Essayez de modifier votre recherche"
              : "Créez votre premier agent pour commencer"}
          </p>
        </div>
      )}
    </div>
  );
}
