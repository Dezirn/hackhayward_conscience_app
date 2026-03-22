import type { AdvisorId } from "@/lib/council/types";

/** Per-advisor visual accents (Tailwind classes). */
export function getAdvisorAccent(id: AdvisorId): {
  iconWrap: string;
  border: string;
  shadow: string;
  labelTint: string;
} {
  switch (id) {
    case "optimist":
      return {
        iconWrap:
          "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/35 shadow-[0_0_28px_-4px_rgba(251,191,36,0.45)]",
        border: "border-amber-500/20",
        shadow: "shadow-[0_0_40px_-12px_rgba(251,191,36,0.25)]",
        labelTint: "text-amber-200/90",
      };
    case "skeptic":
      return {
        iconWrap:
          "bg-rose-500/12 text-rose-200 ring-1 ring-rose-400/30 shadow-[0_0_28px_-4px_rgba(244,63,94,0.35)]",
        border: "border-rose-500/20",
        shadow: "shadow-[0_0_40px_-12px_rgba(244,63,94,0.2)]",
        labelTint: "text-rose-200/90",
      };
    case "pragmatist":
      return {
        iconWrap:
          "bg-cyan-500/12 text-cyan-200 ring-1 ring-cyan-400/35 shadow-[0_0_28px_-4px_rgba(34,211,238,0.35)]",
        border: "border-cyan-500/20",
        shadow: "shadow-[0_0_40px_-12px_rgba(34,211,238,0.22)]",
        labelTint: "text-cyan-200/90",
      };
    case "empath":
      return {
        iconWrap:
          "bg-fuchsia-500/12 text-fuchsia-200 ring-1 ring-fuchsia-400/30 shadow-[0_0_28px_-4px_rgba(217,70,239,0.35)]",
        border: "border-fuchsia-500/20",
        shadow: "shadow-[0_0_40px_-12px_rgba(192,38,211,0.2)]",
        labelTint: "text-fuchsia-200/90",
      };
    case "strategist":
      return {
        iconWrap:
          "bg-indigo-500/14 text-indigo-200 ring-1 ring-indigo-400/35 shadow-[0_0_28px_-4px_rgba(129,140,248,0.4)]",
        border: "border-indigo-500/20",
        shadow: "shadow-[0_0_40px_-12px_rgba(99,102,241,0.25)]",
        labelTint: "text-indigo-200/90",
      };
    default:
      return {
        iconWrap: "bg-zinc-800 text-zinc-300 ring-1 ring-white/10",
        border: "border-white/10",
        shadow: "",
        labelTint: "text-zinc-400",
      };
  }
}
