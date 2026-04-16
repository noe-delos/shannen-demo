# Mission 1 — NeoCell

## Scope

1. **Historique inter-conversations (R1→R2)** — l'agent récupère l'antériorité entre les simulations, avec le contexte saisi par l'élève
2. **Configuration durée d'appel** — dropdown 30 / 45 / 60 min, défaut à 45 min
3. **Limite de consommation** — 3 appels par jour par utilisateur
4. **Suppression Amazon Bedrock** — migration vers clé API directe (Anthropic)
5. **Correction bugs login** — reset password + redirection post-inscription
6. **Correction erreur technique variables ElevenLabs**
7. **Page Profil utilisateur**
8. **Fusion prompt ElevenLabs — renforcement du persona prospect**

---

## État d'avancement

| # | Fonctionnalité | Statut |
|---|----------------|--------|
| 1 | Historique inter-conversations | ✅ Implémenté — partiellement validé |
| 2 | Configuration durée d'appel | ✅ Implémenté |
| 3 | Limite 3 appels/jour | ✅ Implémenté — validé le 16/04/2026 |
| 4 | Suppression Bedrock → API Anthropic | ✅ Implémenté — validé le 15/04/2026 |
| 5a | Redirection post-login | ✅ Pas de bug (code OK) |
| 5b | Reset password | ⏳ À tester en prod |
| 6 | Fix variables ElevenLabs (conversation ID) | ✅ Implémenté — à re-tester |
| 7 | Page Profil utilisateur | ✅ Implémenté — validé le 15/04/2026 |
| 8 | Fusion prompt ElevenLabs | ✅ Implémenté — end_call à re-tester |

---

## Fonctionnalités implémentées

---

### 1. Historique inter-conversations (R1→R2) ✅

**Branche :** `historique_conversations`

**Migrations Supabase exécutées :**
```sql
ALTER TABLE conversations ADD COLUMN summary TEXT NULL;
ALTER TABLE conversations ADD COLUMN history_context TEXT NULL;
ALTER TABLE conversations ADD COLUMN history_conversation_ids UUID[] NULL;
```

**3 modes d'historique disponibles dans le wizard (étape 4) :**
- **Repartir de zéro** — aucun historique injecté dans le prompt (défaut)
- **Saisir manuellement** — champ texte libre, stocké dans `history_context`
- **Reprendre l'historique des appels** — dropdown avec sélection "jusqu'à quel appel" (Option B cascade : sélectionner le 3ème appel inclut automatiquement les 1er et 2ème), stocké dans `history_conversation_ids[]`

**Condition d'affichage du sélecteur :** uniquement les conversations avec `summary IS NOT NULL`, même `agent_id` ET même `product_id`, triées par ordre chronologique ASC.
- Produit différent → n'apparaît pas
- Autre prospect avec même produit → n'apparaît pas

**Fichiers modifiés :**
- `lib/types/database.ts` — 3 nouvelles colonnes dans Row/Insert/Update
- `components/simulation/simulation-stepper.tsx` — `historyMode`, `historyContext`, `historyUntilId` + `loadPreviousConversations()` + section UI étape 4 + calcul `history_conversation_ids` dans `startSimulation()`
- `app/api/simulation/[id]/end/route.ts` — génération du résumé post-simulation via Anthropic (non-bloquant), stocké dans `conversations.summary`
- `app/api/simulation/start/route.ts` — injection de l'historique dans le prompt ElevenLabs

**Notes :**
- Les conversations passées (852 sans résumé) ne sont pas visibles dans le sélecteur — voir section "À demander à Shannen"
- Le sélecteur est grisé avec "Aucun appel précédent pour ce produit" si aucune conversation disponible

**Tests :**
- ✅ Faire 2 simulations avec le même agent + même produit → historique présent
- ✅ Vérifier que la 2ème simulation affiche la 1ère dans le sélecteur "Reprendre l'historique des appels"
- ✅ Prospect différent + même produit → pas d'historique
- ✅ Même prospect + produit différent → pas d'historique
- ✅ Vérifier que le résumé est bien injecté dans le prompt ElevenLabs au démarrage
- ✅ Vérifier que le mode "Saisir manuellement" injecte bien le texte saisi dans le prompt — **validé le 16/04/2026** : history_context bien enregistré en base + agent jouait le contexte de relance post-devis

> ✅ **Validé le 16/04/2026** — filtrage par agent+produit OK + injection "Saisir manuellement" confirmée en prod (history_context enregistré + agent jouait le contexte de relance post-devis).

