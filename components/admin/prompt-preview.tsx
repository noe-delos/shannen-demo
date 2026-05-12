"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const SAMPLE_FULL_PROMPT = `# IDENTITÉ
Tu es {{agent_name}}, {{agent_job_title}} dans une entreprise du secteur {{secteur}}.
Tu es appelé(e) par un commercial qui veut te vendre {{product_name}}.

# PERSONNALITÉ
- Attitude : {{attitude}}
- Verbalisation : {{verbalisation}}
- Écoute : {{ecoute}}
- Présence : {{presence}}
- Prise de décision : {{prise_de_decision}}

# CONTEXTE DE L'APPEL
Type d'appel : {{call_type}}
Historique avec le commercial : {{historique_relation}}
Difficulté demandée : {{difficulty}}

# COMPORTEMENT SELON LA DIFFICULTÉ
PALIER 1 — Neutre, légèrement disponible. Tu réponds à la question. Tu laisses parfois une ouverture naturelle.

PALIER 2 — Résistance progressive si le commercial pitch sans écouter.
Ex : "Ça ressemble à tous les appels que je reçois." / "On a déjà quelqu'un."

PALIER 3 — Clôture (aucune amélioration après 2-3 échanges)
Donne une raison verbale, puis utilise le tool end_call.

# CE QUI DÉBLOQUE TA RÉCEPTIVITÉ (ne jamais le révéler)
✓ Il cite une raison précise et crédible d'appeler toi en particulier
✓ Il assume l'appel sans s'excuser
✓ Il pose des questions sur ton contexte AVANT de pitcher
✓ Il reformule ce que tu dis avec précision
✓ Il ne panique pas face à tes objections

# OBJECTIONS À INJECTER (pas toutes d'un coup)
- "On a déjà quelqu'un pour ça."
- "C'est pas vraiment ma priorité là."
- "Ça coûte combien ?"
- "J'ai pas le temps de changer ce qui marche."

# RÈGLES DE CLÔTURE
- Si le vendeur s'excuse d'appeler → "Non, ça m'intéresse pas, merci." → end_call
- Si pitch générique → end_call immédiat
- Si le commercial reprend bien → revenir au palier 1

