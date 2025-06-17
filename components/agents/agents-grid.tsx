/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon } from "@iconify/react";
import { Plus, Search, Upload, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Agent } from "@/lib/types/database";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Non-modifiable agent IDs
const NON_MODIFIABLE_AGENTS = [
  "32b7b37b-ce46-46a9-a1e3-a383ced9d21a",
  "5519c0a5-ffaa-4565-9929-4fc4466e5b96",
  "661f7ee3-eb58-4623-80ba-437de72734de",
  "66ee1b3c-2a09-4316-b726-bd33f430ac23",
  "c3c03256-2eb9-4498-ba5f-8d23490f3aa2",
];

// Voice IDs for gender
const VOICE_IDS = {
  male: "IHngRooVccHyPqB4uQkG",
  female: "F1toM6PcP54s45kOOAyV",
};

interface CreateAgentForm {
  firstname: string;
  lastname: string;
  name: string;
  job_title: string;
  difficulty: string;
  description: string;
  gender: "male" | "female";
  picture_file: File | null;
}

export function AgentsGrid() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [createForm, setCreateForm] = useState<CreateAgentForm>({
    firstname: "",
    lastname: "",
    name: "",
    job_title: "",
    difficulty: "facile",
    description: "",
    gender: "male",
    picture_file: null,
  });

  const [editForm, setEditForm] = useState<
    Partial<Agent & { picture_file: File | null }>
  >({});

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

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `agents/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("agents")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("agents").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erreur lors du téléchargement de l'image");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateAgent = async () => {
    try {
      setCreateLoading(true);

      let picture_url = null;
      if (createForm.picture_file) {
        picture_url = await uploadImage(createForm.picture_file);
        if (!picture_url) return;
      }

      const { data, error } = await supabase
        .from("agents")
        .insert([
          {
            firstname: createForm.firstname || null,
            lastname: createForm.lastname || null,
            name: createForm.name || null,
            job_title: createForm.job_title || null,
            difficulty: createForm.difficulty,
            voice_id: VOICE_IDS[createForm.gender],
            picture_url,
            personnality: {
              écoute: "réceptif",
              attitude: "passif",
              présence: "présent",
              verbalisation: "concis",
              prise_de_décision: "décideur",
            },
          },
        ])
        .select();

      if (error) throw error;

      toast.success("Agent créé avec succès");
      setCreateForm({
        firstname: "",
        lastname: "",
        name: "",
        job_title: "",
        difficulty: "facile",
        description: "",
        gender: "male",
        picture_file: null,
      });
      setIsCreateDialogOpen(false);
      loadAgents();
    } catch (error) {
      console.error("Error creating agent:", error);
      toast.error("Erreur lors de la création de l'agent");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditAgent = async () => {
    if (!selectedAgent) return;

    try {
      setUpdateLoading(true);

      let picture_url = editForm.picture_url;
      if (editForm.picture_file) {
        const uploadedUrl = await uploadImage(editForm.picture_file);
        if (uploadedUrl) {
          picture_url = uploadedUrl;
        }
      }

      const { error } = await supabase
        .from("agents")
        .update({
          firstname: editForm.firstname,
          lastname: editForm.lastname,
          name: editForm.name,
          job_title: editForm.job_title,
          difficulty: editForm.difficulty,
          picture_url,
          personnality: editForm.personnality,
        })
        .eq("id", selectedAgent.id);

      if (error) throw error;

      toast.success("Agent modifié avec succès");
      setIsEditDialogOpen(false);
      setSelectedAgent(null);
      setEditForm({});
      loadAgents();
    } catch (error) {
      console.error("Error updating agent:", error);
      toast.error("Erreur lors de la modification de l'agent");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditForm({
      ...agent,
      picture_file: null,
    });
    setIsEditDialogOpen(true);
  };

  const isNonModifiable = (agentId: string) => {
    return NON_MODIFIABLE_AGENTS.includes(agentId);
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un nouvel agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-firstname">Prénom</Label>
                  <Input
                    id="create-firstname"
                    placeholder="Ex: Marc"
                    value={createForm.firstname}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        firstname: e.target.value,
                      })
                    }
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="create-lastname">Nom</Label>
                  <Input
                    id="create-lastname"
                    placeholder="Ex: Dubois"
                    value={createForm.lastname}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, lastname: e.target.value })
                    }
                    className="mt-2"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="create-name">Nom de l'agent (rôle)</Label>
                <Input
                  id="create-name"
                  placeholder="Ex: CEO Pressé"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="create-job_title">Poste</Label>
                <Input
                  id="create-job_title"
                  placeholder="Ex: Directeur Général"
                  value={createForm.job_title}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, job_title: e.target.value })
                  }
                  className="mt-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-difficulty">Difficulté</Label>
                  <Select
                    value={createForm.difficulty}
                    onValueChange={(value: string) =>
                      setCreateForm({ ...createForm, difficulty: value })
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sélectionner la difficulté" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facile">Facile</SelectItem>
                      <SelectItem value="moyen">Moyen</SelectItem>
                      <SelectItem value="difficile">Difficile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="create-gender">Genre</Label>
                  <Select
                    value={createForm.gender}
                    onValueChange={(value: "male" | "female") =>
                      setCreateForm({ ...createForm, gender: value })
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sélectionner le genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Homme</SelectItem>
                      <SelectItem value="female">Femme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="create-picture">Photo de profil</Label>
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setCreateForm({ ...createForm, picture_file: file });
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {createForm.picture_file
                      ? createForm.picture_file.name
                      : "Choisir une image"}
                  </Button>
                  {createForm.picture_file && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCreateForm({ ...createForm, picture_file: null })
                      }
                      className="mt-2"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  placeholder="Décrivez la personnalité de l'agent..."
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  className="mt-2"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateAgent}
                disabled={createLoading || uploadingImage}
              >
                {createLoading || uploadingImage
                  ? "Création en cours..."
                  : "Créer l'agent"}
              </Button>
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
            onClick={() => handleAgentClick(agent)}
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
                    {(agent.firstname || agent.lastname) && (
                      <p className="text-sm font-medium text-blue-600">
                        {agent.firstname} {agent.lastname}
                      </p>
                    )}
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

      {/* Edit Agent Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAgent && isNonModifiable(selectedAgent.id)
                ? "Détails de l'agent"
                : "Modifier l'agent"}
            </DialogTitle>
          </DialogHeader>
          {selectedAgent && (
            <div className="space-y-4">
              {isNonModifiable(selectedAgent.id) && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800 italic">
                    Ces agents ne sont pas modifiables, veuillez en créer un
                    nouveau
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-firstname">Prénom</Label>
                  <Input
                    id="edit-firstname"
                    value={editForm.firstname || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, firstname: e.target.value })
                    }
                    className="mt-2"
                    disabled={isNonModifiable(selectedAgent.id)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-lastname">Nom</Label>
                  <Input
                    id="edit-lastname"
                    value={editForm.lastname || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, lastname: e.target.value })
                    }
                    className="mt-2"
                    disabled={isNonModifiable(selectedAgent.id)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-name">Nom de l'agent (rôle)</Label>
                <Input
                  id="edit-name"
                  value={editForm.name || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="mt-2"
                  disabled={isNonModifiable(selectedAgent.id)}
                />
              </div>
              <div>
                <Label htmlFor="edit-job_title">Poste</Label>
                <Input
                  id="edit-job_title"
                  value={editForm.job_title || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, job_title: e.target.value })
                  }
                  className="mt-2"
                  disabled={isNonModifiable(selectedAgent.id)}
                />
              </div>
              <div>
                <Label htmlFor="edit-difficulty">Difficulté</Label>
                <Select
                  value={editForm.difficulty || ""}
                  onValueChange={(value: string) =>
                    setEditForm({ ...editForm, difficulty: value })
                  }
                  disabled={isNonModifiable(selectedAgent.id)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Sélectionner la difficulté" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facile">Facile</SelectItem>
                    <SelectItem value="moyen">Moyen</SelectItem>
                    <SelectItem value="difficile">Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-picture">Photo de profil</Label>
                <div className="mt-2 space-y-2">
                  {editForm.picture_url && (
                    <div className="flex items-center gap-2">
                      <img
                        src={editForm.picture_url}
                        alt="Agent"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <span className="text-sm text-muted-foreground">
                        Photo actuelle
                      </span>
                    </div>
                  )}
                  {!isNonModifiable(selectedAgent.id) && (
                    <>
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setEditForm({ ...editForm, picture_file: file });
                        }}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => editFileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {editForm.picture_file
                          ? editForm.picture_file.name
                          : "Changer l'image"}
                      </Button>
                      {editForm.picture_file && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setEditForm({ ...editForm, picture_file: null })
                          }
                        >
                          <X className="h-4 w-4 mr-1" />
                          Annuler le changement
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {editForm.personnality && (
                <div className="space-y-3">
                  <Label>Personnalité</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-attitude" className="text-sm">
                        Attitude
                      </Label>
                      <Input
                        id="edit-attitude"
                        value={editForm.personnality?.attitude || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            personnality: {
                              ...editForm.personnality,
                              attitude: e.target.value,
                              verbalisation:
                                editForm.personnality?.verbalisation || "",
                              écoute: editForm.personnality?.écoute || "",
                              présence: editForm.personnality?.présence || "",
                              prise_de_décision:
                                editForm.personnality?.prise_de_décision || "",
                            },
                          })
                        }
                        className="mt-1"
                        disabled={isNonModifiable(selectedAgent.id)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-verbalisation" className="text-sm">
                        Communication
                      </Label>
                      <Input
                        id="edit-verbalisation"
                        value={editForm.personnality?.verbalisation || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            personnality: {
                              ...editForm.personnality,
                              verbalisation: e.target.value,
                              attitude: editForm.personnality?.attitude || "",
                              écoute: editForm.personnality?.écoute || "",
                              présence: editForm.personnality?.présence || "",
                              prise_de_décision:
                                editForm.personnality?.prise_de_décision || "",
                            },
                          })
                        }
                        className="mt-1"
                        disabled={isNonModifiable(selectedAgent.id)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-ecoute" className="text-sm">
                        Écoute
                      </Label>
                      <Input
                        id="edit-ecoute"
                        value={editForm.personnality?.écoute || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            personnality: {
                              ...editForm.personnality,
                              écoute: e.target.value,
                              attitude: editForm.personnality?.attitude || "",
                              verbalisation:
                                editForm.personnality?.verbalisation || "",
                              présence: editForm.personnality?.présence || "",
                              prise_de_décision:
                                editForm.personnality?.prise_de_décision || "",
                            },
                          })
                        }
                        className="mt-1"
                        disabled={isNonModifiable(selectedAgent.id)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-presence" className="text-sm">
                        Présence
                      </Label>
                      <Input
                        id="edit-presence"
                        value={editForm.personnality?.présence || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            personnality: {
                              ...editForm.personnality,
                              présence: e.target.value,
                              attitude: editForm.personnality?.attitude || "",
                              verbalisation:
                                editForm.personnality?.verbalisation || "",
                              écoute: editForm.personnality?.écoute || "",
                              prise_de_décision:
                                editForm.personnality?.prise_de_décision || "",
                            },
                          })
                        }
                        className="mt-1"
                        disabled={isNonModifiable(selectedAgent.id)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="edit-decision" className="text-sm">
                        Prise de décision
                      </Label>
                      <Input
                        id="edit-decision"
                        value={editForm.personnality?.prise_de_décision || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            personnality: {
                              ...editForm.personnality,
                              prise_de_décision: e.target.value,
                              attitude: editForm.personnality?.attitude || "",
                              verbalisation:
                                editForm.personnality?.verbalisation || "",
                              écoute: editForm.personnality?.écoute || "",
                              présence: editForm.personnality?.présence || "",
                            },
                          })
                        }
                        className="mt-1"
                        disabled={isNonModifiable(selectedAgent.id)}
                      />
                    </div>
                  </div>
                </div>
              )}
              {!isNonModifiable(selectedAgent.id) && (
                <Button
                  className="w-full"
                  onClick={handleEditAgent}
                  disabled={updateLoading || uploadingImage}
                >
                  {updateLoading || uploadingImage
                    ? "Modification en cours..."
                    : "Modifier l'agent"}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
