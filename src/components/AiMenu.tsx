"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { AI_ACTIONS, type AiAction } from "@/lib/aiActions";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";
import { useToast } from "@/components/Toast";
import AiPreviewDialog from "./AiPreviewDialog";
// import AiPreviewDialog from "@/components/AiPreviewDialog";

type SelectionSnapshot = { from: number; to: number; text: string };


function toInsertableContent(text: string) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length <= 1) return text;
  return paragraphs.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] }));
}

export default function AiMenu({ editor, documentId }: { editor: Editor | null; documentId: string }) {
  const { show } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const [liveSelection, setLiveSelection] = useState<SelectionSnapshot | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [captured, setCaptured] = useState<SelectionSnapshot | null>(null);
  const [activeAction, setActiveAction] = useState<AiAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty) {
        setLiveSelection(null);
        setMenuOpen(false);
        return;
      }
      const text = editor.state.doc.textBetween(from, to, "\n");
      if (!text.trim()) {
        setLiveSelection(null);
        setMenuOpen(false);
        return;
      }
      setLiveSelection({ from, to, text });
      try {
        const end = editor.view.coordsAtPos(to);
        setCoords({ top: end.bottom + 8, left: Math.max(8, end.left) });
      } catch {
        setCoords(null);
      }
    };

    editor.on("selectionUpdate", update);
    return () => {
      editor.off("selectionUpdate", update);
    };
  }, [editor]);

  useEffect(() => {
    if (!liveSelection || !editor) return;
    const reposition = () => {
      try {
        const end = editor.view.coordsAtPos(liveSelection.to);
        setCoords({ top: end.bottom + 8, left: Math.max(8, end.left) });
      } catch {
        setLiveSelection(null);
      }
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [liveSelection, editor]);

  // close the menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const runAction = async (action: AiAction) => {
    if (!editor) return;
    if (loading) return; // one in-flight AI request at a time, no duplicates

    if (!liveSelection) {
      show("Select some text first.", "error");
      return;
    }
   
    if (liveSelection.to > editor.state.doc.content.size) {
      show("Your selection is no longer valid — please reselect the text.", "error");
      setLiveSelection(null);
      return;
    }

    setMenuOpen(false);
    setCaptured(liveSelection); // freeze — this is what we send AND what we'll re-verify against later
    setActiveAction(action);
    setLoading(true);
    try {
      const data = await apiFetch<{ result: string }>(`/api/documents/${documentId}/ai`, {
        method: "POST",
        body: JSON.stringify({ action, text: liveSelection.text }),
      });
      setResult(data.result);
    } catch (err) {
      show(err instanceof ApiRequestError ? err.message : "AI request failed. Please try again.", "error");
      setActiveAction(null);
      setCaptured(null);
    } finally {
      setLoading(false);
    }
  };

  const closePreview = () => {
    setResult(null);
    setActiveAction(null);
    setCaptured(null);
  };

  const applyResult = (mode: "replace" | "insert-below") => {
    if (!editor || result === null || !captured) return;
    const { from, to, text } = captured;
    const docSize = editor.state.doc.content.size;
    const content = toInsertableContent(result);

    const clampedFrom = Math.min(from, docSize);
    const clampedTo = Math.min(to, docSize);
    const liveText = editor.state.doc.textBetween(clampedFrom, clampedTo, "\n");
    const stillValid = clampedFrom === from && clampedTo === to && liveText === text;

    if (!stillValid) {
      
      editor.chain().focus().insertContentAt(docSize, content).run();
      show(
        "The original selection changed while the AI was working, so the result was added to the end of the document instead.",
        "info"
      );
      closePreview();
      return;
    }

    if (mode === "replace") {
      editor.chain().focus().insertContentAt({ from, to }, content).run();
      show("Replaced selection with the AI result.", "success");
    } else {
      editor.chain().focus().insertContentAt(to, content).run();
      show("Inserted the AI result below your selection.", "success");
    }
    closePreview();
  };

  if (!editor) return null;

  const activeLabel = AI_ACTIONS.find((a) => a.id === activeAction)?.label ?? "AI";

  return (
    <div ref={containerRef}>
      {liveSelection && coords && !loading && (
        <button
          type="button"
          style={{ position: "fixed", top: coords.top, left: coords.left }}
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="z-30 inline-flex items-center gap-1.5 rounded-full bg-black text-white text-xs font-medium px-3 py-1.5 shadow-lg hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
        >
          <span aria-hidden="true">✨</span> Ask AI
        </button>
      )}

      {loading && coords && (
        <div
          style={{ position: "fixed", top: coords.top, left: coords.left }}
          className="z-30 inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white text-xs font-medium px-3 py-1.5 shadow-lg"
          role="status"
          aria-live="polite"
        >
          <span
            className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin"
            aria-hidden="true"
          />
          {activeLabel}…
        </div>
      )}

      {menuOpen && liveSelection && coords && (
        <div
          style={{ position: "fixed", top: coords.top + 38, left: coords.left }}
          role="menu"
          aria-label="AI actions"
          className="z-30 w-56 rounded-lg border bg-white shadow-xl overflow-hidden"
        >
          {AI_ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="menuitem"
              onClick={() => runAction(a.id)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 focus:outline-none focus:bg-neutral-100"
            >
              <span className="block font-medium text-neutral-900">{a.label}</span>
              <span className="block text-xs text-neutral-500">{a.description}</span>
            </button>
          ))}
        </div>
      )}

      <AiPreviewDialog
        open={result !== null}
        actionLabel={activeLabel}
        original={captured?.text ?? ""}
        result={result ?? ""}
        onReplace={() => applyResult("replace")}
        onInsertBelow={() => applyResult("insert-below")}
        onCancel={closePreview}
      />
    </div>
  );
}