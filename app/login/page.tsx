"use client";

/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { login } from "./actions";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { Dancing_Script } from "next/font/google";

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "700"],
});

export default function LoginPage() {
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    // Block access to the specific platform account
    if (email?.toLowerCase() === "platform@sforsales.academy") {
      setError(
        "L'accès à ce compte a été fermé pour des raisons de confidentialité des données. La création d'un nouveau compte est gratuite et aucune vérification par email n'est requise."
      );
      setIsSubmitting(false);
      return;
    }

    // If email is not blocked, proceed with login
    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url(/background.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Container with padding */}
      <div className="relative z-10 w-full min-h-screen p-8 flex items-center justify-center">
        {/* Main White Container */}
        <div className="w-full max-w-7xl  bg-white rounded-3xl shadow-2xl overflow-hidden flex min-h-[700px] border-8 border-white">
          {/* Left Side - Hero Section with blur */}
          <div
            className="hidden lg:flex lg:w-[45%] relative overflow-hidden rounded-3xl border-2 border-white"
            style={{
              backgroundImage: "url(/background.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            {/* Blurred overlay */}
            <div className="absolute inset-0 backdrop-blur-lg bg-white/10 rounded-3xl" />

            <div className="relative z-10 flex flex-col justify-end p-12 pl-5 text-white rounded-xl">
              <h1
                className={`text-[9rem] opacity-80 font-bold leading-[0.95] ${dancingScript.className}`}
              >
                <span className="block">Hello</span>
                <span className="block ml-16">Michel.</span>
              </h1>
              <p className="text-zinc-200 text-md max-w-xs pt-10">
                Simulez vos appels commerciaux sans cramer vos leads !
              </p>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="w-full max-w-md space-y-18">
              {/* Logo at top */}
              <div className="flex justify-center">
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRb1aw2CCOIDAqxHBxh2BkdXcw9GKnuPock0w&s"
                  alt="Hello Michel Logo"
                  className="h-7 w-auto"
                />
              </div>

              {/* Header */}
              <div className="text-center">
                <h2
                  className={`text-6xl font-bold text-gray-900 mb-3 ${dancingScript.className}`}
                >
                  Bienvenue !
                </h2>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Icon
                      icon="material-symbols:error"
                      className="h-5 w-5 text-red-600"
                    />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}

              {/* Form */}
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Adresse email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon
                          icon="material-symbols:mail"
                          className="h-5 w-5 text-gray-400"
                        />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="block w-full pl-10 pr-3 py-3 bg-blue-50 rounded-lg shadow-soft placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                        placeholder="votre@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Mot de passe
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon
                          icon="material-symbols:lock"
                          className="h-5 w-5 text-gray-400"
                        />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        className="block w-full pl-10 pr-12 py-3 bg-blue-50 rounded-lg shadow-soft placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-blue-600 transition-colors duration-200 cursor-pointer"
                      >
                        <Icon
                          icon={
                            showPassword
                              ? "material-symbols:visibility-off"
                              : "material-symbols:visibility"
                          }
                          className="h-5 w-5 text-gray-400 hover:text-blue-600"
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center">
                  <input
                    id="remember"
                    name="remember"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <label
                    htmlFor="remember"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Se souvenir de moi
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Icon
                          icon="eos-icons:loading"
                          className="w-5 h-5 animate-spin"
                        />
                        Connexion en cours...
                      </>
                    ) : (
                      <>
                        <Icon
                          icon="material-symbols:login"
                          className="w-5 h-5"
                        />
                        Se connecter
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Signup Link */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Vous n'avez pas encore de compte ?{" "}
                  <Link
                    href="/signup"
                    className="font-medium text-black hover:text-gray-700 transition-colors duration-200 underline"
                  >
                    Créer un compte
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>{" "}
    </div>
  );
}
