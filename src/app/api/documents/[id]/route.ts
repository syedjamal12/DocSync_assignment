import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRole, canWrite, canManage } from "@/lib/roles";
import { signSyncToken } from "@/lib/syncToken";
import { renameDocumentSchema } from "@/lib/zodSchemas";
import { withErrorHandling, unauthorized, forbidden, notFound, badRequest } from "@/lib/apiError";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) throw unauthorized();
    const userId = (session.user as { id: string }).id;

    const role = await getRole(id, userId);
    if (!role) throw forbidden("You don't have access to this document.");

    const doc = await prisma.document.findUnique({
      where: { id },
      select: { id: true, title: true, updatedAt: true },
    });
    if (!doc) throw notFound("This document no longer exists.");

    // short-lived token so the browser can open a websocket to the sync server
    const syncToken = signSyncToken(userId);

    return NextResponse.json({ doc, role, syncToken });
  });
}

// rename a document (owner or editor)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) throw unauthorized();
    const userId = (session.user as { id: string }).id;

    const role = await getRole(id, userId);
    if (!role) throw forbidden("You don't have access to this document.");
    if (!canWrite(role)) throw forbidden("Viewers cannot rename this document.");

    const body = await req.json().catch(() => null);
    const parsed = renameDocumentSchema.safeParse(body);
    if (!parsed.success) throw badRequest("Please provide a valid title.");

    const doc = await prisma.document.update({
      where: { id },
      data: { title: parsed.data.title },
      select: { id: true, title: true },
    });

    return NextResponse.json({ doc });
  });
}

// delete a document (owner only)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) throw unauthorized();
    const userId = (session.user as { id: string }).id;

    const role = await getRole(id, userId);
    if (!canManage(role)) throw forbidden("Only the owner can delete this document.");

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
