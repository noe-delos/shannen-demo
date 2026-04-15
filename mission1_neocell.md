# Mission 1 — NeoCell

## Scope

1. **Historique inter-conversations (R1→R2)** — l'agent récupère l'antériorité entre les simulations, avec le contexte saisi par l'élève
2. **Configuration durée d'appel** — dropdown 30 / 45 / 60 min, défaut à 45 min
3. **Limite de consommation** — 3 appels par jour par utilisateur
4. **Suppression Amazon Bedrock** — migration vers clé API directe (Anthropic ou OpenAI)
5. **Correction bugs login** — reset password + redirection post-inscription
6. **Correction erreur technique variables ElevenLabs**

---

## Plan d'implémentation

---

### 1. Historique inter-conversations (R1→R2) ✅ IMPLÉMENTÉ

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

**Condition d'affichage du sélecteur :** uniquement les conversations avec `summary IS NOT NULL`, même `agent_id` (même prospect) ET même `product_id` (même produit), triées par ordre chronologique ASC.
- Si l'appel concernait un produit différent → n'apparaît pas (injecter un historique sur un produit différent n'aurait pas de sens)
- Si l'appel concernait un autre prospect avec le même produit → n'apparaît pas non plus (Jean Verdi ne peut pas se souvenir d'une conversation qu'il n'a pas eue)

**Fichiers modifiés :**
- `lib/types/database.ts` — 3 nouvelles colonnes dans Row/Insert/Update
- `components/simulation/simulation-stepper.tsx` — `historyMode`, `historyContext`, `historyUntilId` dans l'interface + `loadPreviousConversations()` chargé quand agent+produit sont sélectionnés + section UI étape 4 + calcul `history_conversation_ids` dans `startSimulation()`
- `app/api/simulation/[id]/end/route.ts` — génération du résumé post-simulation via Bedrock (second appel IA après le feedback, non-bloquant), stocké dans `conversations.summary`
- `app/api/simulation/start/route.ts` — injection de l'historique dans le prompt ElevenLabs si `history_conversation_ids` ou `history_context` renseigné

**Conditions importantes :**
- Le résumé est généré uniquement à partir de cette implémentation → les conversations passées (852 sans résumé) ne sont **pas** visibles dans le sélecteur tant qu'elles n'ont pas de `summary`
- Le sélecteur est grisé avec "Aucun appel précédent pour ce produit" si aucune conversation disponible
- La cohérence est assurée par l'Option B (cascade) : impossible de sélectionner un appel sans inclure ceux qui le précèdent

**À tester (test humain obligatoire) :**
- Faire 2 simulations avec le même agent + même produit
- Vérifier que la 2ème simulation affiche la 1ère dans le sélecteur "Reprendre l'historique des appels"
- Vérifier que le résumé est bien injecté dans le prompt ElevenLabs au démarrage
- Vérifier que le mode "Saisir manuellement" injecte bien le texte saisi dans le prompt
- Vérifier que le mode "Repartir de zéro" n'injecte aucun historique
- Vérifier que si agent ou produit différent, les conversations précédentes n'apparaissent pas dans le sélecteur

---

### 2. Configuration durée d'appel ✅ IMPLÉMENTÉ

**Branche :** `duree_appel_configuration`

**Migration Supabase exécutée :**
```sql
ALTER TABLE conversations ADD COLUMN max_duration_seconds INTEGER DEFAULT 2700;
```

**Fichiers modifiés :**
- `lib/types/database.ts` — `max_duration_seconds: number` ajouté dans Row/Insert/Update de `conversations`
- `components/simulation/simulation-stepper.tsx` — `maxDuration: 2700` dans l'interface + état initial + dropdown 30/45/60 min à l'étape 4 + valeur envoyée à Supabase dans l'insert
- `app/api/simulation/start/route.ts` — ligne 145 : `2700` fixe (init générique agent) ; lignes 464 et 548 : `conversationDetails.max_duration_seconds ?? 2700`
- `components/simulation/simulation-conversation.tsx` — timer "XX:XX restantes" affiché sous le chrono, orange à -5min, rouge à -1min

**Vérifié :**
- Dropdown visible à l'étape 4 avec 45 min par défaut
- Valeur `2700` confirmée en base Supabase
- Valeur `2700` confirmée sur l'agent ElevenLabs `agent_5501kp5r0nwqemb9tydrbez2zdzw` via API

---

### 3. Limite de consommation — 3 appels/jour par utilisateur ✅ IMPLÉMENTÉ

**Branche :** `limite_simulations_jour`

**Pas de migration SQL** — comptage direct sur la table `conversations` existante.

**Fichiers modifiés :**
- `app/api/simulation/start/route.ts` — vérification serveur : COUNT conversations du jour avant création, retourne 429 si >= 3
- `components/layout/app-sidebar.tsx` — `dailyCount` state, chargé en parallèle avec les conversations via `Promise.all`. Affiche une barre de progression violette sous le bouton "Démarrer !". Si limite atteinte : bouton désactivé + message "Limite atteinte · Revenez demain"
- `components/dashboard/dashboard.tsx` — `dailyCount` state, chargé en parallèle. Affiche une pill "X/3 aujourd'hui" avec 3 points violets alignée à droite du titre

**Tests :**
- ✅ Test automatique (Claude) concluant — 2 conversations fictives insérées en base pour atteindre la limite, bouton désactivé côté sidebar + message "Limite atteinte · Revenez demain", pill "Limite atteinte" côté dashboard, données de test supprimées après vérification
- ⚠️ Test humain à faire — vérifier le flow complet : faire 3 vraies simulations et confirmer que la 4ème est bloquée (UI + erreur 429 retournée par la route)

**Étape 1 — Vérification au démarrage**

Fichier : `app/api/simulation/start/route.ts`

Avant de créer la conversation, compter le nombre de simulations du jour :
```sql
SELECT COUNT(*) FROM conversations
WHERE user_id = $userId
  AND created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day'
```

Si `count >= 3` → retourner une erreur 429 avec message clair.

**Étape 2 — Affichage côté frontend**

Afficher dans le dashboard ou dans le wizard le nombre d'appels restants pour la journée (ex : "2 simulations restantes aujourd'hui"). Appel simple à une route ou ajout dans le payload du dashboard existant.

**Notes :**
- La colonne `credits` dans `users` existe déjà mais n'est pas utilisée — ne pas la toucher dans cette mission (clarification à avoir avec Shannen sur son usage prévu)
- Le comptage par date évite d'avoir à décrémenter quoi que ce soit

**Fichiers touchés :**
- `app/api/simulation/start/route.ts` — ajout vérification
- Frontend dashboard / wizard — affichage compteur

---

### 4. Suppression Amazon Bedrock → API directe ✅ IMPLÉMENTÉ

**Branche :** `suppression_bedrock`

**Objectif :** remplacer le client AWS Bedrock par un appel direct à l'API Anthropic dans la route de génération de feedback.

**Variable d'environnement à ajouter :**
```
ANTHROPIC_API_KEY=sk-ant-...
```

**Étape 1 — Remplacer le client**

Fichier : `app/api/simulation/[id]/end/route.ts`

Supprimer :
```typescript
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
```

Remplacer par le SDK Anthropic :
```typescript
import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

Remplacer l'appel `ConverseCommand` par `anthropic.messages.create()` avec le même prompt et les mêmes paramètres (modèle : `claude-3-5-haiku-20241022`, maxTokens : 2000, temperature : 0.1).

**Étape 2 — Même opération sur la route legacy**

Fichier : `app/api/simulation/end/route.ts` — appliquer le même remplacement (ou supprimer cette route si elle est confirmée comme morte, cf. audit point 10).

**Étape 3 — Nettoyer les dépendances**

```bash
npm uninstall @aws-sdk/client-bedrock-runtime
```

Supprimer les variables d'environnement AWS du `.env` et des configs Vercel :
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

**Étape 4 — Mettre à jour le modèle dans le PATCH ElevenLabs**

Fichier : `app/api/simulation/start/route.ts` ligne ~421

Changer `"claude-3-7-sonnet"` → `"claude-3-5-haiku"` dans le payload PATCH ElevenLabs (modèle du roleplay conversationnel).

**Modèles utilisés :**
- Feedback post-simulation : `claude-3-5-haiku-20241022` (maxTokens: 2000, temperature: 0.1)
- Résumé inter-conversations : `claude-3-5-haiku-20241022` (maxTokens: 300, temperature: 0.1)
- Roleplay ElevenLabs (conversationnel) : `claude-3-5-haiku` (via PATCH ElevenLabs)

**Fichiers modifiés :**
- `app/api/simulation/[id]/end/route.ts` — remplacement complet Bedrock → `anthropic.messages.create()` (feedback + summary)
- `app/api/simulation/end/route.ts` — idem (route legacy)
- `app/api/simulation/start/route.ts` — modèle ElevenLabs `claude-3-7-sonnet` → `claude-3-5-haiku` (2 occurrences)
- `package.json` — `@aws-sdk/client-bedrock-runtime` désinstallé, `@anthropic-ai/sdk` installé

**Variables d'environnement :**
- ✅ `ANTHROPIC_API_KEY` ajouté dans Vercel et `.env` local
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` peuvent être supprimés des variables Vercel (plus utilisés)

**⚠️ Nettoyage AWS à faire (post-merge) :**
- [ ] Supprimer les variables `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` dans les settings Vercel
- [ ] Supprimer les clés d'accès IAM associées dans la console AWS
- [ ] Vérifier qu'aucun autre service du projet n'utilise encore AWS (recherche `aws-sdk` dans le code)
- [ ] Désactiver / supprimer le compte AWS si Bedrock était le seul service utilisé

**À tester :** faire une simulation complète et vérifier que le feedback est bien généré (plus d'erreur Bedrock dans les logs Vercel).

---

### 5. Correction bugs login

#### 5a. Redirection post-login / post-inscription ✅ PAS DE BUG

**Vérification :** `login/page.tsx` et `SignupForm.tsx` utilisent `try { ... } finally { ... }` **sans `catch`** — le `NEXT_REDIRECT` lancé par `redirect()` côté serveur se propage correctement et la redirection fonctionne. Rien à corriger.

#### 5b. Reset password

**Code vérifié** — le flow est complet et correct (`PASSWORD_RECOVERY` event → `updateUser` → redirect `/login`).

**Seul bug identifié :** `NEXT_PUBLIC_SITE_URL` non défini sur Vercel → les liens de reset pointent sur `localhost:3000`.

**Fix :** ajouter dans Vercel → Settings → Environment Variables :
```
NEXT_PUBLIC_SITE_URL = https://shannen-demo.vercel.app
```

Aucun changement de code nécessaire.

**Fichiers touchés :**
- `app/login/page.tsx` — fix redirect
- `app/signup/page.tsx` — fix redirect
- `app/login/actions.ts` — retourner `{ success: true }` au lieu de `redirect()`
- `app/signup/actions.ts` — idem
- `app/forgot-password/actions.ts` — vérification URL + feedback UI
- Variables d'environnement Vercel : `NEXT_PUBLIC_SITE_URL`

---

### 6. Correction erreur technique variables ElevenLabs ✅ IMPLÉMENTÉ

**Branche :** `fix_elevenlabs_conversation_id`

**Problème identifié dans l'audit :** le champ `elevenlabs_conversation_id` dans la table `conversations` stocke en réalité l'`agent_id` ElevenLabs et non le `conversation_id`. Cela empêche de récupérer le transcript depuis l'API ElevenLabs (l'appel échoue toujours, c'est le fallback frontend qui sauve).

**Fix :**

**Étape 1 — Stocker le vrai conversation ID**

Fichier : `components/simulation/simulation-conversation.tsx` (ou le hook qui gère la session ElevenLabs)

Au moment de la connexion websocket ElevenLabs, le `conversation_id` réel est reçu dans les métadonnées de session. L'identifier et le capturer.

Appeler une route pour mettre à jour `conversations.elevenlabs_conversation_id` avec la vraie valeur dès la connexion établie.

**Étape 2 — Pas de migration nécessaire**

Les anciennes données n'ont pas besoin d'être corrigées (les transcripts sont déjà sauvegardés via le fallback frontend). On corrige uniquement les nouvelles conversations.

**Note sur les deux implémentations de PATCH incohérentes :**

`manage-agent/route.ts` utilise un payload minimal différent de `start/route.ts`. À aligner ou à supprimer si la route n'est plus utilisée — à vérifier.

**Fichiers modifiés :**
- `components/simulation/simulation-conversation.tsx` — dans `onConnect`, appel PATCH non-bloquant avec `conversation.getId()`
- `app/api/simulation/[id]/elevenlabs-id/route.ts` — nouvelle route PATCH créée

**À tester :** faire une simulation, vérifier dans Supabase que `elevenlabs_conversation_id` contient bien un ID de type `conv_xxx` et non un `agent_xxx`.

---

### 7. Page Profil utilisateur ✅ IMPLÉMENTÉ

**Branche :** `profil_utilisateur`

**Migrations Supabase exécutées :**
```sql
ALTER TABLE users ADD COLUMN default_secteur TEXT NULL;
ALTER TABLE users ADD COLUMN default_company TEXT NULL;
```

**Bucket Supabase Storage créé :** `avatars` (public, 5MB max, jpg/png/webp/gif)
- Policies RLS : lecture publique, upload/update/delete uniquement par le propriétaire (`auth.uid() = foldername[1]`)

**Fichiers créés/modifiés :**
- `app/(dashboard)/profile/page.tsx` — page profil (server component, auth guard)
- `components/profile/profile-form.tsx` — formulaire profil avec 4 sections :
  - Photo de profil (upload → Supabase Storage bucket `avatars`, path `{user_id}/avatar.{ext}`)
  - Identité : prénom, nom (email désactivé, non modifiable)
  - Contexte par défaut : `default_secteur` + `default_company` pré-remplis dans le wizard
  - Changement de mot de passe : re-authentification + `supabase.auth.updateUser()`
- `components/layout/app-sidebar.tsx` — footer remplacé par bloc avatar cliquable (photo + email, nom si renseigné) → `/profile` + bouton logout icône séparé. Email toujours affiché même si pas de nom/prénom.
- `components/layout/header.tsx` — popover avatar : ajout lien "Mon profil" + "Se déconnecter" en rouge
- `components/simulation/simulation-stepper.tsx` — `loadUserDefaults()` au montage ; si pas de localStorage pour l'agent, fallback sur `default_secteur` / `default_company` du profil
- `lib/types/database.ts` — `default_secteur` + `default_company` ajoutés dans `users` Row/Insert/Update

**À tester :**
- Uploader une photo → vérifier qu'elle s'affiche dans la sidebar et le header
- Sauvegarder secteur/entreprise par défaut → créer une nouvelle simulation avec un nouvel agent → vérifier que les champs sont pré-remplis à l'étape 4
- Changer le mot de passe → se déconnecter → se reconnecter avec le nouveau mdp

---

## Ordre d'implémentation recommandé

| Priorité | Point | Effort | Impact |
|----------|-------|--------|--------|
| 🔴 1 | Bugs login (redirection + reset password) | Faible | Bloquant pour les users |
| 🔴 2 | Limite 3 appels/jour | Faible | Urgent (crédits ElevenLabs) |
| 🟠 3 | Suppression Bedrock → API directe | Moyen | Simplification stack |
| 🟠 4 | Configuration durée d'appel | Moyen | Économie crédits + UX |
| 🟡 5 | Fix variables ElevenLabs (conversation ID) | Faible | Qualité technique |
| 🟡 6 | Historique inter-conversations | Élevé | Feature principale |

---

## Remarques

- **localStorage dans le wizard** — l'étape 4 du wizard (secteur, entreprise, contexte personnalisé) est pré-remplie automatiquement avec la dernière config sauvegardée pour chaque agent. C'est le comportement voulu via `loadSavedConfig` / `saveConfig` dans `simulation-stepper.tsx`. Ce comportement est identique en local et en prod — chaque utilisateur a ses propres données stockées dans le `localStorage` de son navigateur.

---

### 8. Fusion prompt ElevenLabs — renforcement du persona prospect

**Branche :** `fusion_prompt_elevenlabs`

**Contexte :** le prompt actuel dans `start/route.ts` est trop simpliste (instructions 1-11 génériques). Le client a fourni un document de référence (`elo_michel_prompt_config.pdf`) avec une structure en 5 blocs plus réaliste.

**Décision :** fusion des deux prompts avec priorité sur le nouveau document. Suppression du BLOC 5 scoring (géré par Anthropic côté feedback). Remplacement de `[raccroches]` par le system tool natif ElevenLabs `end_call`.

---

**Structure finale du prompt assemblé :**

```
BLOC 1 — Identité & contexte          ← dynamique (actuel, conservé)
BLOC 2 — Comportement général         ← nouveau doc (remplace instructions 1-11)
BLOC 3 — Texture des réponses/niveau  ← nouveau doc, calibré par agent.difficulty
BLOC 4 — Résistances & raccrochage    ← nouveau doc, conditionné par callType
```

**Règle `end_call` tool :**
- Ajout du system tool `end_call` dans le payload PATCH ElevenLabs
- `end_call` actif uniquement pour `cold_call` et `follow_up_call`
- Les autres types (`discovery_meeting`, `product_demo`, `closing_call`) utilisent une clôture polie sans raccrocher

**Comportement par callType :**

| callType | Résistance départ | Raccrochage | end_call tool |
|---|---|---|---|
| `cold_call` | Palier 1 (résistance froide) | Palier 3 ou hardcore | ✅ |
| `follow_up_call` | Palier 1 mais moins hostile | Palier 3 uniquement | ✅ |
| `discovery_meeting` | Pas de résistance froide (RDV accepté) | Non — clôture polie | ❌ |
| `product_demo` | Ouvert (niveau facile par défaut) | Non — clôture polie | ❌ |
| `closing_call` | Neutre/exigeant, objections précises | Non — "je reviens vers vous" | ❌ |

**Niveau HARDCORE :**
- Réservé aux élèves ayant validé les niveaux 1 à 3
- Raccrochage dès le 1er ou 2ème échange
- ⚠️ À implémenter : système de progression par niveau dans l'app (feature future)
- Pour l'instant : niveau hardcore disponible comme option de difficulté dans la fiche agent

**Fichiers modifiés :**
- `app/api/simulation/start/route.ts` — remplacement des instructions 1-11 + ajout tool `end_call`

**À tester (test humain obligatoire) :**

Cold call — niveau difficile :
- L'agent démarre en palier 1 (résistance froide : "Oui ?" ou "Allô." sans rien ajouter)
- Si accroche générique → passage palier 2 ("Ça ressemble à tous les appels que je reçois.")
- Si toujours mauvais → palier 3 + raccrochage via tool `end_call` natif ElevenLabs
- Si accroche pertinente → l'agent s'ouvre progressivement et revient palier 1

Cold call — niveau hardcore :
- Accroche type "je vous dérange" ou pitch générique → raccrochage immédiat dès le 1er échange
- Accroche pertinente → "Hmm. Continuez." / "J'ai 30 secondes."

Follow-up call :
- L'agent reconnaît la personne mais reste neutre/hésitant
- Objections spécifiques relance (prix, concurrent, délai décision)
- Raccroche poliment si vendeur ne répond pas aux points bloquants

Discovery / Demo / Closing :
- Vérifier qu'il n'y a PAS de raccrochage brutal (clôture polie uniquement)
- Vérifier que l'agent pose des questions sur le contexte si le vendeur pitch trop tôt

Tous niveaux :
- Aucun pattern IA ("Je vous écoute attentivement", "C'est une excellente question", etc.)
- Réponses en 1-2 phrases max
- Langue française exclusivement

---

## Ordre de merge des branches

Merger dans cet ordre vers `mission1_neocell`, puis `mission1_neocell` → `main` en dernier.

```
1. duree_appel_configuration      → mission1_neocell
2. limite_simulations_jour        → mission1_neocell
3. historique_conversations       → mission1_neocell
4. suppression_bedrock            → mission1_neocell
5. fix_elevenlabs_conversation_id → mission1_neocell
6. profil_utilisateur             → mission1_neocell
7. fusion_prompt_elevenlabs       → mission1_neocell
8. mission1_neocell               → main  ← déclenche le déploiement Vercel
```

**⚠️ Checklist avant de merger dans `main` :**
- [ ] `ANTHROPIC_API_KEY` défini dans les variables Vercel ✅ (déjà fait)
- [ ] `NEXT_PUBLIC_SITE_URL=https://shannen-demo.vercel.app` défini dans Vercel
- [ ] Tester les points critiques de chaque branche (voir sections "À tester" ci-dessus)

---

## À demander à Shannen

- **Résumés des conversations existantes** — 852 conversations ont un transcript mais pas de résumé (feature inexistante avant cette mission). Le sélecteur "Reprendre l'historique" ne les affiche donc pas. On peut générer les résumés manquants via Bedrock en batch, mais c'est coûteux (852 appels IA). À valider avec Shannen : est-ce qu'on génère les résumés rétroactivement, et si oui pour tous les users ou seulement certains ?

---

## Questions à clarifier avec Shannen

1. **Colonne `credits`** — quel était le but initial ? Le garder pour une future monétisation ou l'ignorer ?
2. **Option "Repartir de zéro"** — doit-elle être activée par défaut ou désactivée ?
3. **Dropdown durée** — 30/45/60 min suffit ou ajouter d'autres options ?
4. **Modèle LLM pour le roleplay** — `claude-3-5-haiku` ou `gpt-4o-mini` ? (contrainte écosystème ?)
