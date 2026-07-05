"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RoleBadge from "@/components/RoleBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";
import { useToast } from "@/components/Toast";

type Doc = { id: string; title: string; updatedAt: string; role: "OWNER" | "EDITOR" | "VIEWER" };

export default function DocumentList({ docs }: { docs: Doc[] }) {
  const router = useRouter();
  const { show } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<Doc | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/documents/${deleteTarget.id}`, { method: "DELETE" });
      show("Document deleted.", "success");
      router.refresh();
    } catch (err) {
      show(err instanceof ApiRequestError ? err.message : "Could not delete document.", "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (docs.length === 0) {
    return (
      <div className="mt-10 text-center border border-dashed rounded-lg py-12 px-4">
        <p className="text-neutral-600 font-medium">No documents yet</p>
        <p className="text-sm text-neutral-500 mt-1">
          Create your first document above to start writing — it works offline too.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="mt-6 space-y-2">
        {docs.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-2 border rounded-lg px-4 py-3 bg-white hover:bg-neutral-50 focus-within:ring-2 focus-within:ring-black"
          >
            <a href={`/doc/${d.id}`} className="min-w-0 flex-1 focus:outline-none">
              <span className="font-medium block truncate">{d.title}</span>
              <span className="text-xs text-neutral-500 block">
                Updated {new Date(d.updatedAt).toLocaleString()}
              </span>
            </a>
            <div className="flex items-center gap-2 shrink-0">
              <RoleBadge role={d.role} />
              {d.role === "OWNER" && (
                <button
                  onClick={() => setDeleteTarget(d)}
                  aria-label={`Delete ${d.title}`}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this document?"
        description={`"${deleteTarget?.title}" and all of its version history will be permanently deleted for everyone with access. This can't be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
