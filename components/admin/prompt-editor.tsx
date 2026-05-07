"use client";

import { useState, useTransition } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CALL_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "cold_call", label: "Cold call" },
  { value: "discovery_meeting", label: "Réunion de découverte" },
  { value: "product_demo", label: "Démonstration produit" },
  { value: "closing_call", label: "Closing" },
  { value: "follow_up_call", label: "Relance" },
];

type Props = {
  initialPersona: string;
  initialBehavior: string;
  updatedAt: string | null;
};

export function PromptEditor({ initialPersona, initialBehavior, updatedAt }: Props) {
  const [persona, setPersona] = useState(initialPersona);
  const [behavior, setBehavior] = useState(initialBehavior);
  const [savedPersona, setSavedPersona] = useState(initialPersona);
  const [savedBehavior, setSavedBehavior] = useState(initialBehavior);
  const [isPending, startTransition] = useTransition();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
  const [previewExample, setPreviewExample] = useState<{
    agent_name?: string;
    agent_difficulty?: string;
    call_type?: string;
    secteur?: string;
    company?: string;
  } | null>(null);
  const [previewCallType, setPreviewCallType] = useState("cold_call");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dirty = persona !== savedPersona || behavior !== savedBehavior;
  const bothEmpty = persona.trim().length === 0 && behavior.trim().length === 0;

  const fetchPreview = async (callType: string) => {
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/admin/prompt/preview?call_type=${encodeURIComponent(callType)}`,
        { credentials: "include" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de la génération de l'aperçu");
        setPreviewPrompt(null);
        setPreviewExample(null);
        return;
      }
      setPreviewPrompt(data.prompt);
      setPreviewExample(data.example ?? null);
    } catch (err) {
      console.error(err);
      toast.error("Erreur réseau");
    } finally {
      setPreviewLoading(false);
    }
  };

  const togglePreview = () => {
    const next = !previewOpen;
    setPreviewOpen(next);
    if (next && !previewPrompt) {
      void fetchPreview(previewCallType);
    }
  };

  const handleCallTypeChange = (value: string) => {
    setPreviewCallType(value);
    void fetchPreview(value);
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await fetch("/api/admin/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona_instructions: persona,
          behavior_instructions: behavior,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erreur lors de la sauvegarde");
        return;
      }

      setSavedPersona(persona);
      setSavedBehavior(behavior);
      toast.success("Instructions enregistrées");

      // Refresh the preview if it's currently open so it reflects the saved values.
      if (previewOpen) {
        void fetchPreview(previewCallType);
      }
    });
  };

  const handleReset = () => {
    setPersona(savedPersona);
    setBehavior(savedBehavior);
  };

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon icon="fluent:edit-24-filled" className="size-5 text-[#9516C7]" />
          Personnalisation du prompt
        </CardTitle>
        <CardDescription>
          Ajoutez ici des consignes qui seront injectées dans le prompt de chaque
          simulation, en plus des règles existantes du moteur. Les deux zones ci-dessous
          ciblent deux dimensions distinctes du comportement du prospect IA. Laissez
          une zone vide pour conserver le comportement par défaut sur cette dimension.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="persona" className="text-sm font-semibold">
              <Icon icon="fluent:person-24-filled" className="inline size-4 mr-1 text-[#9516C7]" />
              Caractère &amp; contexte du prospect
            </Label>
            <span className="text-xs text-muted-foreground">Injecté dans BLOC 1 — Identité</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Détails de personnalité, background, vécu, contexte personnel ou
            professionnel qui s&apos;ajoute à l&apos;identité du prospect.
          </p>
          <Textarea
            id="persona"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            placeholder="Exemple : Marc a 47 ans, basé à Lyon, marié 2 enfants. Il a déjà eu une mauvaise expérience avec un concurrent en 2024 — il est devenu prudent avec les commerciaux qui appellent à froid. Il préfère qu'on aille droit au but..."
            className="min-h-[180px] font-mono text-sm"
            disabled={isPending}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="behavior" className="text-sm font-semibold">
              <Icon icon="fluent:shield-task-24-filled" className="inline size-4 mr-1 text-[#9516C7]" />
              Règles de comportement
            </Label>
            <span className="text-xs text-muted-foreground">Injecté dans BLOC 2 — Comportement</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Consignes générales sur ce que le prospect doit faire ou éviter pendant
            l&apos;appel. S&apos;ajoute aux règles de comportement déjà en place.
          </p>
          <Textarea
            id="behavior"
            value={behavior}
            onChange={(e) => setBehavior(e.target.value)}
            placeholder="Exemple : Demande toujours le prix avant la fin de l'appel. Ne mentionne jamais ton ancien fournisseur. Si on parle ROI, exige un cas client précis. N'accepte aucun rendez-vous avant d'avoir une réponse claire sur les délais..."
            className="min-h-[180px] font-mono text-sm"
            disabled={isPending}
          />
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {updatedAt ? (
              <>Dernière modification : {new Date(updatedAt).toLocaleString("fr-FR")}</>
            ) : (
              <>Aucune modification enregistrée</>
            )}
            {dirty && (
              <span className="ml-2 text-amber-600 font-medium">· Modifications non enregistrées</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!dirty || isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!dirty || isPending}
              className="shannen-gradient text-white"
            >
              {isPending ? (
                <>
                  <Icon icon="line-md:loading-twotone-loop" className="mr-2 size-4" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Icon icon="fluent:save-24-filled" className="mr-2 size-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Icon
              icon="fluent:warning-24-filled"
              className={`size-5 ${bothEmpty ? "text-rose-500" : "text-amber-500"}`}
            />
            {bothEmpty
              ? "Effacer toutes les consignes personnalisées ?"
              : "Confirmer la mise à jour du prompt système"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {bothEmpty ? (
              <>
                Les deux zones sont vides. En enregistrant, vous{" "}
                <strong>supprimez les consignes existantes</strong> : toutes les
                simulations futures repasseront sur le comportement par défaut du
                moteur, sans persona ni règles additionnelles.
              </>
            ) : (
              <>
                Ces instructions seront injectées dans{" "}
                <strong>toutes les simulations futures</strong>, pour tous les
                élèves et toutes les voix. Les simulations en cours ne sont pas
                affectées. Continuer&nbsp;?
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              setConfirmOpen(false);
              handleSave();
            }}
            className={
              bothEmpty
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "shannen-gradient text-white"
            }
          >
            {bothEmpty ? "Effacer les consignes" : "Confirmer et enregistrer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Card>
      <CardHeader className="cursor-pointer select-none" onClick={togglePreview}>
        <CardTitle className="flex items-center gap-2">
          <Icon
            icon={previewOpen ? "fluent:chevron-down-24-filled" : "fluent:chevron-right-24-filled"}
            className="size-5 text-[#9516C7]"
          />
          Voir le prompt complet généré
        </CardTitle>
        <CardDescription>
          Visualise le prompt envoyé à ElevenLabs pour une simulation type, avec tes
          ajouts ci-dessus injectés à leur place exacte. Lecture seule.
        </CardDescription>
      </CardHeader>
      {previewOpen && (
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Icon icon="fluent:info-24-filled" className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p>
              L&apos;aperçu reflète les valeurs <strong>enregistrées</strong> en base. Si
              tu modifies les zones ci-dessus, clique sur <strong>Enregistrer</strong>{" "}
              pour les voir apparaître ici.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="preview-call-type" className="text-sm font-medium">
              Type d&apos;appel exemple :
            </Label>
            <select
              id="preview-call-type"
              value={previewCallType}
              onChange={(e) => handleCallTypeChange(e.target.value)}
              disabled={previewLoading}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9516C7]/40"
            >
              {CALL_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {previewExample && (
              <span className="text-xs text-muted-foreground">
                Exemple : <strong>{previewExample.agent_name}</strong> ·{" "}
                {previewExample.agent_difficulty} · {previewExample.secteur}
              </span>
            )}
          </div>

          {previewLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Icon icon="line-md:loading-twotone-loop" className="mr-2 size-5" />
              Génération de l&apos;aperçu…
            </div>
          ) : previewPrompt ? (
            <pre className="max-h-[600px] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-mono">
              {previewPrompt}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun aperçu disponible.</p>
          )}
        </CardContent>
      )}
    </Card>
    </div>
  );
}
