"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-lg font-medium text-neutral-900">Something went wrong</h1>
          <p className="text-sm text-neutral-500 mt-2">
            An unexpected error occurred. Your local edits are safe — they're saved on this device.
          </p>
          <button
            onClick={reset}
            className="mt-4 px-4 py-2 bg-black text-white rounded text-sm hover:bg-neutral-800"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
