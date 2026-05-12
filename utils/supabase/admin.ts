// Admin-only Supabase client — bypasses RLS via service_role key.
// NEVER import from a client component or any non-/admin route handler.
// Used only by server components / route handlers under app/(dashboard)/admin/*.
//
// V0 access control: any authenticated user reaching /admin is treated as admin.
// V1 TODO: add a real role check (e.g. users.role === 'admin' column or env allowlist).

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Admin Supabase client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
