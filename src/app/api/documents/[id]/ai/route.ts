import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRole, canWrite } from "@/lib/roles";
import { buildAiPrompt } from "@/lib/aiActions";
import { runGeminiPrompt, isAiConfigured } from "@/lib/gemini";
import { aiRequestSchema } from "@/lib/zodSchemas";
import { withErrorHandling, unauthorized, forbidden, badRequest, ApiError } from "@/lib/apiError";
import { rateLimit, clientKey } from "@/lib/rateLimit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) throw unauthorized();
    const userId = (session.user as { id: string }).id;

    const role = await getRole(id, userId);
    if (!role) throw forbidden("You don't have access to this document.");
    if (!canWrite(role)) throw forbidden("Viewers can't use AI actions.");

    if (!isAiConfigured()) {
      throw badRequest(
        "AI features aren't configured on this server yet. Set GEMINI_API_KEY (see README)."
      );
    }

   
    if (!rateLimit(clientKey(req, `ai:${userId}`), 15, 60_000)) {
      throw badRequest("Too many AI requests. Please wait a moment and try again.");
    }

    const body = await req.json().catch(() => null);
    const parsed = aiRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw badRequest(parsed.error.errors[0]?.message || "Select some text and choose a valid AI action.");
    }

    const { system, user } = buildAiPrompt(parsed.data.action, parsed.data.text);

    try {
      const result = await runGeminiPrompt(system, user);
      return NextResponse.json({ result });
    } catch (err) {
      const code = err instanceof Error ? err.message : "unknown";
      if (code === "AI_TIMEOUT") throw new ApiError(504, "The AI took too long to respond. Please try again.");
      if (code === "AI_EMPTY_RESPONSE") {
        throw new ApiError(502, "The AI didn't return anything usable. Please try again.");
      }
      console.error("[ai] Gemini request failed:", err);
      throw new ApiError(502, "The AI couldn't process that right now. Please try again.");
    }
  });
}