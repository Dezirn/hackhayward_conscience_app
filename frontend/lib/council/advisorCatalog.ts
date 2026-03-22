import type { AdvisorDefinition } from "@/lib/council/types";

/** Static roster — order is stable for layout and mock responses. */
export const COUNCIL_ADVISORS: AdvisorDefinition[] = [
  {
    id: "optimist",
    name: "Optimist",
    roleLabel: "Opportunity Seeker",
  },
  {
    id: "skeptic",
    name: "Skeptic",
    roleLabel: "Risk Spotter",
  },
  {
    id: "pragmatist",
    name: "Pragmatist",
    roleLabel: "Execution Realist",
  },
  {
    id: "empath",
    name: "Empath",
    roleLabel: "Emotional Guide",
  },
  {
    id: "strategist",
    name: "Strategist",
    roleLabel: "Long-Term Planner",
  },
];
