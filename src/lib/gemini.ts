import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (!apiKey) return null;
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

export function isAiConfigured(): boolean {
  return Boolean(apiKey);
}


export async function runGeminiPrompt(
  system: string,
  user: string,
  timeoutMs = 20_000
): Promise<string> {
  const ai = getClient();
  if (!ai) throw new Error("AI_NOT_CONFIGURED");

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs);
  });

  const request = ai.models.generateContent({
    model: modelName,
    contents: user,
    config: { systemInstruction: system },
  });

  const response = await Promise.race([request, timeout]);
  const text = response.text;
  if (!text || !text.trim()) throw new Error("AI_EMPTY_RESPONSE");
  return text.trim();
}