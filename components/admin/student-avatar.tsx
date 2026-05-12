/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Mix of solid colors and gradients — solids dominate for fast visual ID at
// small sizes, gradients for variety. Each palette is a complete bg-* class.
const PALETTES: string[] = [
  // Solid brand colors
  "bg-[#ffbb75]",
  "bg-[#fa71ab]",
  "bg-[#bc30c4]",
  "bg-[#7403ce]",
  "bg-[#3b026d]",
  "bg-[#ff8c42]",
  // Solid complementary tones (still warm, identifiable)
  "bg-[#e74c8e]",
  "bg-[#a02a8c]",
  "bg-[#5a0fa6]",
  "bg-[#d4a373]",
  // Gradients for variety
  "bg-gradient-to-br from-[#ffbb75] to-[#fa71ab]",
  "bg-gradient-to-br from-[#ff8c42] to-[#bc30c4]",
  "bg-gradient-to-tr from-[#fa71ab] to-[#7403ce]",
  "bg-gradient-to-bl from-[#bc30c4] to-[#3b026d]",
  "bg-gradient-to-br from-[#ffbb75] via-[#fa71ab] to-[#7403ce]",
  "bg-gradient-to-tr from-[#3b026d] to-[#fa71ab]",
];

function hashOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0x7fffffff;
  return h;
}

export function gradientFor(seed: string): string {
  return PALETTES[hashOf(seed) % PALETTES.length];
}

export function getInitials(opts: {
  firstname?: string | null;
  lastname?: string | null;
  email?: string | null;
}): string {
  const { firstname, lastname, email } = opts;
  const a = firstname?.[0] ?? "";
  const b = lastname?.[0] ?? "";
  const ini = (a + b).toUpperCase();
  if (ini) return ini;
  if (email) {
    const m = email.match(/[a-zA-Z]/g);
    return (m?.slice(0, 2).join("") ?? "É").toUpperCase();
  }
  return "É";
}

export function StudentAvatar({
  pictureUrl,
  userId,
  firstname,
  lastname,
  email,
  size = 11,
  className = "",
}: {
  pictureUrl?: string | null;
  userId: string;
  firstname?: string | null;
  lastname?: string | null;
  email?: string | null;
  /** Tailwind size unit (e.g. 11 → size-11). */
  size?: 8 | 9 | 10 | 11 | 12 | 14 | 16 | 20;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const sizeClass = {
    8: "size-8",
    9: "size-9",
    10: "size-10",
    11: "size-11",
    12: "size-12",
    14: "size-14",
    16: "size-16",
    20: "size-20",
  }[size];
  const fontSize =
    size <= 9 ? "text-[10px]" : size <= 11 ? "text-sm" : size <= 14 ? "text-base" : "text-xl";
  const initials = getInitials({ firstname, lastname, email });
  const palette = gradientFor(userId || email || "x");
  const showImage = Boolean(pictureUrl && !imageFailed);

  return (
    <div
      className={cn(
        sizeClass,
        "relative shrink-0 overflow-hidden rounded-full border border-slate-200/80 bg-white shadow-[0_4px_14px_rgba(15,23,42,.08)]",
        className
      )}
    >
      {showImage ? (
        <>
          <img
            src={pictureUrl ?? undefined}
            alt={`${firstname ?? ""} ${lastname ?? ""}`.trim() || email || "Avatar"}
            onError={() => setImageFailed(true)}
            className="size-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(15,23,42,.10))]" />
          <div className="pointer-events-none absolute inset-[1px] rounded-full border border-white/35" />
        </>
      ) : (
        <div
          className={cn(
            "relative flex size-full items-center justify-center text-white",
            palette
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,.26),transparent_38%)]" />
          <div className="absolute inset-[1px] rounded-full border border-white/20" />
          <span className={cn(fontSize, "relative font-semibold tracking-[-0.04em]")}>{initials}</span>
        </div>
      )}
    </div>
  );
}
