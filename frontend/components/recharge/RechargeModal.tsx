"use client";

import { Modal } from "@/components/ui/Modal";
import { RechargeForm } from "@/components/recharge/RechargeForm";
import { RechargePreview } from "@/components/recharge/RechargePreview";
import type { RechargeFlowHandle } from "@/hooks/useRechargeFlow";

export type RechargeModalProps = {
  open: boolean;
  onRequestClose: () => void;
  flow: RechargeFlowHandle;
};

export function RechargeModal({
  open,
  onRequestClose,
  flow,
}: RechargeModalProps) {
  const busy =
    flow.rechargeAnalyzeLoading || flow.rechargeCommitLoading;

  const handleClose = () => {
    flow.resetRechargeFlow();
    onRequestClose();
  };

  const handleCommit = async () => {
    const ok = await flow.handleCommitRecharge();
    if (ok) onRequestClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Recharge" busy={busy}>
      <RechargeForm
        embedded
        onAnalyze={flow.handleAnalyzeRecharge}
        analyzeLoading={flow.rechargeAnalyzeLoading}
        analyzeError={flow.rechargeAnalyzeError || null}
        onDismissAnalyzeError={flow.dismissRechargeAnalyzeError}
        resetKey={flow.rechargeFormResetKey}
      />
      {flow.rechargePreview && flow.rechargeCommitPayload ? (
        <RechargePreview
          embedded
          commitPayload={flow.rechargeCommitPayload}
          preview={flow.rechargePreview}
          onCommit={handleCommit}
          commitLoading={flow.rechargeCommitLoading}
          commitError={flow.rechargeCommitError || null}
          onDismissCommitError={flow.dismissRechargeCommitError}
          onReset={flow.resetRechargeFlow}
        />
      ) : null}
    </Modal>
  );
}
