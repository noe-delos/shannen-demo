# Audit technique — Shannen (S for Sales)

## Architecture ElevenLabs

### Modèle : 1 user = 1 agent ElevenLabs dédié

- Chaque user a un `elevenlabs_agent_api_id` stocké dans la table `users` Supabase
- À l'inscription, ce champ est `null`
- Au **premier lancement d'une simulation**, un agent ElevenLabs est créé automatiquement (payload générique minimal) et l'ID est sauvegardé dans `users.elevenlabs_agent_api_id`
- À **chaque simulation**, cet agent est reconfiguré via un PATCH avec le prompt du persona choisi, la voix, le nom, les tags — tout est dynamique
- Si l'agent n'existe plus sur ElevenLabs (404), le code recrée automatiquement un nouvel agent et met à jour Supabase

### Agents préconfigurés (partagés)

5 agents dans la table `agents` avec `user_id = null` — ce sont des templates disponibles pour tous les users :

| Nom | Poste | Difficulté |
|-----|-------|-----------|
| Julie Leblanc (Manager Enthousiaste) | Responsable Commercial | facile |
| Thomas Rousseau (Startup Founder) | Fondateur/CEO | moyen |
| Jean Verdi (CEO fermé) | CEO pressé | difficile |
| Sophie Martin (Directrice Analytique) | Directrice Marketing | moyen |
| Pierre Moreau (DSI Prudent) | Directeur SI | difficile |

Ces agents Supabase ne sont que des **données** (personnalité, voix, difficulté) injectées dans le prompt — ils ne correspondent pas à des agents ElevenLabs partagés. Pas de risque de conflit.

### Chiffres (avril 2026)

- 86 users avec un `elevenlabs_agent_api_id` dans Supabase
- 42 agents actifs sur ElevenLabs → 44 IDs fantômes (auto-corrigés à la prochaine simulation)
- Aucun agent utilisé par plusieurs users simultanément (vérifié en base)

---

## Schéma Supabase

### `users`
- `elevenlabs_agent_api_id` — agent ElevenLabs dédié au user
- `credits` — crédits pour faire des simulations

### `agents` (personas / interlocuteurs)
- `user_id = null` → agent préconfiguré global
- `user_id` renseigné → agent créé par le user
- `personnality` — JSON : attitude, verbalisation, écoute, présence, prise_de_décision
- `voice_id` — voix ElevenLabs associée
- `difficulty` — facile / moyen / difficile

### `products`
- Produit/service que le user veut s'entraîner à vendre
- `pitch`, `price`, `marche`, `principales_objections_attendues`

### `conversations`
- Une simulation = une conversation
- `call_type` — cold_call / discovery_meeting / product_demo / closing_call / follow_up_call
- `context` — secteur, company, historique_relation
- `goal` — contexte personnalisé injecté dans le prompt
- `transcript` — transcription de l'appel
- `elevenlabs_conversation_id` — contient en réalité l'`agent_id` ElevenLabs (naming trompeur)
- `feedback_id` → lien vers le feedback post-simulation

### `feedback`
- Analyse post-simulation générée par IA
- `note`, `points_forts`, `axes_amelioration`, `moments_cles`, `suggestions`, `analyse_complete`

---

## Flow de configuration d'une simulation (4 étapes)

Avant chaque simulation, le user configure via un wizard 4 étapes :

1. **Prospect** — choix du persona (agents préconfigurés ou créés par le user)
2. **Produit** — choix du produit/service à vendre
3. **Type d'appel** — cold_call / discovery_meeting / product_demo / closing_call / follow_up_call
4. **Contexte et objectif** :
   - Secteur d'activité
   - Nom de l'entreprise
   - Historique de la relation (Premier contact / 2ème appel / Relance post-devis)
   - Objectif personnel (texte libre)

Tout est sauvegardé dans la table `conversations` (`context`, `goal`, `call_type`, `agent_id`, `product_id`) et injecté dynamiquement dans le prompt au moment du PATCH ElevenLabs.

