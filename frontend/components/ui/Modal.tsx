"use client";

import {
  useEffect,
  useId,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** When true, backdrop click does not close (avoids accidental dismiss during requests). */
  busy?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  busy = false,
}: ModalProps) {
  const titleId = useId();
  const isClient = useIsClient();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!isClient || !open) return null;

  const panel = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <div
        className={`absolute inset-0 bg-black/65 backdrop-blur-[2px] ${busy ? "cursor-default" : "cursor-pointer hover:bg-black/70"}`}
        onClick={() => {
          if (!busy) onClose();
        }}
        aria-hidden
      />
      <div
        className="relative z-[1] flex max-h-[min(90dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-zinc-950/95 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_48px_-12px_rgba(0,0,0,0.75)] ring-1 ring-inset ring-white/[0.06]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <h2
            id={titleId}
            className="text-sm font-semibold tracking-tight text-white"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08]"
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
