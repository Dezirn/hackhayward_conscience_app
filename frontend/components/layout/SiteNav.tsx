"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/council", label: "Decision Council" },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  const isCouncil =
    pathname === "/council" || pathname.startsWith("/council/");

  const uplinkInner = (
    <>
      <span className="relative flex h-2 w-2 shrink-0">
        <span
          className={`assistant-signal-dot absolute inset-0 rounded-full ${
            isCouncil ? "bg-accent-violet" : "bg-accent-cyan"
          }`}
        />
        <span
          className={`absolute inset-0 animate-ping rounded-full opacity-40 motion-reduce:animate-none ${
            isCouncil ? "bg-accent-violet" : "bg-accent-cyan"
          }`}
          aria-hidden
        />
      </span>
      <div className="min-w-0 text-left">
        <p className="font-sans text-[0.6875rem] font-semibold text-fg-subtle">
          Live uplink
        </p>
        <p className="truncate font-sans text-sm font-medium leading-snug text-fg-secondary">
          {isCouncil
            ? "Council channel · deliberation mode"
            : "Guidance linked · watching your social battery"}
        </p>
      </div>
    </>
  );

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-2xl transition-[border-color,box-shadow] duration-500 ${
        isCouncil
          ? "border-violet-500/[0.12] bg-[#06051a]/80 shadow-[0_8px_40px_-20px_rgba(139,92,246,0.25)]"
          : "border-cyan-500/[0.08] bg-[#04040f]/78 shadow-[0_8px_40px_-24px_rgba(34,211,238,0.12)]"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-8 sm:py-3.5">
        <div className="relative flex items-center justify-between gap-3">
          <Link
            href="/"
            className="group z-10 flex min-w-0 shrink flex-col leading-tight transition"
          >
            <span className="font-display text-lg font-semibold tracking-tight text-fg-primary transition group-hover:text-accent-cyan">
              Conscience
            </span>
            <span className="mt-0.5 font-sans text-xs font-medium text-fg-secondary">
              Inner OS
            </span>
          </Link>

          {/* Center uplink — desktop */}
          <div
            className={`pointer-events-none absolute left-1/2 top-1/2 hidden w-[min(100%,20rem)] -translate-x-1/2 -translate-y-1/2 md:flex md:justify-center`}
          >
            <div
              className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-full border px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
                isCouncil
                  ? "border-accent-violet/25 bg-violet-950/30"
                  : "border-accent-cyan/20 bg-cyan-950/25"
              }`}
              role="status"
              aria-live="polite"
            >
              {uplinkInner}
            </div>
          </div>

          <nav
            className={`z-10 flex shrink-0 items-center gap-1 rounded-full border p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
              isCouncil
                ? "border-violet-500/20 bg-[#0c0618]/85"
                : "border-white/[0.1] bg-zinc-950/55"
            }`}
            aria-label="Main navigation"
          >
            {links.map(({ href, label }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative rounded-full px-3 py-2 font-sans text-sm font-semibold transition sm:px-4 ${
                    active
                      ? isCouncil
                        ? "bg-violet-500/20 text-fg-primary shadow-[0_0_24px_-8px_rgba(139,92,246,0.5)] ring-1 ring-accent-violet/40"
                        : "bg-cyan-500/15 text-fg-primary shadow-[0_0_24px_-8px_rgba(34,211,238,0.35)] ring-1 ring-accent-cyan/35"
                      : "text-fg-muted hover:bg-white/[0.06] hover:text-fg-primary"
                  }`}
                >
                  {active ? (
                    <span
                      className={`pointer-events-none absolute inset-x-3 -bottom-0.5 h-px rounded-full opacity-90 ${
                        isCouncil
                          ? "bg-gradient-to-r from-transparent via-accent-violet to-transparent"
                          : "bg-gradient-to-r from-transparent via-accent-cyan to-transparent"
                      }`}
                      aria-hidden
                    />
                  ) : null}
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile uplink */}
        <div
          className={`mt-3 flex items-center gap-2.5 rounded-xl border px-3 py-2 md:hidden ${
            isCouncil
              ? "border-accent-violet/25 bg-violet-950/25"
              : "border-accent-cyan/20 bg-cyan-950/20"
          }`}
          role="status"
        >
          {uplinkInner}
        </div>
      </div>
    </header>
  );
}
