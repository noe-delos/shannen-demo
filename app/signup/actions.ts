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
    redirect("/error?message=Tous les champs sont obligatoires");
  }

  if (password !== confirmPassword) {
    redirect("/error?message=Les mots de passe ne correspondent pas");
  }

  if (password.length < 6) {
    redirect(
      "/error?message=Le mot de passe doit contenir au moins 6 caractères"
    );
  }

  if (!terms) {
    redirect("/error?message=Vous devez accepter les conditions d'utilisation");
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
    redirect(`/error?message=${encodeURIComponent(error.message)}`);
  }

  // If signup was successful, sign in the user immediately
  if (data.user) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      redirect(
        `/error?message=${encodeURIComponent(
          "Compte créé mais connexion automatique échouée. Veuillez vous connecter manuellement."
        )}`
      );
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}
