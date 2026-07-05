import { Sparkles, MousePointerClick, Wand2 } from "lucide-react";

export default function AIBanner() {
  return (
    <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 flex-wrap">
 <div className="mb-6 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-violet-600 p-2 text-white">
          <Sparkles size={20} />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-neutral-900">
              AI Writing Assistant
            </h3>

            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
              New
            </span>
          </div>

          <p className="mt-1 text-sm text-neutral-600">
            Highlight any text inside the editor to instantly improve your writing
            with AI.
          </p>

          {/* <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {[
              "Summarize",
              "Rewrite",
              "Grammar",
              "Professional",
              "Expand",
              "Shorten",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-violet-200 bg-white px-3 py-1 text-neutral-700"
              >
                {item}
              </span>
            ))}
          </div> */}

          <div className="mt-4 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-neutral-700 shadow-sm">
            <MousePointerClick size={16} className="text-violet-600" />
            <span>
              Select text → <strong>Ask AI</strong> appears → Choose an action.
            </span>
            <Wand2 size={16} className="ml-auto text-violet-600" />
          </div>
        </div>
      </div>
    </div>
    </div>
   
  );
}