import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/zodSchemas";
import { withErrorHandling, badRequest, conflict } from "@/lib/apiError";
import { rateLimit, clientKey } from "@/lib/rateLimit";

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    if (!rateLimit(clientKey(req, "register"), 5, 60_000)) {
      throw badRequest("Too many attempts. Please wait a minute and try again.");
    }

    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw badRequest(parsed.error.errors[0]?.message || "Invalid registration details.");
    }
    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict("An account with this email already exists.");

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  });
}
