-- ==========================================
-- Migration — users.is_admin (rôle administrateur)
-- ==========================================
-- À appliquer une seule fois via le SQL Editor Supabase.
-- 100% additif et idempotent.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Promouvoir le compte projets@neocell.ai en admin par défaut.
UPDATE public.users SET is_admin = true WHERE email = 'projets@neocell.ai';
