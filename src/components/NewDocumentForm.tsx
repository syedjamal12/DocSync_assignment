"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";
import { useToast } from "@/components/Toast";

export default function NewDocumentForm() {
  const router = useRouter();
  const { show } = useToast();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const data = await apiFetch<{ doc: { id: string } }>("/api/documents", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      router.push(`/doc/${data.doc.id}`);
    } catch (err) {
      show(err instanceof ApiRequestError ? err.message : "Could not create document.", "error");
      setCreating(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
      <label htmlFor="new-doc-title" className="sr-only">New document title</label>
      <input
        id="new-doc-title"
        placeholder="New document title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
      />
      <button
        disabled={creating}
        className="bg-black text-white rounded px-4 py-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
      >
        {creating ? "Creating…" : "Create"}
      </button>
    </form>
  );
}
