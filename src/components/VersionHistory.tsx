import { useEffect, useState } from "react";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";
import { useToast } from "@/components/Toast";

type Version = { id: string; label: string | null; createdAt: string; createdByName: string };

type Props = {
  documentId: string;
  canRestore: boolean;
 
  onRestoreRequested: (versionId: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
    refreshKey: number;
    isRestoringVersionId?: string | null;

};

export default function VersionHistory({
  documentId,
  canRestore,
  onRestoreRequested,
  isOpen,
  onOpenChange,
  refreshKey,
  isRestoringVersionId
}: Props) {
  // console.log("is/Open", isOpen);
  const { show } = useToast();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      console.log("loading versions for documentId", documentId);
      const data = await apiFetch<{ versions: Version[] }>(`/api/documents/${documentId}/versions`);
      setVersions(data.versions ?? []);
      // onOpenChange(false); // close the panel after loading, to avoid showing stale data
    } catch (err) {
      show(err instanceof ApiRequestError ? err.message : "Could not load version history.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [documentId]);

 
  useEffect(() => {
    console.log("isOpen changed to", isOpen);
    if (isOpen) load();
  }, [isOpen]);
  useEffect(() => {
  load();
}, [refreshKey]);

  return (
    <div>
      <button
        onClick={() => onOpenChange(!isOpen)}
        aria-expanded={isOpen}
        className="text-sm font-medium mb-2 flex items-center gap-1 hover:underline focus:outline-none focus:ring-2 focus:ring-black rounded"
      >
        Version history {versions.length > 0 && `(${versions.length})`}
        <span aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen &&
        (loading ? (
          <ul className="space-y-1" aria-label="Loading version history">
            {[0, 1].map((i) => (
              <li key={i} className="h-10 rounded bg-neutral-100 animate-pulse" />
            ))}
          </ul>
        ) : versions.length === 0 ? (
          <p className="text-sm text-neutral-500">No saved versions yet. Use "Save version" above to create one.</p>
        ) : (
          <ul className="space-y-1">
            {versions.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between text-sm border rounded px-3 py-2 bg-white gap-2"
              >
                <span className="truncate">
                  {v.label || "Untitled snapshot"} — {new Date(v.createdAt).toLocaleString()} by {v.createdByName}
                </span>
                {canRestore && (
                  <button
                    onClick={() => onRestoreRequested(v.id)}
                    className="text-blue-600 hover:underline text-sm shrink-0"
                    disabled={isRestoringVersionId === v.id}
                  >
                    {isRestoringVersionId === v.id ? "Restoring…" : "Restore"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}