---

### 2. Configuration durée d'appel ✅

**Branche :** `duree_appel_configuration`

**Migration Supabase exécutée :**
```sql
ALTER TABLE conversations ADD COLUMN max_duration_seconds INTEGER DEFAULT 2700;
```

**Fichiers modifiés :**
- `lib/types/database.ts` — `max_duration_seconds: number` ajouté dans Row/Insert/Update
- `components/simulation/simulation-stepper.tsx` — `maxDuration: 2700` + dropdown 30/45/60 min à l'étape 4
- `app/api/simulation/start/route.ts` — `conversationDetails.max_duration_seconds ?? 2700` (2 occurrences)
- `components/simulation/simulation-conversation.tsx` — timer "XX:XX restantes" affiché sous le chrono, orange à -5min, rouge à -1min

**Vérifié :**
- Dropdown visible à l'étape 4 avec 45 min par défaut
- Valeur `2700` confirmée en base Supabase
- Valeur `2700` confirmée sur l'agent ElevenLabs via API

---

### 3. Limite de consommation — 3 appels/jour par utilisateur ✅

**Branche :** `limite_simulations_jour`

**Pas de migration SQL** — comptage direct sur la table `conversations` existante.

**Fichiers modifiés :**
- `app/api/simulation/start/route.ts` — vérification serveur : COUNT conversations du jour avant création, retourne 429 si >= 3. Fix `.neq("id", conversation_id)` pour ne pas compter la conversation en cours de création.
- `components/layout/app-sidebar.tsx` — `dailyCount` state, barre de progression violette sous "Démarrer !". Si limite atteinte : bouton désactivé + "Limite atteinte · Revenez demain"
- `components/dashboard/dashboard.tsx` — pill "X/3 aujourd'hui" avec 3 points violets alignée à droite du titre

**Notes :**
- La colonne `credits` dans `users` existe déjà mais n'est pas utilisée — à clarifier avec Shannen

**Tests :**
- ✅ Validé le 16/04/2026 — la 4ème simulation est bien bloquée (bug initial corrigé : la 3ème était bloquée à tort)

---

### 4. Suppression Amazon Bedrock → API directe Anthropic ✅

**Branche :** `suppression_bedrock`

**Fichiers modifiés :**
- `app/api/simulation/[id]/end/route.ts` — remplacement complet Bedrock → `anthropic.messages.create()` (feedback + summary)
- `app/api/simulation/end/route.ts` — idem (route legacy)
- `app/api/simulation/start/route.ts` — modèle ElevenLabs `claude-3-7-sonnet` → `claude-haiku-4-5` (2 occurrences)
- `package.json` — `@aws-sdk/client-bedrock-runtime` désinstallé, `@anthropic-ai/sdk` installé

**Modèles utilisés :**
- Feedback post-simulation : `claude-3-haiku-20240307` (maxTokens: 2000, temperature: 0.1)
- Résumé inter-conversations : `claude-3-haiku-20240307` (maxTokens: 300, temperature: 0.1)
- Roleplay ElevenLabs : `claude-haiku-4-5` (via PATCH ElevenLabs)

**Variables d'environnement :**
- ✅ `ANTHROPIC_API_KEY` ajouté dans Vercel et `.env` local

**⚠️ Nettoyage AWS à faire (post-merge) :**
- [ ] Supprimer `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` dans Vercel
- [ ] Supprimer les clés IAM associées dans la console AWS
- [ ] Désactiver / supprimer le compte AWS si Bedrock était le seul service utilisé

> ✅ **Validé le 15/04/2026** — plusieurs conversations ont un `feedback_id` et un `summary` correctement générés.

---

### 5. Correction bugs login

#### 5a. Redirection post-login / post-inscription ✅ PAS DE BUG

`login/page.tsx` et `SignupForm.tsx` utilisent `try { ... } finally { ... }` sans `catch` — le `NEXT_REDIRECT` se propage correctement. Rien à corriger.

#### 5b. Reset password ⏳ À TESTER

**Code vérifié** — le flow est complet et correct (`PASSWORD_RECOVERY` event → `updateUser` → redirect `/login`).

**Seul prérequis :** `NEXT_PUBLIC_SITE_URL` doit être défini sur Vercel pour que les liens de reset pointent vers la prod et non `localhost:3000`.

```
NEXT_PUBLIC_SITE_URL = https://shannen-demo.vercel.app
```

Aucun changement de code nécessaire.

