"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

export default function PromptDialog({
  open,
  title,
  placeholder,
  confirmLabel = "Save",
  onConfirm,
  onCancel,
}: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      // let the dialog paint before focusing
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(value.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-dialog-title"
    >
      <form onSubmit={submit} className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
        <h2 id="prompt-dialog-title" className="font-medium text-neutral-900 mb-3">
          {title}
        </h2>
        <label className="sr-only" htmlFor="prompt-dialog-input">{title}</label>
        <input
          id="prompt-dialog-input"
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          maxLength={100}
          className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded border border-neutral-300 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button type="submit" className="px-3 py-1.5 text-sm rounded bg-black text-white hover:bg-neutral-800">
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
