"use client";

import { useCallback, useState } from "react";

import { completeTask, mutationErrorMessage, skipTask } from "@/lib/api";

type TaskMutationKind = "complete" | "skip";

/**
 * Complete/skip with per-task loading and shared refresh after success.
 */
export function useTaskActions(refreshAfterTaskMutation: () => Promise<void>) {
  const [mutatingTaskId, setMutatingTaskId] = useState<string | null>(null);
  const [mutatingTaskAction, setMutatingTaskAction] =
    useState<TaskMutationKind | null>(null);
  const [taskActionError, setTaskActionError] = useState("");

  const dismissTaskActionError = useCallback(() => {
    setTaskActionError("");
  }, []);

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

  return {
    mutatingTaskId,
    mutatingTaskAction,
    taskActionError,
    handleCompleteTask,
    handleSkipTask,
    dismissTaskActionError,
  };
}
