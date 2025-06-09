/* eslint-disable react/no-unescaped-entities */

import Link from "next/link";
import { Icon } from "@iconify/react";

interface ErrorPageProps {
  searchParams: Promise<{
    message?: string;
  }>;
}

export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams;
  const errorMessage =
    params.message ||
    "Une erreur s'est produite lors de l'authentification. Veuillez réessayer.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <Icon
              icon="material-symbols:error"
              className="h-8 w-8 text-red-600"
            />
          </div>

          <h2 className="mt-6 text-3xl font-extrabold text-red-600">
            Erreur d'authentification
          </h2>

          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              {decodeURIComponent(errorMessage)}
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
            >
              <Icon icon="material-symbols:login" className="w-4 h-4" />
              Retour à la connexion
            </Link>

            <div className="text-center">
              <Link
                href="/signup"
                className="text-blue-600 hover:text-blue-500 font-medium text-sm"
              >
                Créer un nouveau compte
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
