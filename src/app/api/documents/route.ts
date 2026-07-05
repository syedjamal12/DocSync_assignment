import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDocumentSchema } from "@/lib/zodSchemas";
import { withErrorHandling, unauthorized, badRequest } from "@/lib/apiError";
import { rateLimit, clientKey } from "@/lib/rateLimit";

export async function GET() {
  return withErrorHandling(async () => {
    const session = await auth();
    if (!session?.user) throw unauthorized();
    const userId = (session.user as { id: string }).id;

    const docs = await prisma.document.findMany({
      where: { OR: [{ ownerId: userId }, { access: { some: { userId } } }] },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        ownerId: true,
        access: { where: { userId }, select: { role: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const withRole = docs.map((d) => ({
      id: d.id,
      title: d.title,
      updatedAt: d.updatedAt,
      role: d.ownerId === userId ? "OWNER" : d.access[0]?.role ?? "VIEWER",
    }));

    return NextResponse.json({ docs: withRole });
  });
}

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const session = await auth();
    if (!session?.user) throw unauthorized();
    const userId = (session.user as { id: string }).id;

    if (!rateLimit(clientKey(req, `create-doc:${userId}`), 20, 60_000)) {
      throw badRequest("Too many documents created too quickly. Please slow down.");
    }

    const body = await req.json().catch(() => null);
    const parsed = createDocumentSchema.safeParse(body);
    if (!parsed.success) throw badRequest("Please give the document a title.");

    const doc = await prisma.document.create({
      data: { title: parsed.data.title, ownerId: userId },
    });

    return NextResponse.json({ doc }, { status: 201 });
  });
}
