"use client";

type SceneActionButtonsProps = {
  onRecharge: () => void;
  onAddTask: () => void;
};

export function SceneActionButtons({
  onRecharge,
  onAddTask,
}: SceneActionButtonsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={onRecharge}
        className="rounded-full border border-indigo-500/35 bg-indigo-950/40 px-4 py-2 text-sm font-medium text-indigo-100 shadow-sm transition hover:border-indigo-400/50 hover:bg-indigo-900/50"
      >
        Recharge
      </button>
      <button
        type="button"
        onClick={onAddTask}
        className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-zinc-100 shadow-sm transition hover:bg-white/[0.1]"
      >
        Add task
      </button>
    </div>
  );
}
