"use client";

import { useCallback, useState } from "react";

import { createTask, mutationErrorMessage } from "@/lib/api";
import type { TaskCreateInput } from "@/lib/types";

/**
 * POST /tasks + refresh task list + form reset key on success.
 */
export function useTaskCreate(refreshTasks: () => Promise<void>) {
  const [createTaskLoading, setCreateTaskLoading] = useState(false);
  const [createTaskError, setCreateTaskError] = useState("");
  const [createFormResetKey, setCreateFormResetKey] = useState(0);

  const dismissCreateTaskError = useCallback(() => {
    setCreateTaskError("");
  }, []);

  const handleCreateTask = useCallback(
    async (payload: TaskCreateInput) => {
      setCreateTaskLoading(true);
      setCreateTaskError("");
      try {
        await createTask(payload);
        await refreshTasks();
        setCreateFormResetKey((k) => k + 1);
      } catch (e) {
        setCreateTaskError(mutationErrorMessage(e));
        throw e;
      } finally {
        setCreateTaskLoading(false);
      }
    },
    [refreshTasks],
  );

  return {
    createTaskLoading,
    createTaskError,
    createFormResetKey,
    handleCreateTask,
    dismissCreateTaskError,
  };
}
