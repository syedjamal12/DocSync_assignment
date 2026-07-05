# DocSync — Local-first Collaborative Document Editor

A collaborative rich-text editor that works fully offline, syncs automatically
when the network comes back, resolves conflicts deterministically, and keeps
a browsable, restorable version history — built for the House of Edtech
Fullstack Developer assignment (v2.1).



---

## 1. Architecture overview

There are two separate runtimes, and that split is intentional:

```
┌─────────────────────────┐        ┌──────────────────────────┐        ┌──────────────┐
│   Browser (client)      │        │  Sync server (Hocuspocus) │        │  PostgreSQL  │
│                          │  WS    │                            │  SQL   │ (Supabase)   │
│ Tiptap editor            │◄──────►│ Auth + role check          │◄──────►│ documents    │
│ Yjs CRDT doc             │        │ CRDT merge (Yjs)           │        │ access       │
│ y-indexeddb (local store)│        │ Validate + persist         │        │ versions     │
└─────────────────────────┘        └──────────────────────────┘        └──────────────┘
        ▲
        │ HTTP (Next.js API routes)
        ▼
   Auth, document CRUD, sharing, version metadata
```

- **Next.js app** (`src/app`) — everything that isn't real-time: auth, dashboard,
  document metadata CRUD, sharing/roles, version history API.
- **Standalone Hocuspocus server** (`server/hocuspocus-server.ts`) — the only
  thing that touches the live WebSocket connection. It's a separate Node
  process because Vercel's serverless functions cannot hold a persistent
  WebSocket connection open; this server is deployed independently (Railway/
  Fly.io/Render) and talks to the *same* Postgres database via Prisma.

Both processes share the same Prisma schema and the same JWT signing secret
(`SYNC_JWT_SECRET`), which is how a request that authenticated via NextAuth on
the Next.js side can prove its identity to the separate sync server.

## 2. Local-first approach

Every open document gets one `Y.Doc` (a Yjs CRDT document) in the browser.
`y-indexeddb` persists that doc to the browser's IndexedDB on every change,
before any network involvement. This means:

- Opening, typing, and closing a document produces **zero blocking network
  requests** — the UI never waits on a server round-trip.
- If the tab is closed and reopened while offline, the last local state loads
  instantly from IndexedDB.
- The `HocuspocusProvider` (the sync client) is layered *on top* of the same
  `Y.Doc`. When it's connected, local changes stream out and remote changes
  stream in; when it's not, the doc just keeps accumulating local Yjs updates
  that get sent the moment a connection is available.

## 3. Synchronization flow

1. Client connects to the Hocuspocus server over WebSocket with a short-lived
   JWT (`SYNC_JWT_SECRET`, 5 minute expiry) obtained from `GET /api/documents/[id]`.
2. Server's `onAuthenticate` hook verifies the JWT, looks up the caller's role
   for that document (`OWNER`/`EDITOR`/`VIEWER`), and returns `readOnly: true`
   for viewers — Hocuspocus then refuses to apply any updates that connection
   sends, which is what actually enforces "viewers can't push writes."
3. `onLoadDocument` loads the latest persisted binary state from
   `Document.state` into the in-memory Yjs doc the first time it's opened on
   that server process.
4. As users type, Yjs updates are broadcast to every connected client for
   that document (real-time collaboration) and periodically debounced to
   `onStoreDocument`, which persists the merged state back to Postgres.
5. **Reconnection / token expiry:** if the 5-minute token expires mid-session
   (e.g. laptop was asleep), `onAuthenticationFailed` fires client-side, which
   fetches a fresh token from `/api/documents/[id]` and reconnects — the user
   never sees this happen.
6. **Going offline:** `navigator.onLine` plus the provider's own `status`/
   `disconnect`/`close` events drive a single `SyncStatus` state machine
   (`offline` → `connecting` → `syncing` → `synced`, or `error` on an
   unexpected socket close) shown as a colored dot + label in the editor.

## 4. Conflict resolution strategy

