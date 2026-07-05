"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import RoleBadge from "@/components/RoleBadge";

type Collaborator = { userId: string; email: string; name: string | null; role: "EDITOR" | "VIEWER" };
type Owner = { id: string; email: string; name: string | null };

export default function ShareDialog({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const { show } = useToast();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [inviting, setInviting] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Collaborator | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ owner: Owner; collaborators: Collaborator[] }>(
        `/api/documents/${documentId}/access`
      );
      setOwner(data.owner);
      setCollaborators(data.collaborators);
    } catch (err) {
      show(err instanceof ApiRequestError ? err.message : "Could not load collaborators.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      await apiFetch(`/api/documents/${documentId}/access`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      show("Invite sent.", "success");
      setEmail("");
      load();
    } catch (err) {
      show(err instanceof ApiRequestError ? err.message : "Could not invite that person.", "error");
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (userId: string, newRole: "EDITOR" | "VIEWER") => {
    try {
      await apiFetch(`/api/documents/${documentId}/access`, {
        method: "PATCH",
        body: JSON.stringify({ userId, role: newRole }),
      });
      show("Role updated.", "success");
      load();
    } catch (err) {
      show(err instanceof ApiRequestError ? err.message : "Could not update role.", "error");
    }
  };

  const revoke = async () => {
    if (!revokeTarget) return;
    try {
      await apiFetch(`/api/documents/${documentId}/access`, {
        method: "DELETE",
        body: JSON.stringify({ userId: revokeTarget.userId }),
      });
      show("Access removed.", "success");
      setRevokeTarget(null);
      load();
    } catch (err) {
      show(err instanceof ApiRequestError ? err.message : "Could not remove access.", "error");
      setRevokeTarget(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="share-dialog-title" className="font-medium text-neutral-900">
            Share document
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-neutral-500 hover:text-neutral-800">
            ✕
          </button>
        </div>

        <form onSubmit={invite} className="flex flex-col sm:flex-row gap-2 mb-5">
          <label className="sr-only" htmlFor="invite-email">Collaborator email</label>
          <input
            id="invite-email"
            type="email"
            required
            placeholder="Collaborator's email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 border rounded px-3 py-2 text-sm"
          />
          <select
            aria-label="Role to assign"
            value={role}
            onChange={(e) => setRole(e.target.value as "EDITOR" | "VIEWER")}
            className="border rounded px-2 py-2 text-sm"
          >
            <option value="EDITOR">Editor</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <button
            disabled={inviting}
            className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            {inviting ? "Inviting…" : "Invite"}
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-neutral-500">Loading collaborators…</p>
        ) : (
          <div className="space-y-2">
            {owner && (
              <div className="flex items-center justify-between text-sm border rounded px-3 py-2 bg-neutral-50">
                <span>{owner.name || owner.email} (you)</span>
                <RoleBadge role="OWNER" />
              </div>
            )}
            {collaborators.map((c) => (
              <div key={c.userId} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                <span className="truncate mr-2">{c.name || c.email}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    aria-label={`Role for ${c.email}`}
                    value={c.role}
                    onChange={(e) => changeRole(c.userId, e.target.value as "EDITOR" | "VIEWER")}
                    className="border rounded px-1.5 py-1 text-xs"
                  >
                    <option value="EDITOR">Editor</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                  <button
                    onClick={() => setRevokeTarget(c)}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {collaborators.length === 0 && (
              <p className="text-sm text-neutral-500">No collaborators yet — invite someone above.</p>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!revokeTarget}
        title="Remove access?"
        description={`${revokeTarget?.email} will lose access to this document immediately.`}
        confirmLabel="Remove"
        danger
        onConfirm={revoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
