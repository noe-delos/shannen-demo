"use client";

/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { Dancing_Script } from "next/font/google";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "700"],
});

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsReady(true);
        }
      }
    );

    // Also check if there's already a session (user clicked the link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsReady(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const passwordsMatch = confirmPassword === "" || password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caract\u00e8res");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
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

          {/* Right Side - Reset Password Form */}
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
                  Nouveau mot de passe
                </h2>
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
                        Votre mot de passe a &eacute;t&eacute; mis &agrave; jour
                        avec succ&egrave;s ! Redirection vers la connexion...
                      </p>
                    </div>
                  </div>
                </div>
              ) : !isReady ? (
                <div className="space-y-6">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Icon
                        icon="eos-icons:loading"
                        className="h-5 w-5 text-yellow-600 animate-spin"
                      />
                      <p className="text-sm text-yellow-800">
                        V&eacute;rification du lien de r&eacute;initialisation...
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-4">
                      Si le chargement prend trop longtemps, le lien a peut-&ecirc;tre
                      expir&eacute;.
                    </p>
                    <Link
                      href="/forgot-password"
                      className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors duration-200"
                    >
                      <Icon
                        icon="material-symbols:arrow-back"
                        className="w-4 h-4"
                      />
                      Demander un nouveau lien
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
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="password"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Nouveau mot de passe
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
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-10 pr-12 py-3 bg-blue-50 rounded-lg shadow-soft placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                            placeholder="Minimum 6 caract\u00e8res"
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

                      <div>
                        <label
                          htmlFor="confirmPassword"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Confirmer le mot de passe
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Icon
                              icon="material-symbols:lock"
                              className={`h-5 w-5 ${
                                !passwordsMatch
                                  ? "text-red-400"
                                  : "text-gray-400"
                              }`}
                            />
                          </div>
                          <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`block w-full pl-10 pr-12 py-3 rounded-lg shadow-soft placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                              !passwordsMatch
                                ? "bg-red-50 focus:ring-red-500 border border-red-300"
                                : "bg-blue-50 focus:ring-blue-500"
                            }`}
                            placeholder="Confirmez votre mot de passe"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-blue-600 transition-colors duration-200 cursor-pointer"
                          >
                            <Icon
                              icon={
                                showConfirmPassword
                                  ? "material-symbols:visibility-off"
                                  : "material-symbols:visibility"
                              }
                              className="h-5 w-5 text-gray-400 hover:text-blue-600"
                            />
                          </button>
                        </div>
                        {!passwordsMatch && (
                          <p className="mt-1 text-xs text-red-600">
                            Les mots de passe ne correspondent pas
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <button
                        type="submit"
                        disabled={
                          isSubmitting ||
                          !passwordsMatch ||
                          password.length < 6
                        }
                        className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <Icon
                              icon="eos-icons:loading"
                              className="w-5 h-5 animate-spin"
                            />
                            Mise &agrave; jour...
                          </>
                        ) : (
                          <>
                            <Icon
                              icon="material-symbols:lock-reset"
                              className="w-5 h-5"
                            />
                            R&eacute;initialiser le mot de passe
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
