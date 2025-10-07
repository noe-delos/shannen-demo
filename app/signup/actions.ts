"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createClient();

  // Extract form data
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const terms = formData.get("terms") as string;

  // Basic validation
  if (!email || !password || !confirmPassword) {
    return { error: "Tous les champs sont obligatoires" };
  }

  if (password !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas" };
  }

  if (password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères" };
  }

  if (!terms) {
    return { error: "Vous devez accepter les conditions d'utilisation" };
  }

  // Sign up the user without email confirmation
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: undefined, // No email confirmation needed
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If signup was successful, sign in the user immediately
  if (data.user) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return {
        error:
          "Compte créé mais connexion automatique échouée. Veuillez vous connecter manuellement.",
      };
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}
