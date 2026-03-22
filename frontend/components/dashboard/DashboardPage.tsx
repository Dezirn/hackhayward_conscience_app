"use client";

import { useCallback, useEffect, useState } from "react";

import { BatteryCard } from "@/components/battery/BatteryCard";
import { BatteryHistory } from "@/components/battery/BatteryHistory";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import {
  ApiError,
  bootstrapProfile,
  getBattery,
  getBatteryHistory,
  getProfile,
} from "@/lib/api";
import { getApiBaseUrl } from "@/lib/config";
import type { Battery, BatteryEvent, Profile } from "@/lib/types";

function PlaceholderCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm text-zinc-400">{description}</p>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

type DashboardStatus = "loading" | "error" | "ready";

export function DashboardPage() {
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [battery, setBattery] = useState<Battery | null>(null);
  const [batteryHistory, setBatteryHistory] = useState<BatteryEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");
    setErrorDetail(null);

    try {
      await bootstrapProfile();
      const p = await getProfile();
      const b = await getBattery();
      setProfile(p);
      setBattery(b);
      setStatus("ready");
    } catch (e) {
      setProfile(null);
      setBattery(null);
      setStatus("error");
      if (e instanceof ApiError) {
        setErrorMessage(e.message);
        setErrorDetail(
          typeof e.body === "string" ? e.body : JSON.stringify(e.body),
        );
      } else if (e instanceof Error) {
        setErrorMessage(e.message);
        setErrorDetail(null);
      } else {
        setErrorMessage("Unexpected error");
        setErrorDetail(null);
      }
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const apiBase = getApiBaseUrl();

  if (status === "loading") {
    return <LoadingState message="Loading dashboard…" />;
  }

  if (status === "error") {
    return (
      <ErrorState
        title="Could not load dashboard"
        message={errorMessage}
        detail={errorDetail}
        onRetry={() => void loadDashboard()}
      />
    );
  }

  if (!battery) {
    return (
      <ErrorState
        title="Incomplete data"
        message="Battery data is missing."
        onRetry={() => void loadDashboard()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {profile ? (
        <p className="text-sm text-zinc-400">
          <span className="text-zinc-500">Profile:</span>{" "}
          <span className="font-medium text-zinc-200">{profile.username}</span>
          {profile.display_name ? (
            <span className="text-zinc-500">
              {" "}
              ({profile.display_name})
            </span>
          ) : null}
        </p>
      ) : null}

      <section
        className="space-y-5 rounded-2xl border border-zinc-800/90 bg-zinc-950/40 p-4 sm:p-6"
        aria-labelledby="battery-section-heading"
      >
        <div className="border-b border-zinc-800/80 pb-4">
          <h2
            id="battery-section-heading"
            className="text-base font-semibold text-white"
          >
            Energy &amp; activity
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Live battery snapshot and recent changes from the server.
          </p>
        </div>
        <BatteryCard battery={battery} />
        <BatteryHistory events={batteryHistory} />
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <PlaceholderCard
          title="Tasks"
          description="Task list, create, complete, and skip will wire up in a later phase."
        >
          <div className="h-24 rounded-lg border border-dashed border-zinc-700 bg-zinc-950/60" />
        </PlaceholderCard>

        <PlaceholderCard
          title="Recharge"
          description="Reflection analyze/commit flows will connect in a later phase."
        >
          <div className="h-24 rounded-lg border border-dashed border-zinc-700 bg-zinc-950/60" />
        </PlaceholderCard>

        <PlaceholderCard
          title="API / debug"
          description="Configured backend base URL."
        >
          <p className="break-all font-mono text-xs text-emerald-400/90">
            {apiBase}
          </p>
        </PlaceholderCard>
      </div>

      <p className="text-center text-xs text-zinc-600">
        Tasks and recharge are placeholders — next up.
      </p>
    </div>
  );
}