# FORMAT DE SORTIE
Réponses courtes (1-2 phrases max).
Pas d'emoji.
Tutoiement ou vouvoiement selon la culture de l'entreprise.
`;

function fakeSave(option: string) {
  toast.success("Aperçu — pas de sauvegarde réelle", {
    description: `Format "${option}" sélectionné pour démonstration.`,
  });
}

export function PromptPreview() {
  const [tab, setTab] = useState("option2");

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Choix de l&apos;éditeur de prompt système</h1>
        <p className="text-sm text-muted-foreground">
          Bascule entre les 3 formats ci-dessous pour comparer.{" "}
          <strong>Aucune sauvegarde réelle</strong> — c&apos;est une maquette pour t&apos;aider à choisir le format qu&apos;on
          livrera en V1.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="option1" className="flex flex-col items-start gap-1 py-3 px-4 data-[state=active]:bg-white">
            <span className="font-semibold">Option 1</span>
            <span className="text-xs text-muted-foreground">Édition libre totale</span>
          </TabsTrigger>
          <TabsTrigger value="option2" className="flex flex-col items-start gap-1 py-3 px-4 data-[state=active]:bg-white">
            <span className="font-semibold">Option 2</span>
            <span className="text-xs text-muted-foreground">Zones additives</span>
          </TabsTrigger>
          <TabsTrigger value="option3" className="flex flex-col items-start gap-1 py-3 px-4 data-[state=active]:bg-white">
            <span className="font-semibold">Option 3</span>
            <span className="text-xs text-muted-foreground">Blocs préréglés</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="option1" className="mt-6">
          <Option1 />
        </TabsContent>
        <TabsContent value="option2" className="mt-6">
          <Option2 />
        </TabsContent>
        <TabsContent value="option3" className="mt-6">
          <Option3 />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OptionHeader({
  badge,
  title,
  description,
  tone,
}: {
  badge: string;
  title: string;
  description: string;
  tone: "warning" | "info" | "success";
}) {
  const tones = {
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    info: "bg-blue-50 border-blue-200 text-blue-900",
    success: "bg-emerald-50 border-emerald-200 text-emerald-900",
  };
  return (
    <Card className={`p-4 border ${tones[tone]} mb-6`}>
      <div className="flex items-start gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide bg-white/70 rounded px-2 py-1">
          {badge}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">{title}</h3>
          <p className="text-xs leading-relaxed opacity-90">{description}</p>
        </div>
      </div>
    </Card>
  );
}

function Option1() {
  const [value, setValue] = useState(SAMPLE_FULL_PROMPT);
  return (
    <div className="flex flex-col gap-4">
      <OptionHeader
        badge="⚠️ Le plus puissant, le plus risqué"
        title="Tu réécris le prompt complet"
        description="Tu vois l'intégralité du prompt système actuel. Tu peux tout modifier : persona, instructions de comportement, paliers de résistance, format de sortie. Les variables entre {{…}} sont remplies automatiquement au moment de la simulation. Attention : si tu supprimes un bloc critique, les simulations partent en vrille."
        tone="warning"
      />

      <Card className="p-5">
        <Label htmlFor="full-prompt" className="text-sm font-semibold mb-2 block">
          Prompt système complet
        </Label>
        <Textarea
          id="full-prompt"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={28}
          className="font-mono text-xs leading-relaxed"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Variables disponibles : <code>{`{{agent_name}}`}</code>, <code>{`{{call_type}}`}</code>,{" "}
          <code>{`{{secteur}}`}</code>, <code>{`{{product_name}}`}</code>, <code>{`{{difficulty}}`}</code>…
        </p>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setValue(SAMPLE_FULL_PROMPT)}>
          Réinitialiser
        </Button>
        <Button onClick={() => fakeSave("Édition libre totale")} className="shannen-gradient text-white">
          <Icon icon="mdi:content-save" className="mr-1 size-4" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

function Option2() {
  return (
    <div className="flex flex-col gap-4">
      <OptionHeader
        badge="✅ Le plus simple, le plus safe"
        title="Tu ajoutes des instructions au prompt existant"
        description="Le prompt système par défaut reste intact. Ce que tu écris ici s'ajoute dans deux blocs précis — sans rien casser. Idéal pour des ajustements ponctuels : 'le prospect doit être plus pressé', 'rajoute des objections santé', etc."
        tone="success"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <Label htmlFor="persona" className="text-sm font-semibold mb-1 block">
            Personnalité du prospect
          </Label>
          <p className="text-xs text-muted-foreground mb-3">
            S&apos;ajoute après les traits de personnalité par défaut.
          </p>
          <Textarea
            id="persona"
            rows={12}
            placeholder="Ex: Tu es particulièrement sceptique vis-à-vis des solutions SaaS. Tu as déjà été déçu(e) par un fournisseur l'an dernier. Tu coupes la parole quand on parle trop longtemps."
            className="text-sm leading-relaxed resize-none"
          />
        </Card>

        <Card className="p-5">
          <Label htmlFor="behavior" className="text-sm font-semibold mb-1 block">
            Comportement
          </Label>
          <p className="text-xs text-muted-foreground mb-3">
            S&apos;ajoute après les règles de comportement par défaut.
          </p>
          <Textarea
            id="behavior"
            rows={12}
            placeholder="Ex: Réponses courtes (1 phrase max). Si on te demande ton budget, esquive avec 'on verra plus tard'. Ne révèle jamais le nom de ton décideur final."
            className="text-sm leading-relaxed resize-none"
          />
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Annuler</Button>
        <Button onClick={() => fakeSave("Zones additives")} className="shannen-gradient text-white">
          <Icon icon="mdi:content-save" className="mr-1 size-4" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

const BLOCS_OPTION3 = [
  {
    key: "persona",
    title: "Personnalité du prospect",
    icon: "fluent:person-24-regular",
    helper: "Remplace le bloc persona par défaut.",
    placeholder:
      "Ex: Toujours sceptique, coupe la parole, voix grave. Tu as 50 ans, tu en as vu d'autres et tu n'as pas peur de raccrocher.",
    defaultPreview: "Par défaut : personnalité générée à partir de la fiche prospect (attitude / verbalisation / écoute).",
  },
  {
    key: "style",
    title: "Style de réponse",
    icon: "fluent:chat-24-regular",
    helper: "Remplace les règles de format de sortie.",
    placeholder: "Ex: Réponses très courtes (1 phrase max). Jamais de politesse excessive. Pas d'emoji.",
    defaultPreview: "Par défaut : 1-2 phrases, pas d'emoji, tutoiement/vouvoiement selon le contexte.",
  },
  {
    key: "objections",
    title: "Objections récurrentes",
    icon: "fluent:warning-24-regular",
    helper: "Liste d'objections que l'IA pourra injecter.",
    placeholder: "Ex: Trop cher / On a déjà quelqu'un / C'est pas la bonne période / Je signe avec un copain",
    defaultPreview: "Par défaut : 5 objections génériques adaptées au call_type.",
  },
  {
    key: "ton",
    title: "Ton & langage",
    icon: "fluent:emoji-24-regular",
    helper: "Remplace le ton général.",
    placeholder: "Ex: Tutoiement, ton familier, accent du Sud. Utilise des expressions comme 'putain' ou 'oh bah dis donc'.",
    defaultPreview: "Par défaut : ton professionnel, vouvoiement, registre soutenu.",
  },
  {
    key: "closing",
    title: "Instructions de clôture",
    icon: "fluent:checkmark-circle-24-regular",
    helper: "Comment l'IA termine l'appel.",
    placeholder: "Ex: Si tu sens un closing solide → accepte un rdv dans 7 jours. Sinon raccroche poliment.",
    defaultPreview: "Par défaut : end_call après 2-3 échanges sans progression du commercial.",
  },
];

function Option3() {
  return (
    <div className="flex flex-col gap-4">
      <OptionHeader
        badge="🎯 Le compromis recommandé"
        title="Tu écrases bloc par bloc, le reste reste intact"
        description="Chaque case correspond à un bloc précis du prompt. Si la case est vide → on garde le comportement par défaut. Si tu la remplis → on remplace uniquement ce bloc. Tu gardes le contrôle fin sans le risque de tout casser."
        tone="info"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {BLOCS_OPTION3.map((bloc) => (
          <Card key={bloc.key} className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Icon icon={bloc.icon} className="size-4 text-[#9516C7]" />
              <Label htmlFor={bloc.key} className="text-sm font-semibold">
                {bloc.title}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{bloc.helper}</p>
            <Textarea id={bloc.key} rows={6} placeholder={bloc.placeholder} className="text-sm resize-none" />
            <p className="text-[11px] text-muted-foreground/80 mt-2 italic">{bloc.defaultPreview}</p>
          </Card>
        ))}
        <Card className="p-5 border-dashed bg-muted/30 flex items-center justify-center">
          <div className="text-center">
            <Icon icon="fluent:add-24-regular" className="size-6 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              On peut ajouter
              <br />
              d&apos;autres blocs plus tard
            </p>
          </div>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Annuler</Button>
        <Button onClick={() => fakeSave("Blocs préréglés")} className="shannen-gradient text-white">
          <Icon icon="mdi:content-save" className="mr-1 size-4" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
