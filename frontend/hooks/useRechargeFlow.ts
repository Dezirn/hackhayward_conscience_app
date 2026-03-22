"use client";

import { useCallback, useState } from "react";

import { analyzeRecharge, commitRecharge, mutationErrorMessage } from "@/lib/api";
import type { Battery, RechargeAnalyzeInput, RechargeAnalyzeResponse } from "@/lib/types";

/**
 * Analyze → preview → commit, using the same payload for commit as for analyze.
 */
export function useRechargeFlow(
  refreshAfterRechargeCommit: (batteryFromResponse?: Battery | null) => Promise<void>,
) {
  const [rechargeCommitPayload, setRechargeCommitPayload] =
    useState<RechargeAnalyzeInput | null>(null);
  const [rechargePreview, setRechargePreview] =
    useState<RechargeAnalyzeResponse | null>(null);
  const [rechargeAnalyzeLoading, setRechargeAnalyzeLoading] = useState(false);
  const [rechargeAnalyzeError, setRechargeAnalyzeError] = useState("");
  const [rechargeCommitLoading, setRechargeCommitLoading] = useState(false);
  const [rechargeCommitError, setRechargeCommitError] = useState("");
  const [rechargeFormResetKey, setRechargeFormResetKey] = useState(0);

  const dismissRechargeAnalyzeError = useCallback(() => {
    setRechargeAnalyzeError("");
  }, []);

  const dismissRechargeCommitError = useCallback(() => {
    setRechargeCommitError("");
  }, []);

  const resetRechargeFlow = useCallback(() => {
    setRechargeCommitPayload(null);
    setRechargePreview(null);
    setRechargeAnalyzeError("");
    setRechargeCommitError("");
    setRechargeFormResetKey((k) => k + 1);
  }, []);

  const handleAnalyzeRecharge = useCallback(
    async (input: RechargeAnalyzeInput) => {
      setRechargeAnalyzeLoading(true);
      setRechargeAnalyzeError("");
      setRechargeCommitError("");
      try {
        const result = await analyzeRecharge(input);
        setRechargeCommitPayload(input);
        setRechargePreview(result);
      } catch (e) {
        setRechargeAnalyzeError(mutationErrorMessage(e));
      } finally {
        setRechargeAnalyzeLoading(false);
      }
    },
    [],
  );

  const handleCommitRecharge = useCallback(async () => {
    if (!rechargeCommitPayload) return;
    setRechargeCommitLoading(true);
    setRechargeCommitError("");
    try {
      const res = await commitRecharge(rechargeCommitPayload);
      await refreshAfterRechargeCommit(res.battery ?? null);
      setRechargeCommitPayload(null);
      setRechargePreview(null);
      setRechargeFormResetKey((k) => k + 1);
    } catch (e) {
      setRechargeCommitError(mutationErrorMessage(e));
    } finally {
      setRechargeCommitLoading(false);
    }
  }, [rechargeCommitPayload, refreshAfterRechargeCommit]);

  return {
    rechargeCommitPayload,
    rechargePreview,
    rechargeAnalyzeLoading,
    rechargeAnalyzeError,
    rechargeCommitLoading,
    rechargeCommitError,
    rechargeFormResetKey,
    handleAnalyzeRecharge,
    handleCommitRecharge,
    resetRechargeFlow,
    dismissRechargeAnalyzeError,
    dismissRechargeCommitError,
  };
}
