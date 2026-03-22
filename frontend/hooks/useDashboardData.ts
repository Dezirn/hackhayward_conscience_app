"use client";

import { useCallback, useState } from "react";

import {
  ApiError,
  bootstrapProfile,
  getBattery,
  getBatteryHistory,
  getProfile,
  getTasks,
} from "@/lib/api";
import type { Battery, BatteryEvent, Profile, Task } from "@/lib/types";

type DashboardLoadStatus = "loading" | "error" | "ready";

/**
 * Profile, battery, history, tasks + initial load + focused refresh helpers.
 */
export function useDashboardData() {
  const [status, setStatus] = useState<DashboardLoadStatus>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [battery, setBattery] = useState<Battery | null>(null);
  const [batteryHistory, setBatteryHistory] = useState<BatteryEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const refreshBatterySection = useCallback(async () => {
    const [b, h] = await Promise.all([getBattery(), getBatteryHistory()]);
    setBattery(b);
    setBatteryHistory(h);
  }, []);

  const refreshTasks = useCallback(async () => {
    setTasks(await getTasks());
  }, []);

  const refreshAfterTaskMutation = useCallback(async () => {
    const [b, h, t] = await Promise.all([
      getBattery(),
      getBatteryHistory(),
      getTasks(),
    ]);
    setBattery(b);
    setBatteryHistory(h);
    setTasks(t);
  }, []);

  /** After POST /recharge/commit: apply battery from response if present, then reload history. */
  const refreshAfterRechargeCommit = useCallback(
    async (batteryFromResponse?: Battery | null) => {
      if (batteryFromResponse) {
        setBattery(batteryFromResponse);
      } else {
        setBattery(await getBattery());
      }
      setBatteryHistory(await getBatteryHistory());
    },
    [],
  );

  const loadDashboard = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");
    setErrorDetail(null);

    try {
      await bootstrapProfile();
      const [p, b, h, t] = await Promise.all([
        getProfile(),
        getBattery(),
        getBatteryHistory(),
        getTasks(),
      ]);
      setProfile(p);
      setBattery(b);
      setBatteryHistory(h);
      setTasks(t);
      setStatus("ready");
    } catch (e) {
      setProfile(null);
      setBattery(null);
      setBatteryHistory([]);
      setTasks([]);
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

  return {
    profile,
    battery,
    batteryHistory,
    tasks,
    status,
    errorMessage,
    errorDetail,
    loadDashboard,
    refreshBatterySection,
    refreshTasks,
    refreshAfterTaskMutation,
    refreshAfterRechargeCommit,
  };
}
