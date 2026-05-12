"use client";

import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildAgentPrompt } from "@/lib/prompt/build-agent-prompt";

type AgentLike = {
  id: string;
  name: string | null;
  firstname: string | null;
  lastname: string | null;
  job_title: string | null;
  difficulty: string | null;
  personnality: unknown;
  picture_url: string | null;
};

const CALL_TYPES = [
  { value: "cold_call", label: "Appel à froid (cold call)" },
  { value: "discovery_meeting", label: "Réunion de découverte" },
  { value: "product_demo", label: "Démonstration produit" },
  { value: "closing_call", label: "Appel de closing" },
  { value: "follow_up_call", label: "Appel de suivi (follow-up)" },
];

const SAMPLE_CONTEXT = {
  secteur: "SaaS",
  company: "Acme Industries",
  historique_relation: "Premier contact",
};

const DIFFICULTY_LABEL: Record<string, string> = {
  facile: "Facile",
  moyen: "Moyen",
  difficile: "Difficile",
  tres_difficile: "Très difficile",
};

const BLOC_REGEX = /(— BLOC \d+ — [^—]+ —)/g;

type BlocParts = {
  intro: string;
  blocs: Array<{ header: string; content: string; num: number }>;
};

function parseBlocs(prompt: string): BlocParts {
  const parts = prompt.split(BLOC_REGEX);
  const intro = parts[0] ?? "";
  const blocs: BlocParts["blocs"] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const header = parts[i] ?? "";
    const content = parts[i + 1] ?? "";
    const numMatch = header.match(/BLOC (\d+)/);
    blocs.push({
      header,
      content,
      num: numMatch ? parseInt(numMatch[1], 10) : i,
    });
  }
  return { intro, blocs };
}

type BlocOverride = { mode: "append" | "replace"; text: string };

function reassembleWithOverrides(
  parsed: BlocParts,
  overrides: Record<number, BlocOverride>
): string {
  let result = parsed.intro;
  for (const bloc of parsed.blocs) {
    const override = overrides[bloc.num];
    if (override && override.text.trim()) {
      if (override.mode === "replace") {
        result += `${bloc.header}\n${override.text.trim()}\n`;
      } else {
        result += `${bloc.header}${bloc.content}\nINSTRUCTIONS ADDITIONNELLES (panneau admin) :\n${override.text.trim()}\n`;
      }
    } else {
      result += bloc.header + bloc.content;
    }
  }
  return result;
}

