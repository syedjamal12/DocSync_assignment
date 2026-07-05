"use client";

import { useState } from "react";
import ShareDialog from "@/components/ShareDialog";
import RoleBadge from "@/components/RoleBadge";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";
import { useToast } from "@/components/Toast";

type Props = {
  documentId: string;
  initialTitle: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
};

export default function DocHeader({ documentId, initialTitle, role }: Props) {
  const { show } = useToast();
  const [title, setTitle] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialTitle);
  const [shareOpen, setShareOpen] = useState(false);

  const canEdit = role !== "VIEWER";
  const canManage = role === "OWNER";

  const saveTitle = async () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === title) {
      setDraft(title);
      return;
    }
    try {
      await apiFetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: trimmed }),
      });
      setTitle(trimmed);
    } catch (err) {
      setDraft(title);
      show(err instanceof ApiRequestError ? err.message : "Could not rename document.", "error");
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 mb-4 flex-wrap">
      <div className="flex items-center gap-2 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setDraft(title);
                setEditing(false);
              }
            }}
            className="text-xl font-medium border-b border-neutral-300 focus:outline-none focus:border-black min-w-0"
          />
        ) : (
          <h1
            className={`text-xl font-medium truncate ${canEdit ? "cursor-text" : ""}`}
            onClick={() => canEdit && setEditing(true)}
            title={canEdit ? "Click to rename" : undefined}
          >
            {title}
          </h1>
        )}
        <RoleBadge role={role} />
      </div>

      {canManage && (
        <button
          onClick={() => setShareOpen(true)}
          className="text-sm px-3 py-1.5 rounded border border-neutral-300 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-black"
        >
          Share
        </button>
      )}

      {shareOpen && <ShareDialog documentId={documentId} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