Un persona peut être réutilisé dans plusieurs simulations — il ne garde aucun état, c'est un template statique.

---

## Points d'attention

| # | Sujet | Statut |
|---|-------|--------|
| ~~1~~ | ~~Agents partagés → risque de conflit si 2 users lancent en même temps~~ | ~~À auditer~~ → **Invalidé** : 1 user = 1 agent, pas de partage |
| 2 | Claude 3.7 tourne sur AWS Bedrock → récupérer accès AWS ou migrer vers API Anthropic directe | À traiter |
| 3 | ~~Pas de système de reset password~~ | ~~À implémenter~~ → **Invalidé** : pages `/forgot-password` et `/reset-password` existent et sont fonctionnelles, lien accessible depuis la page login *(à tester quand même pour valider le flow complet)* |
| 4 | Pas de limites de consommation par user → crédits ElevenLabs cramés (500K crédits, plan 99€/mois, épuisé en 12 jours) | Urgent |
| 5 | Limite d'appel hardcodée à 1800 sec (30 min) dans le code (`simulation/start/route.ts`) → proposer un dropdown user (15 / 20 / 30 / 45 / 50 / 60 min) à l'étape 4 de configuration, stocker dans `conversations.max_duration_seconds`, passer la valeur dans le PATCH ElevenLabs. **Économie de tokens** : moins l'appel est long, moins le LLM génère de tokens de réponse → réduction directe de la consommation de crédits ElevenLabs (estimé -50K crédits/mois si défaut à 15 min) | À implémenter |

---

## Scope P1 (urgent)

1. **Contexte inter-conversations** — les élèves perdent l'historique entre les sessions (R1 → R2). Il faut que l'agent récupère l'antériorité.

   **Solution retenue : résumé IA post-simulation (Option 2)**
   - Après chaque simulation, générer un résumé condensé de l'appel via Claude et le stocker dans une nouvelle colonne `summary` dans la table `conversations`
   - Au lancement de la simulation suivante, récupérer les résumés des conversations précédentes avec le même persona et les injecter dans le prompt
   - S'appuie sur le feedback déjà généré post-appel (`feedback` table) comme source
   - Avantages : prompt maîtrisé en taille, simple à implémenter, tout est déjà en base
   - Limiter à **5 simulations maximum** avec le même persona — au-delà, utiliser un méta-résumé qui consolide tout l'historique en un seul bloc
   - Prévoir une option **"Repartir de zéro"** au moment de configurer la simulation : si activée, l'historique n'est pas injecté dans le prompt et le persona repart sans mémoire

2. **Durée d'appel configurable** — actuellement hardcodée à 30 min dans le code. Ajouter un dropdown (15 / 20 / 30 min) à l'étape 4 de configuration, stocker dans une nouvelle colonne `conversations.max_duration_seconds`, passer la valeur dans le PATCH ElevenLabs.
3. **Fix bugs existants** — bugs identifiés :
   - **`elevenlabs_conversation_id` stocke l'agent ID au lieu du conversation ID** — le champ contient l'agent ID ElevenLabs, pas l'ID de conversation. Conséquence : l'appel API pour récupérer le transcript/historique depuis ElevenLabs échoue toujours, c'est le fallback frontend qui sauve. Fix : stocker le vrai conversation ID (reçu à la connexion websocket) à partir de maintenant. Pas de migration nécessaire pour les anciennes données (transcripts déjà sauvegardés via le fallback).
   - **Pas de redirection après login/signup** — le composant `login/page.tsx` et `signup/page.tsx` sont en `"use client"` et appellent les server actions dans un bloc try/finally. Le `redirect("/")` déclenché côté serveur lance une exception `NEXT_REDIRECT` qui est silencieusement interceptée par le client → la navigation ne se fait pas. <!-- Solution : ne pas catcher l'exception NEXT_REDIRECT, laisser le redirect se propager -->


---

## Suggestions d'améliorations