> ⏳ **À tester** : flow complet "mot de passe oublié" → email reçu → lien de réinitialisation → nouveau mot de passe → reconnexion.

---

### 6. Correction erreur technique variables ElevenLabs ✅

**Branche :** `fix_elevenlabs_conversation_id`

**Problème :** `elevenlabs_conversation_id` stockait l'`agent_id` au lieu du `conversation_id` réel.

**Fix :** récupération de l'ID dans `onDisconnect` (disponible uniquement après déconnexion, contrairement à `onConnect`).

**Fichiers modifiés :**
- `components/simulation/simulation-conversation.tsx` — récupération du vrai `conversation_id` dans `onDisconnect`
- `app/api/simulation/[id]/elevenlabs-id/route.ts` — nouvelle route PATCH créée

> ⚠️ **À re-tester** : vérifier que `elevenlabs_conversation_id` contient bien un ID de type `conv_xxx` et non `agent_xxx`.

---

### 7. Page Profil utilisateur ✅

**Branche :** `profil_utilisateur`

**Migrations Supabase exécutées :**
```sql
ALTER TABLE users ADD COLUMN default_secteur TEXT NULL;
ALTER TABLE users ADD COLUMN default_company TEXT NULL;
```

**Bucket Supabase Storage créé :** `avatars` (public, 5MB max, jpg/png/webp/gif)

**Fichiers créés/modifiés :**
- `app/(dashboard)/profile/page.tsx` — page profil
- `components/profile/profile-form.tsx` — formulaire avec 4 sections : photo, identité, contexte par défaut, changement de mot de passe
- `components/layout/app-sidebar.tsx` — footer remplacé par bloc avatar cliquable → `/profile`
- `components/layout/header.tsx` — popover avatar avec lien "Mon profil"
- `components/simulation/simulation-stepper.tsx` — `loadUserDefaults()` au montage ; fallback sur `default_secteur` / `default_company` du profil
- `lib/types/database.ts` — `default_secteur` + `default_company` ajoutés

**Tests :**
- ✅ Uploader une photo → s'affiche dans sidebar et header
- ✅ Sauvegarder secteur/entreprise → pré-remplis à l'étape 4 du wizard
- ✅ Changer le mot de passe → reconnexion OK

> ✅ **Validé le 15/04/2026**

---

### 8. Fusion prompt ElevenLabs — renforcement du persona prospect ✅

**Branche :** `fusion_prompt_elevenlabs`

**Structure du prompt assemblé (`app/api/simulation/start/route.ts`) :**

```
BLOC 1 — Identité & contexte          ← dynamique (agent, produit, type d'appel, historique)
BLOC 2 — Comportement général         ← prospect passif, phrases courtes, patterns interdits
BLOC 3 — Texture des réponses/niveau  ← calibré par agent.difficulty (facile/moyen/difficile)
BLOC 4 — Résistances & raccrochage    ← conditionné par callType
```

**Comportement par callType :**

| callType | Résistance départ | Raccrochage | end_call tool |
|---|---|---|---|
| `cold_call` | Palier 1 (résistance froide) | Palier 3 ou hardcore | ✅ |
| `follow_up_call` | Palier 1 mais moins hostile | Palier 3 uniquement | ✅ |
| `discovery_meeting` | Pas de résistance froide | Non — clôture polie | ❌ |
| `product_demo` | Ouvert | Non — clôture polie | ❌ |
| `closing_call` | Neutre/exigeant | Non — "je reviens vers vous" | ❌ |

**Tests :**
- ✅ Comportement de résistance présent (validé le 15/04/2026)
- ⚠️ Raccrochage automatique via `end_call` non déclenché lors du test — à re-tester en jouant délibérément un mauvais vendeur jusqu'au bout
- ⏳ Vérifier l'absence de patterns IA ("Je vous écoute attentivement", etc.)
- ⏳ Vérifier réponses en 1-2 phrases max, langue française uniquement

---

## Bugs corrigés

