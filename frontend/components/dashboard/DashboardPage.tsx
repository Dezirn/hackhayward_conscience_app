"use client";

import { useCallback, useEffect } from "react";

import { BatteryCard } from "@/components/battery/BatteryCard";
import { BatteryHistory } from "@/components/battery/BatteryHistory";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { RechargeForm } from "@/components/recharge/RechargeForm";
import { RechargePreview } from "@/components/recharge/RechargePreview";
import { CreateTaskForm } from "@/components/tasks/CreateTaskForm";
import { TaskList } from "@/components/tasks/TaskList";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useRechargeFlow } from "@/hooks/useRechargeFlow";
import { useTaskActions } from "@/hooks/useTaskActions";
import { useTaskCreate } from "@/hooks/useTaskCreate";
import { getApiBaseUrl } from "@/lib/config";

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

export function DashboardPage() {
  const {
    profile,
    battery,
    batteryHistory,
    tasks,
    status,
    errorMessage,
    errorDetail,
    loadDashboard,
    refreshTasks,
    refreshAfterTaskMutation,
    refreshAfterRechargeCommit,
  } = useDashboardData();

  const taskActions = useTaskActions(refreshAfterTaskMutation);
  const taskCreate = useTaskCreate(refreshTasks);
  const recharge = useRechargeFlow(refreshAfterRechargeCommit);

  /** Full reload: clear task list / create errors only (same as pre-refactor). */
  const loadDashboardAndClearTaskErrors = useCallback(async () => {
    taskActions.dismissTaskActionError();
    taskCreate.dismissCreateTaskError();
    await loadDashboard();
  }, [
    loadDashboard,
    taskActions.dismissTaskActionError,
    taskCreate.dismissCreateTaskError,
  ]);

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
        onRetry={() => void loadDashboardAndClearTaskErrors()}
      />
    );
  }

  if (!battery) {
    return (
      <ErrorState
        title="Incomplete data"
        message="Battery data is missing."
        onRetry={() => void loadDashboardAndClearTaskErrors()}
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
          onSubmit={taskCreate.handleCreateTask}
          loading={taskCreate.createTaskLoading}
          error={taskCreate.createTaskError || null}
          onDismissError={taskCreate.dismissCreateTaskError}
          resetKey={taskCreate.createFormResetKey}
        />
        <TaskList
          tasks={tasks}
          loading={false}
          mutatingTaskId={taskActions.mutatingTaskId}
          mutatingTaskAction={taskActions.mutatingTaskAction}
          actionError={taskActions.taskActionError || null}
          onDismissActionError={taskActions.dismissTaskActionError}
          onCompleteTask={taskActions.handleCompleteTask}
          onSkipTask={taskActions.handleSkipTask}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <RechargeForm
            onAnalyze={recharge.handleAnalyzeRecharge}
            analyzeLoading={recharge.rechargeAnalyzeLoading}
            analyzeError={recharge.rechargeAnalyzeError || null}
            onDismissAnalyzeError={recharge.dismissRechargeAnalyzeError}
            resetKey={recharge.rechargeFormResetKey}
          />
          {recharge.rechargePreview && recharge.rechargeCommitPayload ? (
            <RechargePreview
              commitPayload={recharge.rechargeCommitPayload}
              preview={recharge.rechargePreview}
              onCommit={recharge.handleCommitRecharge}
              commitLoading={recharge.rechargeCommitLoading}
              commitError={recharge.rechargeCommitError || null}
              onDismissCommitError={recharge.dismissRechargeCommitError}
              onReset={recharge.resetRechargeFlow}
            />
          ) : null}
        </div>

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
        Single-page dashboard — battery, tasks, and recharge.
      </p>
    </div>
  );
}
