"use client";

import { useCallback, useEffect, useState } from "react";

import { computeBatteryFillPercent } from "@/lib/batteryPercent";

import { BatteryHistory } from "@/components/battery/BatteryHistory";
import { SocialBatteryCard } from "@/components/battery/SocialBatteryCard";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { RechargeModal } from "@/components/recharge/RechargeModal";
import { BottomLanePlaceholder } from "@/components/scene/BottomLanePlaceholder";
import { SceneActionButtons } from "@/components/scene/SceneActionButtons";
import { SceneLayout } from "@/components/scene/SceneLayout";
import {
  StatsStripPlaceholder,
  type StatsStripMetric,
} from "@/components/scene/StatsStripPlaceholder";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { TaskList } from "@/components/tasks/TaskList";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useRechargeFlow } from "@/hooks/useRechargeFlow";
import { useTaskActions } from "@/hooks/useTaskActions";
import { useTaskCreate } from "@/hooks/useTaskCreate";
import type { Battery } from "@/lib/types";
import { getApiBaseUrl } from "@/lib/config";

function buildStatsMetrics(battery: Battery): [
  StatsStripMetric,
  StatsStripMetric,
  StatsStripMetric,
] {
  const status =
    typeof battery.status_label === "string" && battery.status_label.trim()
      ? battery.status_label.trim()
      : "—";
  return [
    {
      label: "Energy",
      value: `${battery.current_level} / ${battery.max_level}`,
      hint: "current · max",
    },
    {
      label: "Status",
      value: status.charAt(0).toUpperCase() + status.slice(1),
    },
    {
      label: "Passive",
      value: `${battery.recharge_rate_per_hour}`,
      hint: "per hour",
    },
  ];
}

export function DashboardPage() {
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);

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

  const loadDashboardAndClearTaskErrors = useCallback(async () => {
    taskActions.dismissTaskActionError();
    taskCreate.dismissCreateTaskError();
    await loadDashboard();
  }, [loadDashboard, taskActions, taskCreate]);

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
    <>
      <CreateTaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onCreate={taskCreate.handleCreateTask}
        loading={taskCreate.createTaskLoading}
        error={taskCreate.createTaskError || null}
        onDismissError={taskCreate.dismissCreateTaskError}
        resetKey={taskCreate.createFormResetKey}
      />
      <RechargeModal
        open={rechargeModalOpen}
        onRequestClose={() => setRechargeModalOpen(false)}
        flow={recharge}
      />

      <SceneLayout
        topLeft={
          <div>
            <p className="font-sans text-xs font-semibold text-accent-cyan">
              Dashboard
            </p>
            <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight text-fg-primary sm:text-3xl">
              Your orbit
            </h1>
            {profile ? (
              <p className="mt-3 font-sans text-sm leading-relaxed text-fg-secondary sm:text-base">
                <span className="text-fg-muted">Operator</span>{" "}
                <span className="font-semibold text-fg-primary">
                  {profile.username}
                </span>
                {profile.display_name ? (
                  <span className="text-fg-muted">
                    {" "}
                    · {profile.display_name}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        }
        topRight={
          <SceneActionButtons
            onRecharge={() => setRechargeModalOpen(true)}
            onAddTask={() => setTaskModalOpen(true)}
          />
        }
        hero={
          <SocialBatteryCard
            batteryPercent={computeBatteryFillPercent(battery)}
          />
        }
        statsStrip={
          <StatsStripPlaceholder metrics={buildStatsMetrics(battery)} />
        }
        bottomLane={
          <BottomLanePlaceholder>
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
            <div className="border-t border-white/[0.06] pt-6">
              <h3 className="font-display text-base font-semibold tracking-tight text-fg-primary">
                Energy log
              </h3>
              <p className="mt-1 font-sans text-sm leading-relaxed text-fg-secondary">
                Recent shifts from tasks, recharge, and bonuses.
              </p>
              <div className="mt-4 max-h-52 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/20 shadow-inner">
                <BatteryHistory events={batteryHistory} embedded />
              </div>
            </div>
            <p className="border-t border-white/[0.05] pt-4 text-center font-mono text-[0.6875rem] text-fg-subtle">
              API {apiBase}
            </p>
          </BottomLanePlaceholder>
        }
      />
    </>
  );
}