- ✅ **Modèle ElevenLabs `claude-3-5-haiku` invalide** → remplacé par `claude-haiku-4-5`
- ✅ **`first_message` manquant dans le PATCH ElevenLabs** : l'agent gardait "Bonjour" → fix "Allô ?" pour cold_call, "Oui, bonjour ?" pour les autres
- ✅ **Feedback non généré quand ElevenLabs raccroche** : stale closure `elapsedTime = 0` dans `onDisconnect` → fix `elapsedTimeRef` synchronisé à chaque tick. **Validé le 16/04/2026**
- ✅ **Limite 3 simulations/jour bloquait à la 3ème** : conversation créée avant `/start` donc déjà comptée. Fix `.neq("id", conversation_id)`. **Validé le 16/04/2026**
- ✅ **Wizard étape 4 — "Historique de la relation" mal initialisé** : le localStorage restaurait l'ancienne valeur. Fix : `historique_relation` toujours réinitialisé à `"Premier contact"` au chargement
- ✅ **Date affichée incorrecte ("aujourd'hui" au lieu de "hier")** : comparaison calendaire corrigée dans `dashboard.tsx` et `app-sidebar.tsx`
- ✅ **Feedback toujours en fallback ("Conversation complétée")** : modèle `claude-3-5-haiku-20241022` → 404 sur l'org Anthropic. Fix : switch vers `claude-3-haiku-20240307`. **Validé le 16/04/2026**
- ✅ **Post-it "Briefing de Simulation" trop court** : `overflow-hidden` retiré, `line-clamp` → `break-words`. **Validé le 16/04/2026**
- ✅ **Photo manquante pour Céline Laurent** : `picture_url` null en base. Fix : avatar `ui-avatars.com` mis à jour directement en Supabase
- ✅ **Erreurs de hydration Next.js (`<p>` imbriqué dans `<p>`)** : `AlertDialogDescription` rendait un `<p>` contenant des `<p>` enfants dans `agents-grid.tsx` et `products-grid.tsx`. Fix : `asChild` + `<div>`/`<span>`
- ✅ **Avatar par défaut manquant à la création d'agent** : quand aucune photo uploadée, avatar auto-généré via `ui-avatars.com` (initiales + fond violet #9516C7). (`agents-grid.tsx`)
- ✅ **Fallback `/default-avatar.png` (fichier inexistant) partout** : remplacé par `ui-avatars.com` dans tous les composants — `dashboard.tsx`, `conversation-details.tsx`, `simulation-stepper.tsx`, `simulation-conversation.tsx`, `agents-grid.tsx`

---

## À demander à Shannen

- **Résumés des conversations existantes** — 852 conversations ont un transcript mais pas de résumé. Le sélecteur "Reprendre l'historique" ne les affiche donc pas. Générer les résumés manquants serait coûteux (852 appels IA). À valider : génération rétroactive oui/non, et si oui pour tous les users ou seulement certains ?
- **Nouvelle clé API Anthropic** — la clé actuelle (`ANTHROPIC_API_KEY` dans Vercel) n'a accès qu'à `claude-3-haiku-20240307`. Demander une clé avec accès aux modèles récents pour améliorer la qualité du feedback et des résumés.
  - ❌ `claude-3-5-haiku-20241022` : 404 (testé le 15/04/2026)
  - ❌ `claude-3-7-sonnet-20250219` : deprecated + 404 (testé le 16/04/2026 — EOL février 2026)
  - ❌ `claude-sonnet-4-5-20250929` : 404 (testé le 15/04/2026)
  - ✅ `claude-3-haiku-20240307` : fonctionne (modèle actuel en prod)
- **Nettoyage AWS** — supprimer les variables `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` dans Vercel + désactiver les clés IAM associées

---

## Remarques techniques

- **localStorage dans le wizard** — l'étape 4 (secteur, entreprise, contexte personnalisé) est pré-remplie avec la dernière config par agent. Comportement voulu via `loadSavedConfig` / `saveConfig` dans `simulation-stepper.tsx`.
- **Qualité des simulations** — l'agent IA répète les mêmes répliques scriptées génériques si le prospect n'a pas de description détaillée dans son champ "Objectif / contexte". Les phrases d'exemple du system prompt (`"Vous êtes la 3e personne ce mois-ci..."`) sont reprises mot pour mot par le modèle.

---

## Suggestions UX / futures améliorations

- [ ] **Création de simulation — raccourcis étape 1 & 2** : ajouter un bouton "Créer un prospect" inline à l'étape 1 et "Créer un produit" à l'étape 2. Évite de quitter le wizard et perdre la progression.

- [ ] **Création de prospect — description enrichie + génération IA** : le champ "Objectif / contexte" est injecté directement dans le system prompt ElevenLabs — sans description détaillée, l'agent utilise des répliques génériques répétitives. **Suggestion : bouton "Générer avec l'IA"** qui génère automatiquement une description riche (traits de caractère, objections typiques, contexte d'entreprise, comportement face aux vendeurs) à partir du nom, job title et difficulté.
