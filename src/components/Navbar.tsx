"use client";

import { signOut } from "next-auth/react";
import { siteConfig } from "@/lib/config";

export default function Navbar({ userEmail }: { userEmail?: string | null }) {
  return (
    <nav className="border-b bg-white">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <a href="/dashboard" className="font-semibold text-neutral-900">
          {siteConfig.appName}
        </a>
        <div className="flex items-center gap-3 text-sm text-neutral-600">
          {userEmail && <span className="hidden sm:inline">{userEmail}</span>}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="px-3 py-1.5 rounded border border-neutral-300 hover:bg-neutral-50"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
