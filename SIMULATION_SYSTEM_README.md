# 📞 Shannen - Simulation System Documentation

## 🏗️ System Architecture Overview

Shannen is a sales training platform that creates realistic phone conversations between users and AI-powered prospects. The system combines Next.js frontend components with ElevenLabs voice AI and Supabase database to deliver immersive sales simulations.

## 🔄 Complete Simulation Flow

### 1. **Simulation Configuration** (`SimulationStepper`)
**Location:** `components/simulation/simulation-stepper.tsx`

The simulation stepper guides users through a 4-step configuration process:

#### Step 1: Agent Selection
- Loads agents from database (user's custom agents + default agents)
- Query: `SELECT * FROM agents WHERE user_id = ? OR user_id IS NULL`
- Each agent has: personality traits, difficulty level, job title, voice characteristics

#### Step 2: Product Selection  
- Loads products from database (user's custom products + default products)
- Query: `SELECT * FROM products WHERE user_id = ? OR user_id IS NULL`
- Each product has: name, pitch, price, market, expected objections

#### Step 3: Call Type Selection
- 5 predefined call types:
  - 🔍 **Cold Call**: Goal to book meeting
  - 📅 **Discovery Meeting**: Qualify needs and budget
  - 💻 **Product Demo**: Convince with personalized proposal
  - ✅ **Closing Call**: Sign the contract
  - 🔄 **Follow-up Call**: Follow up after quote/proposal

#### Step 4: Context & Goal Definition
- **Context fields**:
  - `secteur`: Business sector (e.g., "E-commerce", "SaaS", "Finance")
  - `company`: Company name
  - `historique_relation`: Relationship history ("Premier contact", "2ème appel", "Relance post-devis")
- **Goal**: User's personal objective for the call

#### Configuration Storage
- Saves configuration to localStorage: `agent_config_${agentId}`
- Creates conversation record in database when starting simulation

### 2. **Conversation Creation**
**Location:** `simulation-stepper.tsx` lines 234-257

```javascript
const { data: conversation, error } = await supabase
  .from("conversations")
  .insert({
    user_id: user.id,
    agent_id: config.agent!.id,
    product_id: config.product!.id,
    goal: config.goal,
    context: config.context,
    call_type: config.callType,
  })
  .select()
  .single();
```

**Database Record Created:**
- Links user, agent, and product
- Stores call context and goal
- Initial status: no `elevenlabs_conversation_id` yet

### 3. **Simulation Start Process**

#### Frontend Navigation
- Redirects to: `/simulation/${conversation.id}`
- Loads `SimulationConversation` component

#### Backend Agent Configuration
**API Endpoint:** `POST /api/simulation/start`

**Key Operations:**

1. **User Authentication & Validation**
   ```javascript
   const { data: { user } } = await supabase.auth.getUser();
   ```

2. **ElevenLabs Agent Management**
   - Checks if user has `elevenlabs_agent_api_id` in users table
   - If not exists: Creates new ElevenLabs agent and stores ID
   - If exists: Uses existing agent ID

3. **Agent Personalization**
   - Builds detailed prompt based on:
     - Agent personality (`personnality` JSONB field)
     - Agent difficulty level
     - Call type and context
     - Product information
     - Conversation goal
   
4. **Voice Selection Logic**
   ```javascript
   const getVoiceId = (agent) => {
     if (agent.voice_id) return agent.voice_id; // Custom voice
     
     // Auto-select based on characteristics
     if (isSenior) return voices.male_mature_deep;
     if (isJunior) return voices.male_young_energetic;
     return voices.male_young_dynamic;
   };
   ```

5. **ElevenLabs Agent Update**
   - Updates agent configuration via PATCH API
   - Sets conversation-specific prompt and voice
   - Uses Claude 3.7 Sonnet as LLM backend

### 4. **Real-time Conversation** (`SimulationConversation`)
**Location:** `components/simulation/simulation-conversation.tsx`

#### ElevenLabs Integration
Uses `@elevenlabs/react` hook:

```javascript
const conversation = useConversation({
  onConnect: () => setConversationStatus("connected"),
  onDisconnect: () => setConversationStatus("ended"),
  onMessage: (message) => setMessages(prev => [...prev, message]),
  onError: (error) => setUrlFetchFailed(true)
});
```

#### Connection Methods
1. **Signed URL Method** (Primary)
   - Calls `/api/get-signed-url` 
   - Gets temporary authenticated URL from ElevenLabs
   - More secure, requires API key

2. **Direct Agent ID Method** (Fallback)
   - Uses public agent ID directly
   - Less secure but works without API authentication

#### UI Components
- **iPhone-style Interface**: Realistic phone simulation UI
- **Post-it Context Card**: Shows simulation briefing
- **Real-time Features**:
  - Speaking indicator (pulsing animation)
  - Timer display
  - Mute/unmute controls
  - Visual feedback for connection status

### 5. **Conversation Ending & Analysis**
**API Endpoint:** `POST /api/simulation/[id]/end`

#### Data Collection
1. **Transcript Processing**
   - Receives messages from frontend
   - Fallback: Fetches from ElevenLabs API if needed
   - Stores in `conversations.transcript` (JSONB)

2. **Duration Tracking**
   - Frontend timer or ElevenLabs duration
   - Stores in `conversations.duration_seconds`

#### AI-Powered Feedback Generation
**Service:** AWS Bedrock with Claude 3.7 Sonnet

**Analysis Prompt Structure:**
```
CONTEXTE:
- Agent: ${agent.name} (${agent.job_title})
- Produit: ${product.name}
- Type d'appel: ${call_type}
- Objectif: ${goal}
- Durée: ${duration} secondes

TRANSCRIPT:
1. **Commercial**: [message]
2. **Client**: [message]
...

INSTRUCTIONS:
Fournissez un feedback structuré avec:
1. Une note sur 100
2. 3-5 points forts
3. 3-5 axes d'amélioration
4. 2-3 moments clés
5. 3-5 suggestions pratiques
6. Une analyse complète (2-3 paragraphes)
```

#### Feedback Storage
Creates record in `feedback` table:
```sql
INSERT INTO feedback (
  conversation_id, user_id, note,
  points_forts, axes_amelioration, moments_cles,
  suggestions, analyse_complete
)
```

## 🗄️ Database Schema Deep Dive

### Core Tables

#### `users` 
```sql
- id: UUID (links to auth.users)
- elevenlabs_agent_api_id: TEXT -- 🔑 KEY FIELD
- firstname, lastname, email: TEXT
- credits: INTEGER DEFAULT 10
- picture_url: TEXT
```

**Critical Field: `elevenlabs_agent_api_id`**
- Stores the user's persistent ElevenLabs agent ID
- Created once per user, reused for all simulations
- Allows agent personalization per conversation
- NULL initially, populated on first simulation

#### `agents` (Prospect Personas)
```sql
- id: UUID PRIMARY KEY
- name, firstname, lastname: TEXT
- job_title: TEXT
- difficulty: TEXT -- "facile", "moyen", "difficile" 
- personnality: JSONB -- Personality traits
- voice_id: TEXT -- ElevenLabs voice ID
- user_id: UUID -- NULL for default agents
```

**Personality Structure:**
```json
{
  "écoute": "réceptif|sélectif|limité",
  "attitude": "passif|analytique|impatient|méfiant|ouvert|curieux",
  "présence": "présent|distrait|engagé|très présent",
  "verbalisation": "concis|précis|direct|technique|expressif|dynamique",
  "prise_de_décision": "décideur|réfléchi|prudent|rapide|agile"
}
```

#### `products` 
```sql
- id: UUID PRIMARY KEY  
- name: TEXT NOT NULL
- pitch: TEXT -- Value proposition
- price: NUMERIC
- marche: TEXT -- Target market
- principales_objections_attendues: TEXT
- user_id: UUID -- NULL for default products
```

#### `conversations` (Simulation Sessions)
```sql
- id: UUID PRIMARY KEY
- user_id: UUID NOT NULL -- Who ran the simulation
- agent_id: UUID -- Which prospect persona
- product_id: UUID -- Which product was pitched
- goal: TEXT -- User's objective
- call_type: TEXT -- Type of sales call
- context: JSONB -- Call context
- transcript: JSONB -- Conversation messages
- duration_seconds: INTEGER
- elevenlabs_conversation_id: TEXT -- ElevenLabs agent ID used
- feedback_id: UUID -- Links to feedback
```

#### `feedback` (AI Analysis Results)
```sql
- id: UUID PRIMARY KEY
- conversation_id: UUID
- user_id: UUID  
- note: INTEGER CHECK (0-100) -- Overall score
- points_forts: TEXT[] -- Strengths identified
- axes_amelioration: TEXT[] -- Areas for improvement
- moments_cles: TEXT[] -- Key moments
- suggestions: TEXT[] -- Practical recommendations
- analyse_complete: TEXT -- Detailed analysis
```

## 🔑 ElevenLabs Agent Management System

### User-Agent Relationship

Each user gets **one persistent ElevenLabs agent** stored in `users.elevenlabs_agent_api_id`:

1. **First Simulation**: 
   - User has no `elevenlabs_agent_api_id`
   - System creates new ElevenLabs agent
   - Stores agent ID in user profile
   - Configures agent for current simulation

2. **Subsequent Simulations**:
   - User already has `elevenlabs_agent_api_id` 
   - System reuses existing agent
   - Reconfigures agent for new simulation context

### Agent Configuration Process

**Dynamic Prompt Generation:**
```javascript
const agentContext = `
Tu es ${agent.name}, ${agent.job_title}. 
Personnalité: ${JSON.stringify(agent.personnality)}
Difficulté: ${agent.difficulty}

CONTEXTE DE L'APPEL:
- Type: ${callTypeDescriptions[call_type]}
- Secteur: ${context.secteur}
- Entreprise: ${context.company}
- Historique: ${context.historique_relation}

INSTRUCTIONS:
1. TU ES PASSIF - L'autre personne t'appelle
2. NE PRENDS JAMAIS L'INITIATIVE  
3. SOIS NATURELLEMENT DISTANT AU DÉBUT
4. Adapte selon difficulté (${difficulty})
5. PARLE COMME UN VRAI HUMAIN
...
`;
```

**Voice Selection Logic:**
- Uses `agent.voice_id` if specified
- Auto-selects based on job title and difficulty:
  - Senior roles → Deep, mature voice
  - Junior roles → Young, energetic voice  
  - Default → Dynamic voice

### ElevenLabs API Integration

**Agent Creation:**
```javascript
POST https://api.elevenlabs.io/v1/convai/agents/create
{
  "conversation_config": {
    "agent": {
      "prompt": { "prompt": agentContext, "llm": "claude-3-7-sonnet" },
      "language": "fr"
    },
    "tts": {
      "voice_id": selectedVoiceId,
      "model_id": "eleven_flash_v2_5"
    }
  },
  "name": "Agent_${userId}"
}
```

**Agent Update (Per Simulation):**
```javascript
PATCH https://api.elevenlabs.io/v1/convai/agents/${agentId}
{
  "conversation_config": {
    "agent": { "prompt": { "prompt": newContext } },
    "tts": { "voice_id": contextualVoiceId }
  }
}
```

## 🚀 Key API Endpoints

### `POST /api/simulation/start`
- **Purpose**: Configure ElevenLabs agent for specific simulation
- **Input**: `{ conversation_id }`
- **Process**:
  1. Authenticate user
  2. Get/create user's ElevenLabs agent ID
  3. Load conversation details (agent, product, context)
  4. Generate contextual prompt
  5. Update ElevenLabs agent configuration
  6. Store agent ID in conversation record

### `POST /api/get-signed-url`  
- **Purpose**: Get authenticated URL for ElevenLabs connection
- **Input**: `{ conversation_id }`
- **Output**: `{ signedUrl, agentId }` or `{ directUse: true, agentId }`

### `POST /api/simulation/[id]/end`
- **Purpose**: Process conversation end and generate feedback
- **Input**: `{ messages[], duration }`
- **Process**:
  1. Save transcript and duration
  2. Generate AI feedback via AWS Bedrock
  3. Create feedback record
  4. Link feedback to conversation

## 🎯 User Experience Flow

1. **Setup** → User configures simulation (agent, product, call type, context)
2. **Start** → System creates conversation record and configures AI agent  
3. **Connect** → Real-time voice conversation via ElevenLabs
4. **Interact** → User practices sales techniques with AI prospect
5. **End** → System captures transcript and generates AI feedback
6. **Review** → User gets detailed performance analysis and improvement suggestions

## 🔒 Security & Authentication

- **Supabase RLS**: Row-level security ensures users only access their data
- **API Keys**: ElevenLabs and AWS credentials stored as environment variables
- **User Isolation**: Each user gets dedicated ElevenLabs agent ID
- **Data Privacy**: Conversations and feedback are user-scoped

## ⚡ Performance Optimizations

- **Agent Reuse**: One ElevenLabs agent per user (not per conversation)
- **Caching**: localStorage for simulation configurations
- **Parallel Processing**: Batch API calls where possible
- **Fallback Mechanisms**: Multiple connection methods for reliability

## 🎨 UI/UX Features

- **iPhone-style Interface**: Familiar phone conversation experience
- **Real-time Feedback**: Visual indicators for speaking, connection status
- **Post-it Briefing**: Context card with simulation details
- **Smooth Animations**: Framer Motion for polished interactions
- **Responsive Design**: Works on desktop and mobile devices

This system provides a comprehensive sales training platform that combines realistic AI conversations with detailed performance analytics, helping users improve their sales skills through practice and feedback.