1. **Changement de LLM dans le prompt ElevenLabs** — actuellement `claude-3-7-sonnet` hardcodé dans le PATCH (`simulation/start/route.ts`). Ce modèle est surdimensionné pour du roleplay conversationnel et **sera en fin de vie prochainement**. Deux options selon les contraintes :

   **Option A — Rester dans l'écosystème Anthropic :**
   → `claude-3-5-haiku` — cohérent avec la stack existante (AWS Bedrock), bon français naturel, moins cher que Sonnet

   **Option B — Changer d'écosystème :**
   → `gpt-4o-mini` — excellent en conversation naturelle et en français, très rapide (latence réduite sur les réponses vocales), coût faible

   | Modèle | Qualité | Vitesse | Coût | Remarques |
   |--------|---------|---------|------|-----------|
   | `claude-3-7-sonnet` ❌ | ⭐⭐⭐⭐⭐ | Lent | Élevé | Actuellement utilisé, surdimensionné, bientôt déprécié |
   | `claude-3-5-haiku` ✅ | ⭐⭐⭐⭐ | Rapide | Moyen | Bon compromis si on reste Anthropic |
   | `gpt-4o-mini` ✅ | ⭐⭐⭐⭐ | Très rapide | Faible | Meilleur choix si pas de contrainte écosystème |
   | `gemini-2.0-flash` | ⭐⭐⭐⭐ | Très rapide | Faible | Alternative Google |

   **Économies estimées : -30K crédits/mois**

2. **Instruction `end_call` manquante dans le prompt** — l'outil `end_call` est déclaré dans le payload ElevenLabs mais le LLM n'a aucune directive pour savoir quand l'utiliser. L'agent continue à parler après un closing accepté jusqu'aux 30 min ou jusqu'à ce que le user raccroche manuellement. Ajouter dans les INSTRUCTIONS du prompt :
   > "Quand la conversation arrive à une conclusion naturelle (accord, refus définitif, au revoir échangé), utilise end_call pour raccrocher."

3. **Supprimer AWS Bedrock — migrer vers API directe** — l'analyse post-simulation (`simulation/end/route.ts`) utilise Claude-3.5-Sonnet via AWS Bedrock, ce qui ajoute un compte tiers inutile dans le projet. Migrer vers l'API Anthropic directe (clé `ANTHROPIC_API_KEY`) ou OpenAI (`OPENAI_API_KEY`) pour simplifier la stack :
   - Moins de dépendances (`@aws-sdk/client-bedrock-runtime` peut être supprimé)
   - Plus de gestion de credentials AWS
   - Cohérent avec le choix du LLM ElevenLabs (point 1 ci-dessus) — si on choisit Claude → API Anthropic directe, si on choisit GPT → API OpenAI

