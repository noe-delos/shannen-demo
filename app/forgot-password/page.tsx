"use client";

/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { resetPassword } from "./actions";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { Dancing_Script } from "next/font/google";

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "700"],
});

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await resetPassword(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(true);
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
        <div className="w-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden flex min-h-[700px] border-8 border-white">
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

          {/* Right Side - Forgot Password Form */}
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
                  className={`text-5xl font-bold text-gray-900 mb-3 ${dancingScript.className}`}
                >
                  Mot de passe oubli&eacute; ?
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  Entrez votre adresse email et nous vous enverrons un lien pour
                  r&eacute;initialiser votre mot de passe.
                </p>
              </div>

              {success ? (
                <div className="space-y-6">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Icon
                        icon="material-symbols:check-circle"
                        className="h-5 w-5 text-green-600"
                      />
                      <p className="text-sm text-green-800">
                        Un email de r&eacute;initialisation a &eacute;t&eacute;
                        envoy&eacute; ! V&eacute;rifiez votre bo&icirc;te de
                        r&eacute;ception (et vos spams).
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 text-sm font-medium text-black hover:text-gray-700 transition-colors duration-200"
                    >
                      <Icon
                        icon="material-symbols:arrow-back"
                        className="w-4 h-4"
                      />
                      Retour &agrave; la connexion
                    </Link>
                  </div>
                </div>
              ) : (
                <>
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
                            Envoi en cours...
                          </>
                        ) : (
                          <>
                            <Icon
                              icon="material-symbols:mail"
                              className="w-5 h-5"
                            />
                            Envoyer le lien
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Back to Login */}
                  <div className="text-center">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors duration-200"
                    >
                      <Icon
                        icon="material-symbols:arrow-back"
                        className="w-4 h-4"
                      />
                      Retour &agrave; la connexion
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