Conflict resolution is delegated entirely to **Yjs**, a CRDT (Conflict-free
Replicated Data Type) implementation:

- Every edit becomes a small, self-describing update that can be applied to
  any replica of the document in any order and any number of times
  (**commutative** and **idempotent**), and the result is always the same
  regardless of the order updates arrive in (**deterministic**).
- Two users editing offline and reconnecting later simply exchange their
  accumulated updates — Yjs merges character-level insertions/deletions
  without a "last write wins" data-loss risk the way naive diff/patch would.
- **Version restore** goes through the editor's own transaction system
  (`editor.commands.setContent`, in `Editor.tsx`'s `handleRestore`), not a
  raw `Y.applyUpdate` merge — a snapshot's Yjs update is decoded into a
  scratch `Y.Doc`, converted to a ProseMirror node, and applied as a real
  editor transaction. That transaction becomes proper CRDT operations under
  the hood and propagates to every collaborator through the normal sync
  path, the same as any other edit. (Raw `Y.applyUpdate` merging doesn't
  work for "restore to an older snapshot" specifically: Yjs updates are
  additive, so merging an *older* snapshot into a doc that already contains
  *newer* insertions changes nothing — there's nothing to "un-insert".)
- **Unsaved-changes protection before restore:** before applying a restore,
  the client compares the live document against the last known clean
  baseline (set after every save *and* every restore this session — see
  `baselineStateRef` in `Editor.tsx`). If there's unsaved work, it prompts
  via `RestoreConflictDialog` to save-then-restore or discard-and-restore,
  rather than silently discarding it.

## 5. Version history

- Any Editor/Owner can click **Save version** to snapshot
  `Y.encodeStateAsUpdate(ydoc)` (base64) to `POST /api/documents/[id]/versions`.
- The list view (`GET .../versions`) only ever returns metadata — id, label,
  timestamp, author — never the binary payload, to keep the history list fast.
- **Restore** is a confirm-gated action (see conflict resolution above) that
  merges rather than overwrites.

## 6. AI writing assistant (Gemini)

An optional, good-to-have feature per the assignment brief — off by default,
enabled by setting `GEMINI_API_KEY`.

**Where it lives:** select any text inside the editor and a small **✨ Ask AI**
button appears next to the selection (`src/components/AiMenu.tsx`) — a
contextual menu, not a separate chatbot panel. It offers six actions:
Summarize, Rewrite, Improve grammar, Make professional, Expand, Shorten.

**Workflow:**
1. Select text → click **Ask AI** → pick an action.
2. A loading pill replaces the button while the request is in flight
   (`role="status"`, `aria-live="polite"`); the menu is disabled against
   duplicate clicks for the duration of that request.
3. The result opens in `AiPreviewDialog` — original selection and AI output
   shown side by side. **The document is never touched automatically.** The
   user explicitly picks **Replace selection**, **Insert below**, or
   **Cancel**.

**Server side** (`src/app/api/documents/[id]/ai/route.ts`):
- Scoped to a specific document and run through the *exact same*
  `getRole()`/`canWrite()` check as every other write path — Viewers can't
  invoke AI edits, consistent with them not being able to type.
- Requests are Zod-validated (`aiRequestSchema`) and capped at 8,000
  characters of selected text.
- Rate-limited harder than ordinary API routes (`15/min` per user) since this
  hits a paid external API.
- `src/lib/gemini.ts` is the only place the `GEMINI_API_KEY` is read — it's a
  server-only module (never imported from a `"use client"` file) using the
  official `@google/genai` SDK, with a hard 20s timeout so one slow upstream
  call can't hang the route indefinitely. `src/lib/aiActions.ts` holds the
  six prompts and is safe to share with the client (menu labels only — no
  secrets).

**Race-condition handling (the part this assignment specifically asks
about):** in a real-time collaborative editor, the selected text's numeric
position can shift *while the AI request is in flight* — a remote
collaborator could insert or delete text elsewhere in the document during
that round-trip. `AiMenu.tsx` freezes the exact `{from, to, text}` snapshot
at request time and, right before applying **Replace**/**Insert below**,
re-reads the *live* document at those same positions and compares it against
what was actually sent to Gemini. If anything changed, it doesn't guess —
it falls back to appending the result at the end of the document and tells
the user why, rather than risking silently corrupting or misplacing content.

**Setup:** get a free API key from
[aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey),
set `GEMINI_API_KEY` in `.env`. Nothing else to configure — the feature
degrades gracefully (a clear "AI features aren't configured" error, not a
crash) if the key is absent.

## 7. Roles & authorization

Roles are **per-document**, not global (`DocumentAccess` table), matching the
assignment's Owner/Editor/Viewer requirement:

| Role   | Read | Edit content | Save/restore versions | Manage sharing | Delete doc |
|--------|:----:|:-------------:|:----------------------:|:--------------:|:----------:|
| Owner  | ✅   | ✅            | ✅                      | ✅              | ✅         |
| Editor | ✅   | ✅            | ✅                      | ❌              | ❌         |
| Viewer | ✅   | ❌            | ❌                      | ❌              | ❌         |

Authorization is checked **twice, independently**, since the two servers
don't trust each other's runtime state:
- Every Next.js API route calls `getRole()` (`src/lib/roles.ts`) and rejects
  before touching Prisma — this is our "ORM scoping" / tenant-isolation layer,
  since raw Prisma access has no built-in row-level security.
- The Hocuspocus server does its own independent `getRole`-equivalent lookup
  in `onAuthenticate` — a valid NextAuth session alone is not sufficient to
  write to the socket; the JWT plus a live DB role check both have to pass.

Sharing: the owner opens **Share** on a document, enters a collaborator's
email and picks Editor/Viewer, which upserts a `DocumentAccess` row. (Known
simplification: the invitee must already have an account — there's no
email-invite-a-non-user flow. A production version would send an email with
a signup link that auto-grants access on registration.)

## 8. Security & validation

- **Zod** validates every API request body (`src/lib/zodSchemas.ts`) — bad
  shape/type/length is rejected with a 400 before it reaches Prisma.
- **Size cap on sync payloads:** any Yjs update over `MAX_UPDATE_BYTES` (2MB)
  is rejected both when saving a version (`createVersionSchema`'s `refine`)
  and when persisting live sync state (`onStoreDocument` in the Hocuspocus
  server) — this is the direct mitigation for "malicious payload that OOMs
  the server": oversized updates are dropped/logged, never buffered further.
- **Rate limiting** (`src/lib/rateLimit.ts`, in-memory sliding window) on
  registration, document creation, and version saves, to blunt scripted abuse.
  Noted in code as a single-process solution — swap for Redis/Upstash behind
  a load balancer.
- **Centralized API error handling** (`src/lib/apiError.ts`): route handlers
  throw typed errors (`unauthorized()`, `forbidden()`, `notFound()`, etc.)
  and `withErrorHandling` converts them into consistent JSON responses,
  logging unexpected errors server-side without leaking internals to the client.
- **Auth:** NextAuth (Auth.js v5) Credentials provider, bcrypt-hashed
  passwords, JWT session strategy.

## 9. UI/UX

- Toast notifications (`src/components/Toast.tsx`) for every async
  success/failure instead of silent failures or blocking `alert()`s.
- Accessible confirm dialogs (`ConfirmDialog.tsx`) for destructive/impactful
  actions: deleting a document, revoking access, restoring a version — no
  native `confirm()`/`prompt()` left in the UI.
- Route-level `loading.tsx` skeletons for the dashboard and document view.
- `global-error.tsx` reassures the user their local edits are safe (they're
  in IndexedDB) even if something else on the page crashes.
- Responsive layout (stacked forms/buttons on small screens via `flex-wrap`),
  focus-visible rings on all interactive elements, `aria-live` on the sync
  status indicator and toasts, `role="dialog"`/`aria-modal` on modals.

## 10. Project structure

```
src/
  app/
    api/
      auth/                      # NextAuth handler + register
      documents/                 # CRUD, per-doc access, versions, restore, ai
        [id]/ai/                 # Gemini-backed AI actions (role-checked, rate-limited)
    dashboard/                   # document list, create, delete
    doc/[id]/                    # editor page
    login/ register/
  components/                    # Editor, ShareDialog, VersionHistory, Toast, ConfirmDialog, ...
    AiMenu.tsx                    # contextual "Ask AI" selection menu
    AiPreviewDialog.tsx           # review/replace/insert-below/cancel
  lib/                           # prisma client, auth config, roles, zod schemas, rate limiter, api helpers
    aiActions.ts                  # shared AI action catalog + prompts (no secrets)
    gemini.ts                     # server-only Gemini client (the ONLY file reading GEMINI_API_KEY)
server/
  hocuspocus-server.ts           # standalone real-time sync server
prisma/
  schema.prisma
```

---

## 11. Setup

### Get Postgres from Supabase (5 min)
1. supabase.com → New project (any name/region, set a DB password).
2. Project Settings → Database → Connection string → copy the **pooled URI**
   (port 6543) into `DATABASE_URL`, and the **direct connection** (port 5432)
   into `DIRECT_URL`.
3. `cp .env.example .env` and fill in both.
4. Generate secrets:
   ```bash
   openssl rand -base64 32   # NEXTAUTH_SECRET
   openssl rand -base64 32   # SYNC_JWT_SECRET
   ```
5. Fill in `NEXT_PUBLIC_AUTHOR_NAME`, `NEXT_PUBLIC_GITHUB_URL`,
   `NEXT_PUBLIC_LINKEDIN_URL` (shown in the footer, required by the assignment).
6. Optional — for the AI writing assistant: get a free key from
   [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
   and set `GEMINI_API_KEY`. Leave it blank to run without that feature.

### Install + push schema
```bash
npm install
npm run db:push
```

### Run (two processes)
```bash
npm run dev            # terminal 1 — Next.js app on :3000
npm run sync-server    # terminal 2 — Hocuspocus sync server on :1234
```

### Try it out
- Register two accounts. From account A, create a document, click **Share**,
  invite account B as Viewer, and confirm B can see it but can't type.
- Open the same doc in two windows logged in as the same or different users
  to see real-time collaboration and cursors.
- DevTools → Network → "Offline", keep typing, reload the page (still there),
  go back online and watch the status dot go offline → connecting → syncing → synced.
- Save a version, make more edits, then Restore — confirm nothing gets wiped.
- If `GEMINI_API_KEY` is set: select a sentence, click **✨ Ask AI**, try
  each action, and confirm the document doesn't change until you click
  Replace or Insert below.

## 12. Deployment

- **Next.js app** → Vercel. Add every `.env` variable except
  `SYNC_SERVER_PORT` in the Vercel dashboard.
- **Sync server** → Railway/Fly.io/Render as a persistent Node service.
  Start command: `npm run sync-server`. It needs `DATABASE_URL`, `DIRECT_URL`,
  and `SYNC_JWT_SECRET`.
- Set `NEXT_PUBLIC_SYNC_URL` on Vercel to `wss://<your-sync-server-domain>`
  (note `wss`, not `ws`, once it's behind TLS) and redeploy.

## 13. Known limitations / what a real production version would add next
- Sharing requires the invitee to already have an account (no email invites).
- Rate limiting is in-memory and per-process; move to Redis for multi-instance deploys.
- No automated test suite yet (`npm test` is wired to Vitest, but no specs are
  written) — priority targets would be the CRDT merge/restore path and the
  role-authorization checks on every API route.
- The AI writing assistant (§6) is scoped to plain-text transforms of a
  selection; it doesn't (yet) have document-wide context/chat, and its
  race-condition guard falls back to "append at the end" rather than a full
  operational-transform rebase — a reasonable, clearly-communicated trade-off
  for a good-to-have feature, not a silent one.