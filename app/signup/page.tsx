/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import SignupForm from "@/components/auth/SignupForm";
import { Dancing_Script } from "next/font/google";

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "700"],
});

export default function SignupPage() {
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

          {/* Right Side - Signup Form */}
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="w-full max-w-md space-y-6">
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

              {/* Form */}
              <SignupForm />

              {/* Login Link */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Vous avez déjà un compte ?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-black hover:text-gray-700 transition-colors duration-200 underline"
                  >
                    Se connecter
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
