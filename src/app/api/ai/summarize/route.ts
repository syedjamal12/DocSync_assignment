import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ text: z.string().min(1).max(20000) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 501 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Summarize the document in 2-3 sentences." },
        { role: "user", content: parsed.data.text },
      ],
    }),
  });
  const data = await res.json();
  const summary = data.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({ summary });
}
