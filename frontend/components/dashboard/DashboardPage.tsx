"use client";

import { useCallback, useEffect, useState } from "react";

import { BatteryCard } from "@/components/battery/BatteryCard";
import { BatteryHistory } from "@/components/battery/BatteryHistory";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { CreateTaskForm } from "@/components/tasks/CreateTaskForm";
import { TaskList } from "@/components/tasks/TaskList";
import {
  ApiError,
  bootstrapProfile,
  completeTask,
  createTask,
  getBattery,
  getBatteryHistory,
  getProfile,
  getTasks,
  skipTask,
} from "@/lib/api";
import { getApiBaseUrl } from "@/lib/config";
import type { Battery, BatteryEvent, Profile, Task, TaskCreateInput } from "@/lib/types";

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

type TaskMutationKind = "complete" | "skip";

function mutationErrorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong. Please try again.";
}

export function DashboardPage() {
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [battery, setBattery] = useState<Battery | null>(null);
  const [batteryHistory, setBatteryHistory] = useState<BatteryEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [mutatingTaskId, setMutatingTaskId] = useState<string | null>(null);
  const [mutatingTaskAction, setMutatingTaskAction] =
    useState<TaskMutationKind | null>(null);
  const [taskActionError, setTaskActionError] = useState<string>("");
  const [createTaskLoading, setCreateTaskLoading] = useState(false);
  const [createTaskError, setCreateTaskError] = useState<string>("");
  const [createFormResetKey, setCreateFormResetKey] = useState(0);

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

  /** Complete or skip one task, then refresh battery, history, and tasks. */
  const runTaskMutation = useCallback(
    async (taskId: string, kind: TaskMutationKind) => {
      setMutatingTaskId(taskId);
      setMutatingTaskAction(kind);
      setTaskActionError("");
      try {
        if (kind === "complete") {
          await completeTask(taskId);
        } else {
          await skipTask(taskId);
        }
        await refreshAfterTaskMutation();
      } catch (e) {
        setTaskActionError(mutationErrorMessage(e));
      } finally {
        setMutatingTaskId(null);
        setMutatingTaskAction(null);
      }
    },
    [refreshAfterTaskMutation],
  );

  const handleCompleteTask = useCallback(
    (taskId: string) => void runTaskMutation(taskId, "complete"),
    [runTaskMutation],
  );

  const handleSkipTask = useCallback(
    (taskId: string) => void runTaskMutation(taskId, "skip"),
    [runTaskMutation],
  );

  const dismissTaskActionError = useCallback(() => {
    setTaskActionError("");
  }, []);

  const dismissCreateTaskError = useCallback(() => {
    setCreateTaskError("");
  }, []);

  const handleCreateTask = useCallback(async (payload: TaskCreateInput) => {
    setCreateTaskLoading(true);
    setCreateTaskError("");
    try {
      await createTask(payload);
      const nextTasks = await getTasks();
      setTasks(nextTasks);
      setCreateFormResetKey((k) => k + 1);
    } catch (e) {
      const msg = mutationErrorMessage(e);
      setCreateTaskError(msg);
      throw e;
    } finally {
      setCreateTaskLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");
    setErrorDetail(null);
    setTaskActionError("");
    setCreateTaskError("");

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

      <div className="flex flex-col gap-4">
        <CreateTaskForm
          onSubmit={handleCreateTask}
          loading={createTaskLoading}
          error={createTaskError || null}
          onDismissError={dismissCreateTaskError}
          resetKey={createFormResetKey}
        />
        <TaskList
          tasks={tasks}
          loading={false}
          mutatingTaskId={mutatingTaskId}
          mutatingTaskAction={mutatingTaskAction}
          actionError={taskActionError || null}
          onDismissActionError={dismissTaskActionError}
          onCompleteTask={handleCompleteTask}
          onSkipTask={handleSkipTask}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
        Recharge is still a placeholder — tasks are live.
      </p>
    </div>
  );
}