export function PromptPreview({ sampleAgents }: { sampleAgents: AgentLike[] }) {
  const [tab, setTab] = useState("option2");
  const [agentId, setAgentId] = useState(sampleAgents[0]?.id ?? "");
  const [callType, setCallType] = useState("cold_call");

  const agent = useMemo(
    () => sampleAgents.find((a) => a.id === agentId) ?? sampleAgents[0] ?? null,
    [agentId, sampleAgents]
  );

  const defaultPrompt = useMemo(() => {
    if (!agent) return "";
    return buildAgentPrompt({
      agent: {
        name: agent.name ?? "Prospect",
        firstname: agent.firstname,
        lastname: agent.lastname,
        job_title: agent.job_title,
        difficulty: agent.difficulty ?? "moyen",
        personnality: agent.personnality,
      },
      conversationDetails: {
        call_type: callType,
        context: SAMPLE_CONTEXT,
      },
    });
  }, [agent, callType]);

  const parsedDefault = useMemo(() => parseBlocs(defaultPrompt), [defaultPrompt]);

  if (sampleAgents.length === 0 || !agent) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-8 text-center">
          <Icon icon="fluent:warning-24-regular" className="size-10 mx-auto mb-3 text-amber-500" />
          <h2 className="font-semibold mb-2">Aucun prospect par défaut en base</h2>
          <p className="text-sm text-muted-foreground">
            La page a besoin d&apos;au moins un agent système (où <code>user_id IS NULL</code>) pour générer
            l&apos;aperçu du prompt. Ajoute-en un depuis Supabase ou crée un agent côté front.
          </p>
        </Card>
      </div>
    );
  }

  const agentFullName =
    agent.firstname && agent.lastname
      ? `${agent.firstname} ${agent.lastname}`
      : agent.name ?? "Prospect";

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Choix de l&apos;éditeur de prompt système</h1>
        <p className="text-sm text-muted-foreground">
          3 formats possibles, avec des <strong>vraies données</strong> (prospect, scénario, prompt généré
          en live). Bascule pour comparer. <strong>Aucune sauvegarde réelle</strong> — c&apos;est une
          maquette pour t&apos;aider à choisir le format qu&apos;on livrera en V1.
        </p>
      </div>

      <ScenarioPicker
        agents={sampleAgents}
        agentId={agentId}
        onAgentChange={setAgentId}
        callType={callType}
        onCallTypeChange={setCallType}
        agentLabel={agentFullName}
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger
            value="option1"
            className="flex flex-col items-start gap-1 py-3 px-4 data-[state=active]:bg-white"
          >
            <span className="font-semibold">Option 1</span>
            <span className="text-xs text-muted-foreground">Édition libre totale</span>
          </TabsTrigger>
          <TabsTrigger
            value="option2"
            className="flex flex-col items-start gap-1 py-3 px-4 data-[state=active]:bg-white"
          >
            <span className="font-semibold">Option 2</span>
            <span className="text-xs text-muted-foreground">Zones additives</span>
          </TabsTrigger>
          <TabsTrigger
            value="option3"
            className="flex flex-col items-start gap-1 py-3 px-4 data-[state=active]:bg-white"
          >
            <span className="font-semibold">Option 3</span>
            <span className="text-xs text-muted-foreground">Blocs préréglés</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="option1" className="mt-6">
          <Option1 defaultPrompt={defaultPrompt} scenarioKey={`${agentId}:${callType}`} />
        </TabsContent>
        <TabsContent value="option2" className="mt-6">
          <Option2 agent={agent} callType={callType} parsedDefault={parsedDefault} />
        </TabsContent>
        <TabsContent value="option3" className="mt-6">
          <Option3 parsedDefault={parsedDefault} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScenarioPicker({
  agents,
  agentId,
  onAgentChange,
  callType,
  onCallTypeChange,
  agentLabel,
}: {
  agents: AgentLike[];
  agentId: string;
  onAgentChange: (id: string) => void;
  callType: string;
  onCallTypeChange: (ct: string) => void;
  agentLabel: string;
}) {
  return (
    <Card className="p-4 border-purple-100 bg-purple-50/40">
      <div className="flex items-center gap-2 mb-3">
        <Icon icon="fluent:beaker-24-filled" className="size-4 text-[#9516C7]" />
        <p className="text-sm font-semibold">Aperçu pour ce scénario</p>
        <span className="text-xs text-muted-foreground">
          (la maquette utilise ces données réelles pour générer le prompt ci-dessous)
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Prospect</Label>
          <Select value={agentId} onValueChange={onAgentChange}>
            <SelectTrigger className="bg-white">
              <SelectValue>{agentLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => {
                const fullName =
                  a.firstname && a.lastname
                    ? `${a.firstname} ${a.lastname}`
                    : a.name ?? "Prospect";
                const diff = a.difficulty
                  ? DIFFICULTY_LABEL[a.difficulty] ?? a.difficulty
                  : "—";
                return (
                  <SelectItem key={a.id} value={a.id}>
                    {fullName} · {a.job_title ?? "—"} · {diff}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Type d&apos;appel</Label>
          <Select value={callType} onValueChange={onCallTypeChange}>
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALL_TYPES.map((ct) => (
                <SelectItem key={ct.value} value={ct.value}>
                  {ct.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
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
        <div className="text-xs font-semibold uppercase tracking-wide bg-white/70 rounded px-2 py-1 whitespace-nowrap">
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

function CollapsiblePreview({
  title,
  content,
  defaultOpen = false,
}: {
  title: string;
  content: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-md overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 flex items-center justify-between text-left text-xs font-medium hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Icon
            icon={open ? "fluent:chevron-down-12-regular" : "fluent:chevron-right-12-regular"}
            className="size-3"
          />
          {title}
        </span>
        <span className="text-muted-foreground text-[11px]">
          {content.split("\n").length} lignes · {content.length} car.
        </span>
      </button>
      {open && (
        <pre className="text-[11px] font-mono whitespace-pre-wrap p-3 bg-muted/30 max-h-72 overflow-auto border-t leading-relaxed">
          {content.trim() || "(vide)"}
        </pre>
      )}
    </div>
  );
}

function fakeSave(option: string) {
  toast.success("Aperçu — pas de sauvegarde réelle", {
    description: `Format "${option}" sélectionné pour démonstration.`,
  });
}

/* ──────────────────────────── OPTION 1 ──────────────────────────── */

function Option1({ defaultPrompt, scenarioKey }: { defaultPrompt: string; scenarioKey: string }) {
  const [value, setValue] = useState(defaultPrompt);
  const [lastKey, setLastKey] = useState(scenarioKey);

  if (scenarioKey !== lastKey) {
    setLastKey(scenarioKey);
    setValue(defaultPrompt);
  }

  const dirty = value !== defaultPrompt;

  return (
    <div className="flex flex-col gap-4">
      <OptionHeader
        badge="⚠️ Le plus puissant, le plus risqué"
        title="Tu réécris l'intégralité du prompt système"
        description="Cette zone montre le prompt EXACT qui est envoyé à l'IA pour le scénario sélectionné en haut. Tu peux tout modifier : identité, comportements, paliers de résistance, format de sortie. À chaque simulation, on remplace automatiquement le nom du prospect, le secteur, le type d'appel, etc. Mais si tu supprimes un bloc critique, les simulations partent en vrille."
        tone="warning"
      />

      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="full-prompt" className="text-sm font-semibold">
            Prompt système complet (envoyé à ElevenLabs)
          </Label>
          {dirty && (
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              modifié
            </span>
          )}
        </div>
        <Textarea
          id="full-prompt"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={28}
          className="font-mono text-[11px] leading-relaxed"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Les noms de prospect, secteurs, et types d&apos;appel changent automatiquement à chaque simulation.
          Tu modifies la <strong>structure</strong>, pas les données dynamiques.
        </p>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setValue(defaultPrompt)} disabled={!dirty}>
          Réinitialiser au défaut
        </Button>
        <Button
          onClick={() => fakeSave("Édition libre totale")}
          className="shannen-gradient text-white"
        >
          <Icon icon="mdi:content-save" className="mr-1 size-4" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

/* ──────────────────────────── OPTION 2 ──────────────────────────── */

function Option2({
  agent,
  callType,
  parsedDefault,
}: {
  agent: AgentLike;
  callType: string;
  parsedDefault: BlocParts;
}) {
  const [persona, setPersona] = useState("");
  const [behavior, setBehavior] = useState("");

  const finalPrompt = useMemo(
    () =>
      buildAgentPrompt({
        agent: {
          name: agent.name ?? "Prospect",
          firstname: agent.firstname,
          lastname: agent.lastname,
          job_title: agent.job_title,
          difficulty: agent.difficulty ?? "moyen",
          personnality: agent.personnality,
        },
        conversationDetails: { call_type: callType, context: SAMPLE_CONTEXT },
        personaInstructions: persona || null,
        behaviorInstructions: behavior || null,
      }),
    [agent, callType, persona, behavior]
  );

  const bloc1 = parsedDefault.blocs.find((b) => b.num === 1);
  const bloc2 = parsedDefault.blocs.find((b) => b.num === 2);

  const dirty = persona.trim().length > 0 || behavior.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <OptionHeader
        badge="✅ Le plus simple, le plus safe"
        title="Tu ajoutes des instructions au prompt existant"
        description="Le prompt système par défaut reste intact. Ce que tu écris ici est injecté dans le BLOC 1 (Identité) et le BLOC 2 (Comportement) — sans rien casser. Idéal pour des ajustements ponctuels : « le prospect doit être plus pressé », « rajoute des objections santé », etc."
        tone="success"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Icon icon="fluent:person-24-regular" className="size-4 text-[#9516C7]" />
            <Label htmlFor="persona" className="text-sm font-semibold">
              Personnalité du prospect (global)
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            S&apos;ajoute après la personnalité actuelle dans le BLOC 1.
          </p>
          <CollapsiblePreview
            title="Voir la personnalité actuelle du prospect"
            content={`Personnalité (depuis la fiche prospect) :\n${JSON.stringify(
              agent.personnality,
              null,
              2
            )}\n\n${bloc1?.content?.trim() ?? ""}`}
          />
          <Textarea
            id="persona"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            rows={8}
            placeholder="Ex: Tu es particulièrement sceptique vis-à-vis des solutions SaaS. Tu as été déçu(e) par un fournisseur l'an dernier. Tu coupes la parole quand on parle trop longtemps."
            className="text-sm resize-none"
          />
        </Card>

        <Card className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Icon icon="fluent:chat-multiple-24-regular" className="size-4 text-[#9516C7]" />
            <Label htmlFor="behavior" className="text-sm font-semibold">
              Comportement (global)
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            S&apos;ajoute après les règles de comportement par défaut dans le BLOC 2.
          </p>
          <CollapsiblePreview
            title="Voir le comportement par défaut"
            content={bloc2?.content?.trim() ?? ""}
          />
          <Textarea
            id="behavior"
            value={behavior}
            onChange={(e) => setBehavior(e.target.value)}
            rows={8}
            placeholder="Ex: Réponses courtes (1 phrase max). Si on te demande ton budget, esquive avec 'on verra plus tard'. Ne révèle jamais le nom de ton décideur final."
            className="text-sm resize-none"
          />
        </Card>
      </div>

      <CollapsiblePreview
        title={
          dirty
            ? "Aperçu du prompt final (avec tes ajouts) — envoyé à l'IA"
            : "Aperçu du prompt final — envoyé à l'IA (identique au défaut tant que tu n'as rien écrit)"
        }
        content={finalPrompt}
        defaultOpen={false}
      />

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setPersona("");
            setBehavior("");
          }}
          disabled={!dirty}
        >
          Annuler
        </Button>
        <Button onClick={() => fakeSave("Zones additives")} className="shannen-gradient text-white">
          <Icon icon="mdi:content-save" className="mr-1 size-4" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

/* ──────────────────────────── OPTION 3 ──────────────────────────── */

const BLOC_META: Record<number, { icon: string; title: string; helper: string }> = {
  1: {
    icon: "fluent:person-info-24-regular",
    title: "BLOC 1 — Identité & contexte",
    helper:
      "Type d'appel, secteur, entreprise, historique. Aujourd'hui c'est dérivé automatiquement de la fiche prospect + du contexte de la simulation.",
  },
  2: {
    icon: "fluent:chat-multiple-24-regular",
    title: "BLOC 2 — Comportement général",
    helper:
      "Règles qui pilotent le style de réponse de l'IA : courte, sans questions ouvertes, jamais d'enthousiasme injustifié, etc.",
  },
  3: {
    icon: "fluent:gauge-24-regular",
    title: "BLOC 3 — Texture des réponses",
    helper:
      "Texte qui change selon le niveau de difficulté du prospect (facile / moyen / difficile / très difficile).",
  },
  4: {
    icon: "fluent:hand-wave-24-regular",
    title: "BLOC 4 — Résistances & clôture",
    helper:
      "Paliers de résistance et règles de raccrochage. Change selon le type d'appel (cold call vs closing call).",
  },
};

function Option3({ parsedDefault }: { parsedDefault: BlocParts }) {
  const [overrides, setOverrides] = useState<Record<number, BlocOverride>>({});

  const setOverride = (num: number, patch: Partial<BlocOverride>) =>
    setOverrides((prev) => ({
      ...prev,
      [num]: {
        mode: patch.mode ?? prev[num]?.mode ?? "append",
        text: patch.text ?? prev[num]?.text ?? "",
      },
    }));

  const finalPrompt = useMemo(
    () => reassembleWithOverrides(parsedDefault, overrides),
    [parsedDefault, overrides]
  );

  const dirty = Object.values(overrides).some((o) => o?.text.trim().length > 0);

  return (
    <div className="flex flex-col gap-4">
      <OptionHeader
        badge="🎯 Le compromis recommandé"
        title="Tu pilotes chaque bloc indépendamment"
        description="Chaque bloc du prompt (Identité, Comportement, Texture, Résistance) est éditable séparément. Tu peux soit le COMPLÉTER (ton texte s'ajoute après le défaut), soit le REMPLACER entièrement. Champ vide = comportement par défaut intact."
        tone="info"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {parsedDefault.blocs.map((bloc) => {
          const meta = BLOC_META[bloc.num] ?? {
            icon: "fluent:document-24-regular",
            title: bloc.header.replace(/—/g, "").trim(),
            helper: "",
          };
          const override = overrides[bloc.num] ?? { mode: "append", text: "" };
          const blocDirty = override.text.trim().length > 0;

          return (
            <Card key={bloc.num} className={`p-5 flex flex-col gap-3 ${blocDirty ? "ring-2 ring-purple-200" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon icon={meta.icon} className="size-4 text-[#9516C7]" />
                  <Label htmlFor={`bloc-${bloc.num}`} className="text-sm font-semibold">
                    {meta.title}
                  </Label>
                </div>
                {blocDirty && (
                  <span className="text-[10px] uppercase font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                    {override.mode === "replace" ? "Remplacé" : "Complété"}
                  </span>
                )}
              </div>
              {meta.helper && <p className="text-xs text-muted-foreground">{meta.helper}</p>}

              <CollapsiblePreview
                title="Voir le contenu par défaut de ce bloc"
                content={bloc.content.trim()}
              />

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name={`mode-${bloc.num}`}
                      value="append"
                      checked={override.mode === "append"}
                      onChange={() => setOverride(bloc.num, { mode: "append" })}
                      className="accent-[#9516C7]"
                    />
                    <span>Compléter le défaut</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name={`mode-${bloc.num}`}
                      value="replace"
                      checked={override.mode === "replace"}
                      onChange={() => setOverride(bloc.num, { mode: "replace" })}
                      className="accent-[#9516C7]"
                    />
                    <span>Remplacer entièrement</span>
                  </label>
                </div>
                <Textarea
                  id={`bloc-${bloc.num}`}
                  value={override.text}
                  onChange={(e) => setOverride(bloc.num, { text: e.target.value })}
                  rows={5}
                  placeholder={
                    override.mode === "replace"
                      ? "Réécris entièrement ce bloc."
                      : "Ajoute des instructions à ce bloc (ton texte s'ajoute après le défaut)."
                  }
                  className="text-sm resize-none"
                />
              </div>
            </Card>
          );
        })}
      </div>

      <CollapsiblePreview
        title={
          dirty
            ? "Aperçu du prompt final (avec tes overrides) — envoyé à l'IA"
            : "Aperçu du prompt final — envoyé à l'IA (identique au défaut tant que tu n'as rien écrit)"
        }
        content={finalPrompt}
      />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setOverrides({})} disabled={!dirty}>
          Tout réinitialiser
        </Button>
        <Button onClick={() => fakeSave("Blocs préréglés")} className="shannen-gradient text-white">
          <Icon icon="mdi:content-save" className="mr-1 size-4" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
