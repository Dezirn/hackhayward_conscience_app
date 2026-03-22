import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-900/40 px-4 py-5 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
            Social Battery
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Hackathon dashboard — track energy, tasks, and recharge in one place.
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
