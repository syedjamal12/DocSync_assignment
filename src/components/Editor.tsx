"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { yXmlFragmentToProseMirrorRootNode } from "y-prosemirror";
import ConnectionStatus, { type SyncStatus } from "@/components/ConnectionStatus";
import VersionHistory from "@/components/VersionHistory";
import PromptDialog from "@/components/PromptDialog";
import RestoreConflictDialog from "@/components/RestoreConflictDialog";
import AiMenu from "@/components/AiMenu";
import { useToast } from "@/components/Toast";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";
import { useRouter } from "next/navigation";

type Role = "OWNER" | "EDITOR" | "VIEWER";

type Props = {
  documentId: string;
  role: Role;
  syncToken: string;
  userName: string;
};

const randomColor = () => `hsl(${Math.floor(Math.random() * 360)}, 65%, 45%)`;

export default function Editor({ documentId, role, syncToken, userName }: Props) {
  const { show } = useToast();
  const [status, setStatus] = useState<SyncStatus>("connecting");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [versionRefreshKey, setVersionRefreshKey] = useState(0);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);


  const baselineStateRef = useRef<string | null>(null);

  const [currentRole, setCurrentRole] = useState<Role>(role);
  const editable = currentRole !== "VIEWER";

  const tokenRef = useRef(syncToken);

  const ydoc = useMemo(() => new Y.Doc(), [documentId]);

 
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const persistence = new IndexeddbPersistence(documentId, ydoc);
    persistenceRef.current = persistence;

    return () => {
      persistence.destroy();
      persistenceRef.current = null;
    };
  }, [documentId, ydoc]);

 console.log("SYNC URL:", process.env.NEXT_PUBLIC_SYNC_URL);
  const provider = useMemo(
    () =>
      new HocuspocusProvider({
        url: process.env.NEXT_PUBLIC_SYNC_URL as string,
        name: documentId,
        document: ydoc,
        token: tokenRef.current,
        onAuthenticationFailed: async ({ reason }) => {
          try {
            const data = await apiFetch<{ syncToken: string }>(`/api/documents/${documentId}`);
            tokenRef.current = data.syncToken;
            provider.configuration.token = data.syncToken;
            provider.connect();
          } catch {
            setStatus("error");
            show(`Couldn't reconnect: ${reason}. Try refreshing the page.`, "error");
          }
        },
      }),
    [documentId, ydoc]
  );

  useEffect(() => {
    const updateOnlineState = () => {
      if (navigator.onLine) {
        provider.connect();
        setStatus("connecting");
      } else {
        provider.disconnect();
        setStatus("offline");
      }
    };

    updateOnlineState();

    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);

    const onStatus = (e: { status: string }) => {
      if (!navigator.onLine) {
        setStatus("offline");
        return;
      }
      setStatus(e.status === "connected" ? "syncing" : "connecting");
    };

    const onSynced = () => {
      if (navigator.onLine) {
        setStatus("synced");
      }
    };

    const onDisconnect = () => {
      setStatus(navigator.onLine ? "connecting" : "offline");
    };

    const onClose = ({ event }: { event: CloseEvent }) => {
      if (event.code !== 1000) {
        setStatus("error");
        show("Lost connection to the server — retrying in the background.", "error");
      }
    };

    provider.on("status", onStatus);
    provider.on("synced", onSynced);
    provider.on("disconnect", onDisconnect);
    provider.on("close", onClose);

    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);

      provider.off("status", onStatus);
      provider.off("synced", onSynced);
      provider.off("disconnect", onDisconnect);
      provider.off("close", onClose);

      provider.destroy();
      persistenceRef.current?.destroy();
    };
  }, [provider, show]);

  
 useEffect(() => {
  const checkRole = async () => {
    // Don't do anything while offline
    if (!navigator.onLine) return;

    try {
      const data = await apiFetch<{ role: Role; syncToken: string }>(
        `/api/documents/${documentId}`
      );
      // console.log("checkRole: currentRole", currentRole, "serverRole", data);  

      setCurrentRole((prev) => {
        if (prev !== data.role) {
          tokenRef.current = data.syncToken;
          provider.configuration.token = data.syncToken;
          provider.disconnect();
          provider.connect();

          show(
            data.role === "VIEWER"
              ? "Your access changed to view-only."
              : `Your access changed to ${data.role.toLowerCase()}.`,
            "info"
          );

          router.refresh();
        }

        return data.role;
      });
    } catch (err) {
  if (
    err instanceof ApiRequestError &&
    err.message === "You don't have access to this document."
  ) {
    router.refresh();
    return;
  }

  // Ignore offline / transient network errors
}
  };

  const interval = setInterval(() => {
    if (navigator.onLine) {
      checkRole();
    }
  }, 8000);

  const handleFocus = () => {
    if (navigator.onLine) {
      checkRole();
    }
  };

  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleFocus);

  return () => {
    clearInterval(interval);
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleFocus);
  };
}, [documentId, provider, show, router]);

  const editor = useEditor(
    {
      editable,
      extensions: [
        StarterKit.configure({ history: false }),
        Collaboration.configure({ document: ydoc }),
        CollaborationCursor.configure({
          provider,
          user: { name: userName, color: randomColor() },
        }),
      ],
      immediatelyRender: false,
      editorProps: {
        attributes: { "aria-label": "Document content", role: "textbox", "aria-multiline": "true" },
      },
    },
    // `editable` deliberately excluded — see effect below
    [ydoc, provider]
  );

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  const handleRestore = useCallback(
    (base64State: string) => {
      if (!editor) return;
      try {
        const snapshotDoc = new Y.Doc();
        Y.applyUpdate(snapshotDoc, new Uint8Array(Buffer.from(base64State, "base64")));

        const fragment = snapshotDoc.getXmlFragment("default");
        const node = yXmlFragmentToProseMirrorRootNode(fragment, editor.schema);

        editor.commands.setContent(node.toJSON(), false);

        snapshotDoc.destroy();
        show("Document restored to the selected version.", "success");
      } catch (err) {
        console.error(err);
        show("Could not restore this version.", "error");
      }
    },
    [editor, show]
  );

  const handleSaveVersion = async (label?: string) => {
    setSaving(true);
    try {
      const state = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString("base64");
      await apiFetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        body: JSON.stringify({ label: label || undefined, state }),
      });
      // DIRTY-STATE FIX: a successful save IS a new clean baseline.
      baselineStateRef.current = state;
      setIsVersionHistoryOpen(true);
      setVersionRefreshKey((prev) => prev + 1);
      show("Version saved.", "success");
    } catch (err) {
      show(err instanceof ApiRequestError ? err.message : "Could not save version.", "error");
      throw err; // let callers (e.g. save-then-restore) know it failed
    } finally {
      setSaving(false);
      setSaveDialogOpen(false);
    }
  };

  // Fetches a version's bytes and applies it — no unsaved-changes check here,
  // this is the "just do it" step called once that check has already passed.
  const performRestore = useCallback(
    async (versionId: string) => {
      try {
        const data = await apiFetch<{ state: string }>(
          `/api/documents/${documentId}/versions/${versionId}/restore`,
          { method: "POST" }
        );
        handleRestore(data.state);
        // DIRTY-STATE FIX: a restore also establishes a new clean baseline —
        // the just-restored content, not whatever was last saved to the DB.
        baselineStateRef.current = data.state;
      } catch (err) {
        show(err instanceof ApiRequestError ? err.message : "Could not restore this version.", "error");
      }
    },
    [documentId, handleRestore, show]
  );

  // DATA-LOSS FIX (+ DIRTY-STATE FIX): compares the current live document
  // against the last known CLEAN BASELINE — which is set after every save
  // and every restore, not just "whatever the latest saved version happens
  // to be". Only genuine edits since that baseline count as unsaved changes.
  const requestRestore = useCallback(
    async (versionId: string) => {
      try {
        setRestoringVersionId(versionId);
        const currentBytes = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString("base64");

        let hasUnsavedChanges: boolean;

        if (baselineStateRef.current !== null) {
          // a save or restore already happened this session — trust that as
          // the clean baseline instead of re-checking the server every time
          hasUnsavedChanges = baselineStateRef.current !== currentBytes;
        } else {
          // no local baseline yet (first restore-check this session) — fall
          // back to the latest saved version on the server, and cache it as
          // the baseline so subsequent clicks don't need this round-trip
          const list = await apiFetch<{ versions: { id: string }[] }>(
            `/api/documents/${documentId}/versions`
          );
          const latestId = list.versions[0]?.id;
          if (latestId) {
            const latest = await apiFetch<{ state: string }>(
              `/api/documents/${documentId}/versions/${latestId}/restore`,
              { method: "POST" }
            );
            baselineStateRef.current = latest.state;
            hasUnsavedChanges = latest.state !== currentBytes;
          } else {
            hasUnsavedChanges = true;
          }
        }

        setRestoringVersionId(null);

        if (hasUnsavedChanges) {
          setPendingRestoreId(versionId);
        } else {
          await performRestore(versionId);
        }
      } catch {
        show("Could not check for unsaved changes — restore cancelled.", "error");
        setRestoringVersionId(null);
      }
    },
    [documentId, ydoc, show, performRestore]
  );

  const confirmSaveAndRestore = async () => {
    if (!pendingRestoreId) return;
    setRestoreBusy(true);
    try {
      await handleSaveVersion();
      await performRestore(pendingRestoreId);
    } catch {
      setRestoreBusy(false);
      return;
    }
    setRestoreBusy(false);
    setPendingRestoreId(null);
  };

  const confirmDiscardAndRestore = async () => {
    if (!pendingRestoreId) return;
    setRestoreBusy(true);
    await performRestore(pendingRestoreId);
    setRestoreBusy(false);
    setPendingRestoreId(null);
  };

  const cancelRestore = () => setPendingRestoreId(null);

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-0">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <ConnectionStatus status={status} />
        {editable && (
          <button
            onClick={() => setSaveDialogOpen(true)}
            className="text-sm px-3 py-1.5 rounded bg-black text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
          >
            Save version
          </button>
        )}
      </div>

      <PromptDialog
        open={saveDialogOpen}
        title="Save version"
        placeholder='Label (optional) - e.g. "Before rewrite"'
        confirmLabel={saving ? "Saving…" : "Save"}
        onConfirm={handleSaveVersion}
        onCancel={() => setSaveDialogOpen(false)}
      />

      <RestoreConflictDialog
        open={!!pendingRestoreId}
        busy={restoreBusy}
        onSaveAndRestore={confirmSaveAndRestore}
        onDiscardAndRestore={confirmDiscardAndRestore}
        onCancel={cancelRestore}
      />

      <div className="border rounded-lg bg-white shadow-sm">
        <EditorContent editor={editor} />
      </div>

      {editable && <AiMenu editor={editor} documentId={documentId} />}

      {!editable && (
        <p className="text-sm text-neutral-500 mt-2" role="note">
          You have view-only access to this document.
        </p>
      )}

      <div className="mt-6">
        <VersionHistory
          documentId={documentId}
          canRestore={editable}
          onRestoreRequested={requestRestore}
          isOpen={isVersionHistoryOpen}
          onOpenChange={setIsVersionHistoryOpen}
          refreshKey={versionRefreshKey}
          isRestoringVersionId={restoringVersionId}
        />
      </div>
    </div>
  );
}