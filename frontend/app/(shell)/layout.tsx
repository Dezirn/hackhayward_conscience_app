import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { SiteNav } from "@/components/layout/SiteNav";

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <SiteNav />
      {children}
    </AppShell>
  );
}
