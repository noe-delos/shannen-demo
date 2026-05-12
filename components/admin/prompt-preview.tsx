"use client";

import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function templatize(rendered: string, agent: AgentLike, ctx: typeof SAMPLE_CONTEXT): string {
  let t = rendered;
  const fullName =
    agent.firstname && agent.lastname
      ? `${agent.firstname} ${agent.lastname}`
      : agent.name ?? "";
  if (fullName) t = t.replace(new RegExp(escapeRegExp(fullName), "g"), "{{prospect_name}}");
  if (agent.job_title)
    t = t.replace(new RegExp(escapeRegExp(agent.job_title), "g"), "{{prospect_job_title}}");
  if (agent.personnality) {
    const json = JSON.stringify(agent.personnality, null, 2);
    t = t.replace(json, "{{prospect_personnality}}");
  }
  t = t
    .replace(new RegExp(escapeRegExp(ctx.secteur), "g"), "{{secteur}}")
    .replace(new RegExp(escapeRegExp(ctx.company), "g"), "{{company}}")
    .replace(new RegExp(escapeRegExp(ctx.historique_relation), "g"), "{{historique_relation}}");
  return t;
}

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
  // Scénario d'exemple FIXE pour les aperçus rendus.
  // L'édition reste 100 % globale — ce scénario sert juste à montrer à quoi ressemble le rendu.
  const agentId = sampleAgents[0]?.id ?? "";
  const callType = "cold_call";

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

  const templatePrompt = useMemo(
    () => (agent ? templatize(defaultPrompt, agent, SAMPLE_CONTEXT) : ""),
    [defaultPrompt, agent]
  );

  const scenarioLabel = useMemo(() => {
    if (!agent) return "";
    const fullName =
      agent.firstname && agent.lastname
        ? `${agent.firstname} ${agent.lastname}`
        : agent.name ?? "Prospect";
    const callLabel = CALL_TYPES.find((c) => c.value === callType)?.label ?? callType;
    return `${fullName} · ${callLabel}`;
  }, [agent, callType]);

  const substitute = useMemo(() => {
    if (!agent) return (s: string) => s;
    const fullName =
      agent.firstname && agent.lastname
        ? `${agent.firstname} ${agent.lastname}`
        : agent.name ?? "";
    const map: Record<string, string> = {
      "{{prospect_name}}": fullName,
      "{{prospect_job_title}}": agent.job_title ?? "",
      "{{prospect_personnality}}": JSON.stringify(agent.personnality, null, 2),
      "{{secteur}}": SAMPLE_CONTEXT.secteur,
      "{{company}}": SAMPLE_CONTEXT.company,
      "{{historique_relation}}": SAMPLE_CONTEXT.historique_relation,
    };
    return (s: string) => {
      let out = s;
      for (const [k, v] of Object.entries(map)) {
        out = out.replace(new RegExp(escapeRegExp(k), "g"), v);
      }
      return out;
    };
  }, [agent]);

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
          3 formats possibles. Bascule entre les onglets pour comparer.{" "}
          <strong>Aucune sauvegarde réelle</strong> — c&apos;est une maquette pour t&apos;aider à choisir
          le format qu&apos;on livrera en V1.
        </p>
      </div>

      <Card className="p-4 border-purple-200 bg-purple-50/60">
        <div className="flex items-start gap-3">
          <Icon icon="fluent:info-24-filled" className="size-5 text-[#9516C7] mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-purple-900">
              Tes modifications s&apos;appliquent à <u>TOUS les prospects</u> et à <u>toutes les simulations</u>
            </p>
            <p className="text-xs text-purple-900/80 leading-relaxed">
              L&apos;exemple ci-dessous utilise <strong>{agentFullName}</strong> en <strong>cold call</strong>{" "}
              juste pour visualiser à quoi ressemble le rendu. Mais ce que tu édites est{" "}
              <strong>global</strong> — ça s&apos;appliquera à Sophie, Catherine, Thomas, et tous les futurs
              prospects, quel que soit le type d&apos;appel.
            </p>
          </div>
        </div>
      </Card>

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
          <Option1
            templatePrompt={templatePrompt}
            scenarioKey={`${agentId}:${callType}`}
            scenarioLabel={scenarioLabel}
            substitute={substitute}
          />
        </TabsContent>
        <TabsContent value="option2" className="mt-6">
          <Option2
            agent={agent}
            callType={callType}
            parsedDefault={parsedDefault}
            scenarioLabel={scenarioLabel}
          />
        </TabsContent>
        <TabsContent value="option3" className="mt-6">
          <Option3 parsedDefault={parsedDefault} scenarioLabel={scenarioLabel} />
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

function Option1({
  templatePrompt,
  scenarioKey,
  scenarioLabel,
  substitute,
}: {
  templatePrompt: string;
  scenarioKey: string;
  scenarioLabel: string;
  substitute: (s: string) => string;
}) {
  const [value, setValue] = useState(templatePrompt);
  const [lastKey, setLastKey] = useState(scenarioKey);

  if (scenarioKey !== lastKey) {
    setLastKey(scenarioKey);
    setValue(templatePrompt);
  }

  const dirty = value !== templatePrompt;

  const liveRendered = useMemo(() => substitute(value), [substitute, value]);

  return (
    <div className="flex flex-col gap-4">
      <OptionHeader
        badge="⚠️ Le plus puissant, le plus risqué"
        title="Tu réécris l'intégralité du prompt système (template global)"
        description="Le textarea ci-dessous est le TEMPLATE GLOBAL — celui qu'on stocke une seule fois et qu'on applique à TOUTES les simulations. Les placeholders {{prospect_name}}, {{secteur}}, {{prospect_personnality}}, etc. sont remplacés automatiquement à chaque appel par les vraies données du prospect choisi. Tu modifies la structure du prompt, pas les données dynamiques."
        tone="warning"
      />

      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="full-prompt" className="text-sm font-semibold">
            Template global du prompt système
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
          Les zones <code className="bg-purple-50 text-purple-700 px-1 rounded">{`{{...}}`}</code> sont
          remplies automatiquement à chaque simulation : <code>{`{{prospect_name}}`}</code>,{" "}
          <code>{`{{prospect_job_title}}`}</code>, <code>{`{{prospect_personnality}}`}</code>,{" "}
          <code>{`{{secteur}}`}</code>, <code>{`{{company}}`}</code>,{" "}
          <code>{`{{historique_relation}}`}</code>.
        </p>
      </Card>

      <CollapsiblePreview
        title={`Aperçu rendu pour ${scenarioLabel} — voir comment le template ressort au runtime`}
        content={liveRendered}
      />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setValue(templatePrompt)} disabled={!dirty}>
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
  scenarioLabel,
}: {
  agent: AgentLike;
  callType: string;
  parsedDefault: BlocParts;
  scenarioLabel: string;
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
        title={`Aperçu rendu pour ${scenarioLabel}${dirty ? " (avec tes ajouts injectés dans BLOC 1 + BLOC 2)" : " — tes zones sont vides, donc identique au défaut"}`}
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

function Option3({
  parsedDefault,
  scenarioLabel,
}: {
  parsedDefault: BlocParts;
  scenarioLabel: string;
}) {
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
        title={`Aperçu rendu pour ${scenarioLabel}${dirty ? " (avec tes overrides bloc par bloc)" : " — pas d'override, identique au défaut"}`}
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
