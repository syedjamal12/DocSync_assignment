import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { siteConfig } from "@/lib/config";

export const metadata = {
  title: siteConfig.appName,
  description: "A local-first, collaborative document editor with offline sync and version history.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-50 min-h-screen flex flex-col">
        <ToastProvider>
          <div className="flex-1">{children}</div>
          <footer className="mt-auto border-t border-neutral-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 text-sm text-neutral-600 md:flex-row">

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 text-white font-bold shadow-lg">
                  D
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-900">DocSync</h3>
                  <p className="text-xs text-neutral-500">
                    AI Powered • Real-Time • Offline First
                  </p>
                </div>
              </div>

              <div className="text-center text-xs text-neutral-500">
                © {new Date().getFullYear()} Built with ❤️ by{" "}
                <span className="font-medium text-neutral-800">
                  {siteConfig.authorName}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <a
                  href={siteConfig.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-neutral-200 px-4 py-2 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                >
                  GitHub
                </a>

                <a
                  href={siteConfig.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-neutral-200 px-4 py-2 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
