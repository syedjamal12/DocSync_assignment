

export const AI_ACTION_IDS = [
  "summarize",
  "rewrite",
  "improve_grammar",
  "make_professional",
  "expand",
  "shorten",
] as const;

export type AiAction = (typeof AI_ACTION_IDS)[number];

export const AI_ACTIONS: { id: AiAction; label: string; description: string }[] = [
  { id: "summarize", label: "Summarize", description: "Condense into a short summary" },
  { id: "rewrite", label: "Rewrite", description: "Rephrase while keeping the meaning" },
  { id: "improve_grammar", label: "Improve grammar", description: "Fix grammar & spelling" },
  { id: "make_professional", label: "Make professional", description: "Formal, polished tone" },
  { id: "expand", label: "Expand", description: "Add more detail" },
  { id: "shorten", label: "Shorten", description: "Make more concise" },
];

const INSTRUCTIONS: Record<AiAction, string> = {
  summarize:
    "Summarize the following text concisely, capturing only the key points.",
  rewrite:
    "Rewrite the following text to improve clarity and flow while preserving its original meaning and approximate length.",
  improve_grammar:
    "Correct any grammar, spelling, and punctuation mistakes in the following text without changing its meaning, tone, or structure.",
  make_professional:
    "Rewrite the following text in a more formal, professional tone suitable for business communication.",
  expand:
    "Expand the following text with additional relevant detail, examples, or explanation, roughly doubling its length while staying strictly on topic.",
  shorten:
    "Shorten the following text to be more concise while preserving its key meaning.",
};

const SYSTEM_INSTRUCTION =
  "You are a writing assistant embedded in a collaborative document editor. " +
  "Follow the instruction exactly and respond with ONLY the transformed text — " +
  "no explanations, no markdown code fences, no quotation marks wrapping the output, " +
  "no preamble like 'Here is...'.";

export function buildAiPrompt(action: AiAction, text: string): { system: string; user: string } {
  return {
    system: SYSTEM_INSTRUCTION,
    user: `${INSTRUCTIONS[action]}\n\n---\n${text}\n---`,
  };
}