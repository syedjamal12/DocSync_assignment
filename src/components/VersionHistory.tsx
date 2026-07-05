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
    <h3 className="text-sm font-semibold mb-3">
      Version History {versions.length > 0 && `(${versions.length})`}
    </h3>

    {loading ? (
      <ul className="space-y-1" aria-label="Loading version history">
        {[0, 1].map((i) => (
          <li
            key={i}
            className="h-10 rounded bg-neutral-100 animate-pulse"
          />
        ))}
      </ul>
    ) : versions.length === 0 ? (
      <p className="text-sm text-neutral-500">
        No saved versions yet. Use "Save version" above to create one.
      </p>
    ) : (
      <ul className="space-y-1">
        {versions.map((v) => (
          <li
            key={v.id}
            className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2 text-sm"
          >
            <span className="truncate">
              {v.label || "Untitled snapshot"} —{" "}
              {new Date(v.createdAt).toLocaleString()} by {v.createdByName}
            </span>

            {canRestore && (
              <button
                onClick={() => onRestoreRequested(v.id)}
                className="shrink-0 text-sm text-blue-600 hover:underline"
                disabled={isRestoringVersionId === v.id}
              >
                {isRestoringVersionId === v.id
                  ? "Restoring..."
                  : "Restore"}
              </button>
            )}
          </li>
        ))}
      </ul>
    )}
  </div>
);
}