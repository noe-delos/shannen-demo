/* eslint-disable @next/next/no-img-element */
"use client";

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
  const sizeClass = `size-${size}`;
  const fontSize =
    size <= 9 ? "text-[10px]" : size <= 11 ? "text-sm" : size <= 14 ? "text-base" : "text-xl";

  if (pictureUrl) {
    return (
      <img
        src={pictureUrl}
        alt={`${firstname ?? ""} ${lastname ?? ""}`.trim() || email || "Avatar"}
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm ${className}`}
      />
    );
  }

  const palette = gradientFor(userId || email || "x");
  const initials = getInitials({ firstname, lastname, email });

  return (
    <div
      className={`${sizeClass} ${fontSize} flex shrink-0 items-center justify-center rounded-full ${palette} font-bold text-white shadow-sm ring-2 ring-white ${className}`}
    >
      {initials}
    </div>
  );
}
