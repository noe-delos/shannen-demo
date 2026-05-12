import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type AdminUser = {
  id: string;
  email: string | null;
  is_admin: true;
};

export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createClient();
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth?.user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin, email")
    .eq("id", auth.user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  return { id: auth.user.id, email: profile.email ?? null, is_admin: true };
}

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return false;

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", auth.user.id)
    .single();

  return Boolean(profile?.is_admin);
}
