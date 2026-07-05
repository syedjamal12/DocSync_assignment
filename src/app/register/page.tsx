"use client";

import Link from "next/link";
import { Sparkles, FileText, ShieldCheck, ArrowRight, Users, WifiOff, History, Share2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/apiClient";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name: name || undefined }),
      });

      router.push("/login");
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#f5f0ff,transparent_32%),radial-gradient(circle_at_top_right,#eef4ff,transparent_30%),#ffffff] px-4 py-8 text-neutral-950">
      <div className="pointer-events-none absolute right-10 top-36 hidden h-44 w-44 grid-cols-6 gap-3 opacity-40 lg:grid">
        {Array.from({ length: 36 }).map((_, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-violet-400" />
        ))}
      </div>

      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200">
            <FileText size={18} />
          </span>
          <span className="text-xl">DocSync</span>
        </Link>

        <Link
          href="/login"
          className="rounded-xl border border-neutral-200 bg-white/80 px-5 py-2 text-sm font-medium shadow-sm transition hover:border-neutral-300 hover:bg-white"
        >
          Log in
        </Link>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-96px)] max-w-6xl items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-medium text-violet-700">
            <Sparkles size={16} />
            ✨ Local First • AI Powered • Real-Time Collaboration
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
            Write Together.
            <span className="block bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
              Work Anywhere.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-neutral-600">
            DocSync is an AI-powered collaborative editor built for modern teams.
            Work in real time, continue editing offline, restore document versions,
            and collaborate securely from anywhere.
          </p>

          <div className="mt-10 space-y-5">

            <div className="grid gap-4 sm:grid-cols-2">

              <div className="flex items-start gap-3 rounded-2xl border bg-white/80 p-4 shadow-sm">
                <Sparkles className="mt-1 text-violet-600" size={22} />
                <div>
                  <h3 className="font-semibold">AI Writing Assistant</h3>
                  <p className="text-sm text-neutral-500">
                    Summarize, rewrite, improve grammar, shorten and expand text instantly.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border bg-white/80 p-4 shadow-sm">
                <Users className="mt-1 text-violet-600" size={22} />
                <div>
                  <h3 className="font-semibold">Real-time Collaboration</h3>
                  <p className="text-sm text-neutral-500">
                    Multiple users can edit the same document simultaneously.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border bg-white/80 p-4 shadow-sm">
                <WifiOff className="mt-1 text-violet-600" size={22} />
                <div>
                  <h3 className="font-semibold">Offline First</h3>
                  <p className="text-sm text-neutral-500">
                    Continue editing without internet and sync automatically later.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border bg-white/80 p-4 shadow-sm">
                <History className="mt-1 text-violet-600" size={22} />
                <div>
                  <h3 className="font-semibold">Version History</h3>
                  <p className="text-sm text-neutral-500">
                    Save snapshots and restore previous versions anytime.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border bg-white/80 p-4 shadow-sm">
                <Share2 className="mt-1 text-violet-600" size={22} />
                <div>
                  <h3 className="font-semibold">Secure Sharing</h3>
                  <p className="text-sm text-neutral-500">
                    Invite collaborators with Owner, Editor and Viewer permissions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border bg-white/80 p-4 shadow-sm">
                <ShieldCheck className="mt-1 text-violet-600" size={22} />
                <div>
                  <h3 className="font-semibold">Enterprise Security</h3>
                  <p className="text-sm text-neutral-500">
                    Secure authentication and protected document access.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-violet-200/70 via-white to-blue-100/70 blur-2xl" />

          <div className="relative rounded-[1.75rem] border border-neutral-200 bg-white/90 p-6 shadow-2xl shadow-neutral-200/70 backdrop-blur">
            <div className="mb-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
                <FileText size={22} />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Takes less than a minute. Start collaborating today.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  Name
                </label>
                <input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  required
                />
              </div>

              {error && (
                <p
                  className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <button
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Get started for free"}
                {!loading && (
                  <ArrowRight
                    size={16}
                    className="transition group-hover:translate-x-0.5"
                  />
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-neutral-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-violet-600 hover:text-violet-700"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
