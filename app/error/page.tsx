/* eslint-disable react/no-unescaped-entities */

import Link from "next/link";

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-red-600">
            Erreur d'authentification
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Une erreur s'est produite lors de la connexion. Veuillez réessayer.
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
