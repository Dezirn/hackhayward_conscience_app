import type { Metadata } from "next";

import { CouncilPage } from "@/components/council/CouncilPage";

export const metadata: Metadata = {
  title: "Decision Council",
  description:
    "Multiple AI perspectives on your decisions—optimist, skeptic, pragmatist, empath, strategist.",
};

export default function CouncilRoutePage() {
  return <CouncilPage />;
}
