"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  actionLabel: string;
  original: string;
  result: string;
  onReplace: () => void;
  onInsertBelow: () => void;
  onCancel: () => void;
};

export default function AiPreviewDialog({
  open,
  actionLabel,
  original,
  result,
  onReplace,
  onInsertBelow,
  onCancel,
}: Props) {
  const replaceRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) replaceRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-preview-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto">
        <h2 id="ai-preview-title" className="font-medium text-neutral-900 mb-1">
          {actionLabel}
        </h2>
        <p className="text-xs text-neutral-500 mb-4">
          Nothing in your document changes until you pick an option below.
        </p>

        <div className="mb-3">
          <p className="text-xs font-medium text-neutral-500 mb-1">Original selection</p>
          <div className="text-sm text-neutral-600 border rounded px-3 py-2 bg-neutral-50 max-h-28 overflow-y-auto whitespace-pre-wrap">
            {original}
          </div>
        </div>

        <div className="mb-5">
          <p className="text-xs font-medium text-neutral-500 mb-1">AI result</p>
          <div className="text-sm text-neutral-900 border rounded px-3 py-2 bg-white max-h-56 overflow-y-auto whitespace-pre-wrap">
            {result}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded border border-neutral-300 hover:bg-neutral-50 order-3 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={onInsertBelow}
            className="px-3 py-1.5 text-sm rounded border border-neutral-300 hover:bg-neutral-50 order-2"
          >
            Insert below
          </button>
          <button
            ref={replaceRef}
            onClick={onReplace}
            className="px-3 py-1.5 text-sm rounded bg-black text-white hover:bg-neutral-800 order-1 sm:order-3"
          >
            Replace selection
          </button>
        </div>
      </div>
    </div>
  );
}