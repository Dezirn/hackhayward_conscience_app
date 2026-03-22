"use client";

import { Modal } from "@/components/ui/Modal";
import { CreateTaskForm } from "@/components/tasks/CreateTaskForm";
import type { TaskCreateInput } from "@/lib/types";

export type CreateTaskModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: TaskCreateInput) => Promise<void>;
  loading: boolean;
  error: string | null;
  onDismissError: () => void;
  resetKey: number;
};

export function CreateTaskModal({
  open,
  onClose,
  onCreate,
  loading,
  error,
  onDismissError,
  resetKey,
}: CreateTaskModalProps) {
  const handleClose = () => {
    onDismissError();
    onClose();
  };

  const submit = async (payload: TaskCreateInput) => {
    try {
      await onCreate(payload);
      onClose();
    } catch {
      /* Hook sets error; keep modal open */
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add task"
      busy={loading}
    >
      <CreateTaskForm
        embedded
        onSubmit={submit}
        loading={loading}
        error={error}
        onDismissError={onDismissError}
        resetKey={resetKey}
      />
    </Modal>
  );
}
