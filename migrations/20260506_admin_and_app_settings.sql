-- ==========================================
-- Migration combinée — is_admin sur users + app_settings (persona/behavior)
-- ==========================================
-- À appliquer une seule fois via le SQL Editor Supabase.
-- 100% additif et idempotent (CREATE/ALTER IF NOT EXISTS, DROP/CREATE policies).

-- ────────── users.is_admin ──────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Promouvoir le compte projets@neocell.ai en admin par défaut.
UPDATE public.users SET is_admin = true WHERE email = 'projets@neocell.ai';

-- ────────── app_settings (singleton) ──────────
CREATE TABLE IF NOT EXISTS public.app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  persona_instructions text NULL,
  behavior_instructions text NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS persona_instructions text NULL;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS behavior_instructions text NULL;

DROP TRIGGER IF EXISTS handle_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER handle_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.app_settings (id, persona_instructions, behavior_instructions)
VALUES (1, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les authentifiés peuvent lire (le prompt est ensuite injecté côté serveur).
DROP POLICY IF EXISTS "Authenticated users can read app_settings" ON public.app_settings;
CREATE POLICY "Authenticated users can read app_settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Écriture : admins uniquement.
DROP POLICY IF EXISTS "Authenticated users can update app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can update app_settings" ON public.app_settings;
CREATE POLICY "Admins can update app_settings"
  ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin));
