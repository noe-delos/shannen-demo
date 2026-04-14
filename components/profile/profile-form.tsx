"use client";

import { useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

interface ProfileFormProps {
  user: User | null;
  authEmail: string;
}

export function ProfileForm({ user, authEmail }: ProfileFormProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstname, setFirstname] = useState(user?.firstname ?? "");
  const [lastname, setLastname] = useState(user?.lastname ?? "");
  const [defaultSecteur, setDefaultSecteur] = useState(user?.default_secteur ?? "");
  const [defaultCompany, setDefaultCompany] = useState(user?.default_company ?? "");
  const [pictureUrl, setPictureUrl] = useState(user?.picture_url ?? "");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("users")
        .update({ picture_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setPictureUrl(publicUrl);
      toast.success("Photo de profil mise à jour !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'upload de la photo");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ firstname, lastname, default_secteur: defaultSecteur, default_company: defaultCompany })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profil mis à jour !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la mise à jour du profil");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setIsSavingPassword(true);
    try {
      // Re-authenticate first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: currentPassword,
      });
      if (signInError) {
        toast.error("Mot de passe actuel incorrect");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Mot de passe mis à jour !");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du changement de mot de passe");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-muted-foreground text-sm mt-1">Gérez vos informations personnelles et préférences</p>
      </div>

      {/* Avatar */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Photo de profil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={pictureUrl} alt="Avatar" />
                <AvatarFallback className="text-xl bg-[#9516C7]/10 text-[#9516C7]">
                  {firstname?.[0]}{lastname?.[0]}
                </AvatarFallback>
              </Avatar>
              {isUploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                  <Icon icon="eos-icons:loading" className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="gap-2"
              >
                <Icon icon="material-symbols:upload" className="w-4 h-4" />
                Changer la photo
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG, WebP ou GIF · Max 5MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Identité */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prénom</Label>
              <Input
                className="mt-2 shadow-soft"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                placeholder="Jean"
              />
            </div>
            <div>
              <Label>Nom</Label>
              <Input
                className="mt-2 shadow-soft"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                placeholder="Dupont"
              />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input className="mt-2 shadow-soft bg-muted" value={authEmail} disabled />
          </div>
        </CardContent>
      </Card>

      {/* Contexte par défaut */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Contexte par défaut</CardTitle>
          <p className="text-sm text-muted-foreground">Pré-rempli automatiquement dans le wizard de simulation</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Secteur d'activité</Label>
            <Input
              className="mt-2 shadow-soft"
              value={defaultSecteur}
              onChange={(e) => setDefaultSecteur(e.target.value)}
              placeholder="Ex: SaaS, E-commerce, Finance..."
            />
          </div>
          <div>
            <Label>Nom de l'entreprise</Label>
            <Input
              className="mt-2 shadow-soft"
              value={defaultCompany}
              onChange={(e) => setDefaultCompany(e.target.value)}
              placeholder="Ex: TechCorp, StartupXYZ..."
            />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSaveProfile}
        disabled={isSavingProfile}
        className="bg-[#9516C7] hover:bg-[#7a12a3] text-white gap-2 w-full"
      >
        {isSavingProfile ? (
          <><Icon icon="eos-icons:loading" className="w-4 h-4 animate-spin" />Enregistrement...</>
        ) : (
          <><Icon icon="material-symbols:save" className="w-4 h-4" />Enregistrer le profil</>
        )}
      </Button>

      {/* Mot de passe */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Changer le mot de passe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Mot de passe actuel</Label>
            <Input
              className="mt-2 shadow-soft"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <Label>Nouveau mot de passe</Label>
            <Input
              className="mt-2 shadow-soft"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
            />
          </div>
          <div>
            <Label>Confirmer le nouveau mot de passe</Label>
            <Input
              className={`mt-2 shadow-soft ${confirmPassword && newPassword !== confirmPassword ? "border-red-400" : ""}`}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
            )}
          </div>
          <Button
            onClick={handleSavePassword}
            disabled={isSavingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
            variant="outline"
            className="w-full gap-2"
          >
            {isSavingPassword ? (
              <><Icon icon="eos-icons:loading" className="w-4 h-4 animate-spin" />Mise à jour...</>
            ) : (
              <><Icon icon="material-symbols:lock-reset" className="w-4 h-4" />Changer le mot de passe</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
