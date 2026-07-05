"use client";

import Link from "next/link";
import { ArrowRight, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("That email or password doesn't match our records.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
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
          href="/register"
          className="rounded-xl bg-neutral-950 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800"
        >
          Get started
        </Link>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-96px)] max-w-6xl items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-medium text-violet-700">
            <Sparkles size={16} />
            AI-Powered Collaborative Editor
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
            Welcome back.
            <span className="block bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
              Keep writing.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-neutral-600">
            Log in to continue editing your documents, manage collaborators,
            restore versions, and use AI-powered writing tools.
          </p>

          <div className="mt-8 grid gap-4 text-sm text-neutral-600 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm">
              <ShieldCheck className="mb-3 text-violet-600" size={22} />
              Secure login
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm">
              <Sparkles className="mb-3 text-violet-600" size={22} />
              AI tools
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm">
              <FileText className="mb-3 text-violet-600" size={22} />
              Your documents
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
                Log in to DocSync
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Continue where you left off.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4" noValidate>
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
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                {loading ? "Logging in..." : "Log in"}
                {!loading && (
                  <ArrowRight
                    size={16}
                    className="transition group-hover:translate-x-0.5"
                  />
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-neutral-500">
              No account?{" "}
              <Link
                href="/register"
                className="font-medium text-violet-600 hover:text-violet-700"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
