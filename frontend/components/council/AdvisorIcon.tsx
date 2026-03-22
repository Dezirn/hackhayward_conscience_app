import type { AdvisorId } from "@/lib/council/types";

type AdvisorIconProps = {
  id: AdvisorId;
  className?: string;
};

/** Compact SVG motifs — one per council voice. */
export function AdvisorIcon({ id, className = "h-8 w-8" }: AdvisorIconProps) {
  switch (id) {
    case "optimist":
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
          <circle
            cx="16"
            cy="16"
            r="10"
            className="stroke-current"
            strokeWidth="1.5"
            opacity={0.35}
          />
          <path
            d="M16 6v4M16 22v4M6 16h4M22 16h4"
            className="stroke-current"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="16" cy="16" r="3" className="fill-current" />
        </svg>
      );
    case "skeptic":
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
          <path
            d="M8 14h16l-2 10H10L8 14z"
            className="stroke-current"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M11 14V11a5 5 0 0110 0v3"
            className="stroke-current"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M12 22h8"
            className="stroke-current"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity={0.6}
          />
        </svg>
      );
    case "pragmatist":
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
          <rect
            x="7"
            y="9"
            width="18"
            height="14"
            rx="2"
            className="stroke-current"
            strokeWidth="1.5"
          />
          <path
            d="M11 14h10M11 18h6"
            className="stroke-current"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M22 22l3 3"
            className="stroke-current"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "empath":
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
          <path
            d="M16 26c-4.5-3.5-8-6.8-8-11a8 8 0 1116 0c0 4.2-3.5 7.5-8 11z"
            className="stroke-current"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M12 13h.01M20 13h.01"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "strategist":
      return (
        <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
          <path
            d="M6 24l8-16 4 8 8-12"
            className="stroke-current"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="22" cy="8" r="2" className="fill-current" />
          <circle cx="14" cy="16" r="2" className="fill-current" opacity={0.5} />
          <circle cx="6" cy="24" r="2" className="fill-current" />
        </svg>
      );
    default:
      return null;
  }
}
