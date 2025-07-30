-- ==========================================
-- SHANNEN - COMPLETE DATABASE SCHEMA
-- ==========================================

-- Create updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TABLES
-- ==========================================

-- Create users table (extends auth.users)
create table public.users (
  id uuid not null,
  lastname text null,
  firstname text null,
  email text null,
  elevenlabs_agent_api_id text null,
  picture_url text null,
  credits integer null default 10,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint users_pkey primary key (id),
  constraint users_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- Create products table
create table public.products (
  id uuid not null default gen_random_uuid (),
  name text not null,
  pitch text null,
  price numeric null,
  marche text null,
  principales_objections_attendues text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  user_id uuid null,
  constraint products_pkey primary key (id),
  constraint products_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- Create agents table
create table public.agents (
  id uuid not null default gen_random_uuid (),
  difficulty text null,
  job_title text null,
  personnality jsonb null default '{"écoute": "réceptif", "attitude": "passif", "présence": "présent", "verbalisation": "concis", "prise_de_décision": "décideur"}'::jsonb,
  picture_url text null,
  voice_id text null,
  name text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  firstname text null,
  lastname text null,
  user_id uuid null,
  constraint agents_pkey primary key (id),
  constraint agents_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- Create feedback table
create table public.feedback (
  id uuid not null default gen_random_uuid (),
  conversation_id uuid null,
  user_id uuid null,
  note integer null,
  points_forts text[] null,
  axes_amelioration text[] null,
  moments_cles text[] null,
  suggestions text[] null,
  analyse_complete text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint feedback_pkey primary key (id),
  constraint feedback_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint feedback_note_check check (
    (
      (note >= 0)
      and (note <= 100)
    )
  )
) TABLESPACE pg_default;

-- Create conversations table
create table public.conversations (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  agent_id uuid null,
  transcript jsonb null,
  goal text null,
  feedback_id uuid null,
  context jsonb null default '{"company": "", "secteur": "", "historique_relation": "Premier contact"}'::jsonb,
  call_type text null,
  duration_seconds integer null default 0,
  elevenlabs_conversation_id text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  product_id uuid null,
  constraint conversations_pkey primary key (id),
  constraint conversations_agent_id_fkey foreign KEY (agent_id) references agents (id) on delete CASCADE,
  constraint conversations_feedback_id_fkey foreign KEY (feedback_id) references feedback (id) on delete set null,
  constraint conversations_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE,
  constraint conversations_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- Add foreign key constraint for feedback_id in conversations (circular reference)
ALTER TABLE public.feedback ADD CONSTRAINT fk_feedback_conversation 
  FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- ==========================================
-- INDEXES
-- ==========================================

create index IF not exists idx_agents_user_id on public.agents using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_products_user_id on public.products using btree (user_id) TABLESPACE pg_default;

-- ==========================================
-- TRIGGERS
-- ==========================================

create trigger handle_users_updated_at BEFORE
update on users for EACH row
execute FUNCTION handle_updated_at ();

create trigger handle_products_updated_at BEFORE
update on products for EACH row
execute FUNCTION handle_updated_at ();

create trigger handle_agents_updated_at BEFORE
update on agents for EACH row
execute FUNCTION handle_updated_at ();

create trigger handle_conversations_updated_at BEFORE
update on conversations for EACH row
execute FUNCTION handle_updated_at ();

create trigger handle_feedback_updated_at BEFORE
update on feedback for EACH row
execute FUNCTION handle_updated_at ();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Products policies
CREATE POLICY "Users can view their own products and default products" ON products
FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own products" ON products
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON products
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON products
FOR DELETE USING (auth.uid() = user_id);

-- Agents policies
CREATE POLICY "Users can view their own agents and default agents" ON agents
FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own agents" ON agents
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents" ON agents
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents" ON agents
FOR DELETE USING (auth.uid() = user_id);

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE USING (auth.uid() = user_id);

-- Feedback policies
CREATE POLICY "Users can view own feedback" ON public.feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feedback" ON public.feedback FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own feedback" ON public.feedback FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- STORAGE SETUP
-- ==========================================

-- Create the storage bucket for agent images
INSERT INTO storage.buckets (id, name, public)
VALUES ('agents', 'agents', true);

-- Storage policies
CREATE POLICY "Allow authenticated users to upload agent images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'agents' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow everyone to view agent images" ON storage.objects
FOR SELECT USING (bucket_id = 'agents');

CREATE POLICY "Allow authenticated users to update agent images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'agents' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to delete agent images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'agents' AND 
  auth.role() = 'authenticated'
);

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, firstname, lastname)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'firstname', new.raw_user_meta_data->>'lastname');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- DEFAULT DATA
-- ==========================================

-- Insert default products
INSERT INTO public.products (name, pitch, price, marche, principales_objections_attendues) VALUES
('CRM Pro', 'Solution CRM complète pour optimiser votre relation client et augmenter vos ventes de 30%', 299.99, 'PME/Startups', 'Prix trop élevé, complexité, temps d''implémentation'),
('Marketing Automation Suite', 'Automatisez vos campagnes marketing et nurturing pour générer 50% de leads qualifiés en plus', 199.99, 'E-commerce/Digital', 'ROI incertain, courbe d''apprentissage, intégration technique'),
('Analytics Dashboard', 'Tableau de bord analytique en temps réel pour prendre des décisions data-driven', 149.99, 'Tous secteurs', 'Données existantes suffisantes, coût récurrent, formation équipe'),
('Sales Enablement Platform', 'Plateforme tout-en-un pour optimiser la performance commerciale de vos équipes', 399.99, 'Grandes entreprises', 'Solution interne existante, budget, changement processus'),
('Customer Success Tool', 'Outil de fidélisation client pour réduire le churn de 40% et augmenter l''upsell', 249.99, 'SaaS/Services', 'Pas de problème de rétention, ressources limitées, mesure ROI');

-- Insert default agents
INSERT INTO public.agents (name, firstname, lastname, job_title, difficulty, personnality, picture_url, voice_id) VALUES
('CEO Pressé', 'Marc', 'Dubois', 'Directeur Général', 'difficile', '{
  "attitude": "impatient",
  "verbalisation": "direct",
  "écoute": "limité",
  "présence": "distrait",
  "prise_de_décision": "décideur"
}'::jsonb, 'https://img.freepik.com/premium-photo/simple-pixar-style-avatar_1106493-71382.jpg', 'BVBq6HVJVdnwOMJOqvy9'),

('Directrice Analytique', 'Sophie', 'Martin', 'Directrice Marketing', 'moyen', '{
  "attitude": "analytique",
  "verbalisation": "précis",
  "écoute": "attentif",
  "présence": "présent",
  "prise_de_décision": "réfléchi"
}'::jsonb, 'https://img.freepik.com/premium-photo/simple-pixar-style-avatar_1106493-71382.jpg', 'F1toM6PcP54s45kOOAyV'),

('DSI Prudent', 'Pierre', 'Moreau', 'Directeur Système Information', 'difficile', '{
  "attitude": "méfiant",
  "verbalisation": "technique",
  "écoute": "sélectif",
  "présence": "présent",
  "prise_de_décision": "prudent"
}'::jsonb, 'https://img.freepik.com/premium-photo/simple-pixar-style-avatar_1106493-71382.jpg', 'xlVRtVJbKuO2nwbbopa2'),

('Manager Enthousiaste', 'Julie', 'Leblanc', 'Responsable Commercial', 'facile', '{
  "attitude": "ouvert",
  "verbalisation": "expressif",
  "écoute": "réceptif",
  "présence": "engagé",
  "prise_de_décision": "rapide"
}'::jsonb, 'https://img.freepik.com/premium-photo/simple-pixar-style-avatar_1106493-71382.jpg', '3Kfr7NbSVkpOWCWA4Zgu'),

('Startup Founder', 'Thomas', 'Rousseau', 'Fondateur/CEO', 'moyen', '{
  "attitude": "curieux",
  "verbalisation": "dynamique",
  "écoute": "actif",
  "présence": "très présent",
  "prise_de_décision": "agile"
}'::jsonb, 'https://img.freepik.com/premium-photo/simple-pixar-style-avatar_1106493-71382.jpg', 'T9VNN91AsQKnhGF6hTi8');