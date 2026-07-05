import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRole, canWrite } from "@/lib/roles";
import { createVersionSchema } from "@/lib/zodSchemas";
import { withErrorHandling, unauthorized, forbidden, badRequest } from "@/lib/apiError";
import { rateLimit, clientKey } from "@/lib/rateLimit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) throw unauthorized();
    const userId = (session.user as { id: string }).id;

    const role = await getRole(id, userId);
    if (!role) throw forbidden("You don't have access to this document.");

    // never send the binary state in the list view — just metadata
    const versions = await prisma.documentVersion.findMany({
      where: { documentId: id },
      select: {
        id: true,
        label: true,
        createdAt: true,
        createdBy: true,
        creator: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      versions: versions.map((v) => ({
        id: v.id,
        label: v.label,
        createdAt: v.createdAt,
        createdByName: v.creator?.name || v.creator?.email || "Unknown",
      })),
    });
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) throw unauthorized();
    const userId = (session.user as { id: string }).id;

    const role = await getRole(id, userId);
    if (!role) throw forbidden("You don't have access to this document.");
    if (!canWrite(role)) throw forbidden("Viewers cannot save versions.");

    if (!rateLimit(clientKey(req, `save-version:${userId}`), 30, 60_000)) {
      throw badRequest("Too many versions saved too quickly. Please slow down.");
    }

    const body = await req.json().catch(() => null);
    const parsed = createVersionSchema.safeParse(body);
    if (!parsed.success) throw badRequest("That snapshot couldn't be validated — try again.");

    const version = await prisma.documentVersion.create({
      data: {
        documentId: id,
        label: parsed.data.label,
        state: Buffer.from(parsed.data.state, "base64"),
        createdBy: userId,
      },
      select: { id: true, label: true, createdAt: true },
    });

    return NextResponse.json({ version }, { status: 201 });
  });
}
