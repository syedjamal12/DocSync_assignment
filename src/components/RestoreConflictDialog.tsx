"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  busy?: boolean;
  onSaveAndRestore: () => void;
  onDiscardAndRestore: () => void;
  onCancel: () => void;
};

export default function RestoreConflictDialog({
  open,
  busy,
  onSaveAndRestore,
  onDiscardAndRestore,
  onCancel,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-conflict-title"
      aria-describedby="restore-conflict-desc"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5">
        <h2 id="restore-conflict-title" className="font-medium text-neutral-900 mb-2">
          You have unsaved changes
        </h2>
        <p id="restore-conflict-desc" className="text-sm text-neutral-600 mb-5">
          Your current document is newer than the last saved version. Restoring will replace it —
          anything typed since the last save will be lost unless you save it first.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onSaveAndRestore}
            disabled={busy}
            className="w-full text-sm px-3 py-2 rounded bg-black text-white hover:bg-neutral-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
          >
            {busy ? "Working…" : "Save current changes, then restore"}
          </button>
          <button
            onClick={onDiscardAndRestore}
            disabled={busy}
            className="w-full text-sm px-3 py-2 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Discard current changes and restore
          </button>
          <button
            onClick={onCancel}
            disabled={busy}
            className="w-full text-sm px-3 py-2 rounded border border-neutral-300 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}