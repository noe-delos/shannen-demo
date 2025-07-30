"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SimulationPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to simulation configuration since no conversation ID is provided
    router.replace("/simulation/configure");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-muted-foreground">Redirection vers la configuration...</p>
      </div>
    </div>
  );
}