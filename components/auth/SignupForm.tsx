/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { signup } from "@/app/signup/actions";

export default function SignupForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string>("");

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (confirmPassword) {
      setPasswordsMatch(value === confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setPasswordsMatch(password === value);
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError("");
    try {
      const result = await signup(formData);
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-6" action={handleSubmit}>
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
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
              minLength={6}
              value={password}
              onChange={handlePasswordChange}
              className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-purple-600 transition-colors duration-200"
            >
              <Icon
                icon={
                  showPassword
                    ? "material-symbols:visibility-off"
                    : "material-symbols:visibility"
                }
                className="h-5 w-5 text-gray-400 hover:text-purple-600"
              />
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Minimum 6 caractères</p>
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
                icon="material-symbols:lock-reset"
                className="h-5 w-5 text-gray-400"
              />
            </div>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={6}
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              className={`block w-full pl-10 pr-12 py-3 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                confirmPassword && !passwordsMatch
                  ? "border-red-300 focus:ring-red-500 focus:border-transparent"
                  : "border-gray-300 focus:ring-purple-500 focus:border-transparent"
              }`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-purple-600 transition-colors duration-200"
            >
              <Icon
                icon={
                  showConfirmPassword
                    ? "material-symbols:visibility-off"
                    : "material-symbols:visibility"
                }
                className="h-5 w-5 text-gray-400 hover:text-purple-600"
              />
            </button>
          </div>
          {confirmPassword && !passwordsMatch && (
            <p className="mt-1 text-xs text-red-600">
              Les mots de passe ne correspondent pas
            </p>
          )}
        </div>
      </div>

      {/* Terms Checkbox */}
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="terms" className="text-gray-700">
            J'accepte les{" "}
            <a
              href="#"
              className="font-medium text-purple-600 hover:text-purple-500"
            >
              conditions d'utilisation
            </a>{" "}
            et la{" "}
            <a
              href="#"
              className="font-medium text-purple-600 hover:text-purple-500"
            >
              politique de confidentialité
            </a>
          </label>
        </div>
      </div>

      {/* Action Button */}
      <div className="space-y-4">
        <button
          type="submit"
          disabled={
            isSubmitting || (confirmPassword.length > 0 && !passwordsMatch)
          }
          className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transform transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isSubmitting ? (
            <>
              <Icon icon="eos-icons:loading" className="w-5 h-5 animate-spin" />
              Création en cours...
            </>
          ) : (
            <>
              <Icon icon="material-symbols:person-add" className="w-5 h-5" />
              Créer mon compte
            </>
          )}
        </button>
      </div>
    </form>
  );
}
