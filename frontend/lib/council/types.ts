export type AdvisorId =
  | "optimist"
  | "skeptic"
  | "pragmatist"
  | "empath"
  | "strategist";

export interface AdvisorDefinition {
  id: AdvisorId;
  name: string;
  roleLabel: string;
}

export interface AdvisorResponse {
  advisorId: AdvisorId;
  text: string;
}

export interface CouncilSynthesis {
  consensus: string;
  mainTension: string;
  suggestedNextStep: string;
}

/** Full council output — ready to render or to mirror from a future API. */
export interface CouncilResult {
  advisors: AdvisorResponse[];
  synthesis: CouncilSynthesis;
  /** Backend returned the deterministic template (AI unavailable or bad JSON). */
  serverUsedFallback?: boolean;
  /** Network/server error — local template so the page still works. */
  clientSideFallback?: boolean;
}
