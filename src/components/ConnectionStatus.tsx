"use client";

export type SyncStatus = "offline" | "connecting" | "syncing" | "synced" | "error";

const CONFIG: Record<SyncStatus, { color: string; label: string }> = {
  offline: { color: "bg-neutral-400", label: "Offline — editing locally, will sync when back online" },
  connecting: { color: "bg-yellow-500 animate-pulse", label: "Connecting…" },
  syncing: { color: "bg-yellow-500 animate-pulse", label: "Syncing changes…" },
  synced: { color: "bg-green-500", label: "Synced" },
  error: { color: "bg-red-500", label: "Sync error — retrying…" },
};

export default function ConnectionStatus({ status }: { status: SyncStatus }) {
  const { color, label } = CONFIG[status];
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-600" role="status" aria-live="polite">
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
