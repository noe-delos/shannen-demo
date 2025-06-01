-- Create users table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  lastname TEXT,
  firstname TEXT,
  email TEXT,
  elevenlabs_agent_api_id TEXT,
  picture_url TEXT,
  credits INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create products table
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  pitch TEXT,
  price DECIMAL,
  marche TEXT,
  principales_objections_attendues TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create agents table (no product_id - agents are generic)
CREATE TABLE public.agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  difficulty TEXT,
  job_title TEXT,
  personnality JSONB DEFAULT '{
    "attitude": "passif",
    "verbalisation": "concis",
    "écoute": "réceptif",
    "présence": "présent",
    "prise_de_décision": "décideur"
  }'::jsonb,
  picture_url TEXT,
  voice_id TEXT,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create feedback table
CREATE TABLE public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  note INTEGER CHECK (note >= 0 AND note <= 100),
  points_forts TEXT[],
  axes_amelioration TEXT[],
  moments_cles TEXT[],
  suggestions TEXT[],
  analyse_complete TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create conversations table (here we link agent + product for specific simulation)
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  transcript JSONB,
  goal TEXT,
  feedback_id UUID REFERENCES public.feedback(id) ON DELETE SET NULL,
  context JSONB DEFAULT '{
    "secteur": "",
    "company": "",
    "historique_relation": "Premier contact"
  }'::jsonb,
  call_type TEXT,
  duration_seconds INTEGER DEFAULT 0,
  elevenlabs_conversation_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add foreign key constraint for feedback_id in conversations
ALTER TABLE public.feedback ADD CONSTRAINT fk_feedback_conversation 
  FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Insert default products
INSERT INTO public.products (name, pitch, price, marche, principales_objections_attendues) VALUES
('CRM Pro', 'Solution CRM complète pour optimiser votre relation client et augmenter vos ventes de 30%', 299.99, 'PME/Startups', 'Prix trop élevé, complexité, temps d''implémentation'),
('Marketing Automation Suite', 'Automatisez vos campagnes marketing et nurturing pour générer 50% de leads qualifiés en plus', 199.99, 'E-commerce/Digital', 'ROI incertain, courbe d''apprentissage, intégration technique'),
('Analytics Dashboard', 'Tableau de bord analytique en temps réel pour prendre des décisions data-driven', 149.99, 'Tous secteurs', 'Données existantes suffisantes, coût récurrent, formation équipe'),
('Sales Enablement Platform', 'Plateforme tout-en-un pour optimiser la performance commerciale de vos équipes', 399.99, 'Grandes entreprises', 'Solution interne existante, budget, changement processus'),
('Customer Success Tool', 'Outil de fidélisation client pour réduire le churn de 40% et augmenter l''upsell', 249.99, 'SaaS/Services', 'Pas de problème de rétention, ressources limitées, mesure ROI');

-- Insert default agents with predefined voice IDs (no product relation)
INSERT INTO public.agents (name, job_title, difficulty, personnality, picture_url, voice_id) VALUES
('CEO Pressé', 'Directeur Général', 'difficile', '{
  "attitude": "impatient",
  "verbalisation": "direct",
  "écoute": "limité",
  "présence": "distrait",
  "prise_de_décision": "décideur"
}'::jsonb, 'https://img.freepik.com/premium-photo/simple-pixar-style-avatar_1106493-71382.jpg', 'BVBq6HVJVdnwOMJOqvy9'),

('Directrice Analytique', 'Directrice Marketing', 'moyen', '{
  "attitude": "analytique",
  "verbalisation": "précis",
  "écoute": "attentif",
  "présence": "présent",
  "prise_de_décision": "réfléchi"
}'::jsonb, 'https://img.freepik.com/premium-photo/simple-pixar-style-avatar_1106493-71382.jpg', 'F1toM6PcP54s45kOOAyV'),

('DSI Prudent', 'Directeur Système Information', 'difficile', '{
  "attitude": "méfiant",
  "verbalisation": "technique",
  "écoute": "sélectif",
  "présence": "présent",
  "prise_de_décision": "prudent"
}'::jsonb, 'https://img.freepik.com/premium-photo/simple-pixar-style-avatar_1106493-71382.jpg', 'xlVRtVJbKuO2nwbbopa2'),

('Manager Enthousiaste', 'Responsable Commercial', 'facile', '{
  "attitude": "ouvert",
  "verbalisation": "expressif",
  "écoute": "réceptif",
  "présence": "engagé",
  "prise_de_décision": "rapide"
}'::jsonb, 'https://img.freepik.com/premium-photo/simple-pixar-style-avatar_1106493-71382.jpg', '3Kfr7NbSVkpOWCWA4Zgu'),

('Startup Founder', 'Fondateur/CEO', 'moyen', '{
  "attitude": "curieux",
  "verbalisation": "dynamique",
  "écoute": "actif",
  "présence": "très présent",
  "prise_de_décision": "agile"
}'::jsonb, 'https://img.freepik.com/premium-photo/simple-pixar-style-avatar_1106493-71382.jpg', 'T9VNN91AsQKnhGF6hTi8');

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON public.feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view agents" ON public.agents FOR SELECT TO authenticated USING (true);

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

-- Create updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers
CREATE TRIGGER handle_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_feedback_updated_at BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at(); 