4. **Optimisation des paramètres TTS** — deux paramètres dans le PATCH ElevenLabs influencent la consommation sans impact perceptible sur la qualité vocale :
   - `stability` : actuellement `0.5` → réduire à `0.3` (voix plus naturelle et expressif, moins de calcul)
   - `similarity_boost` : actuellement `0.8` → réduire à `0.6` (imperceptible à l'oreille, moins coûteux)

   Ces changements sont **réversibles à tout moment** — si la qualité vocale ne convient pas, on remet les valeurs d'origine en 5 minutes.

   **Économies estimées : -10K crédits/mois**

5. **Page de bilan / progression globale** — le feedback est déjà consultable par simulation sur `/conversations/[id]` (note, points forts, axes d'amélioration, moments clés, transcription). Il manque une vue agrégée pour que le user suive sa progression dans le temps. Toutes les données sont déjà en base (`feedback` + `conversations`). Cette page pourrait inclure :
   - Score moyen sur toutes les simulations
   - Courbe de progression dans le temps
   - Points forts et axes d'amélioration récurrents
   - Historique des appels avec filtre par type d'appel / persona / difficulté

6. **Dashboard admin** — aucune interface d'administration n'existe actuellement. Créer un espace admin avec :
   - **Gestion des users** — voir tous les comptes, bloquer/débloquer, réinitialiser les crédits
   - **CRUD agents préconfigurés** — créer, modifier, supprimer les 5 personas globaux (`user_id = null`)
   - **CRUD produits préconfigurés** — gérer les produits disponibles pour tous les users
   - **Monitoring consommation ElevenLabs** — voir quels users consomment le plus de crédits
   - **Stats par élève** :
     - Nombre de simulations
     - Score min / max / moyen
     - Durée moyenne des appels
     - Types d'appels les plus pratiqués
     - Progression dans le temps
     - Dernière connexion / activité

7. **Bloquer à une simulation par user à l'instant T** — aucun rate limiting actuellement, un user peut lancer plusieurs appels simultanément et vider les crédits ElevenLabs. Implémenter via une colonne `status` dans `conversations` (plus robuste qu'un booléen dans `users`) :
   - Valeurs : `pending` / `in_progress` / `completed` / `abandoned`
   - Au lancement : vérifier qu'aucune conversation `in_progress` n'existe pour ce user, sinon bloquer avec erreur 409
   - À la fin de l'appel : passer à `completed`
   - Timeout de sécurité : si `in_progress` depuis plus de `max_duration_seconds + 5 min` → passer automatiquement à `abandoned` pour débloquer le user
   - Migration Supabase nécessaire : `ALTER TABLE conversations ADD COLUMN status TEXT DEFAULT 'pending'`
   - Afficher un **minuteur visible** côté user pendant la simulation indiquant le temps restant (basé sur `max_duration_seconds`, défaut 30 min) — le user sait combien de temps il lui reste et peut gérer son appel en conséquence

6. **Optimisation du prompt** *(basse priorité)* — le prompt est entièrement reconstruit à chaque simulation (~3000 caractères) alors que 70% est statique (instructions, exemples). Séparer la partie statique de la partie dynamique pour réduire le travail à chaque appel. Gain estimé : -20K crédits/mois. Refactoring simple mais à tester soigneusement pour ne pas dégrader la qualité des réponses.

9. **Paralléliser les appels au démarrage de simulation** — le frontend fait 3 appels en série : `simulation/start` → `get-signed-url` → `startSession`. Les 2 premiers peuvent être parallélisés avec `Promise.all()` → ~500ms gagnées au démarrage.
   Effort : Facile | Impact : Moyen (UX)

10. **Supprimer route morte `/api/simulation/end`** *(basse priorité)* — le frontend appelle toujours `/api/simulation/[id]/end`. La route `/api/simulation/end` (sans le `[id]`) n'est jamais utilisée → 644 lignes de code mort à supprimer.
   Effort : Très facile | Impact : Aucun (cleanup)

10. **Requêtes Supabase dupliquées dans `simulation/start`** *(basse priorité)* — la conversation est chargée 2 fois : un `SELECT *` puis un `SELECT` avec joins agents/products. La 1ère requête est inutile → fusionner en une seule. Impact : ~50-100ms de latence en moins au démarrage.
   Effort : Très facile | Impact : Faible

---

## Questions en suspens

1. **Durée d'appel par défaut** *(lié au point d'attention #5 et suggestion #2)* — actuellement hardcodée à 30 min. Est-ce que 30 min est la bonne valeur par défaut ? Une valeur plus basse (ex: 15 min) réduirait la consommation de crédits ElevenLabs par défaut. À clarifier avec Shannen selon la durée moyenne réelle des simulations. Le dropdown proposé couvre 15 / 20 / 30 / 45 / 50 / 60 min — **est-ce que ces options sont suffisantes ?**

2. **Colonne `credits` dans `users`** *(lié au point d'attention #4 — crédits ElevenLabs cramés)* — le champ existe en base mais n'est utilisé nulle part dans le code (aucune lecture, décrémentation ou blocage). Quel était le but initial ? Système de quota par user ? Monétisation à l'usage ? À clarifier avec Shannen avant d'implémenter la limite de consommation ElevenLabs.
