import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRole, canManage } from "@/lib/roles";
import { grantAccessSchema, updateAccessSchema, revokeAccessSchema } from "@/lib/zodSchemas";
import { withErrorHandling, unauthorized, forbidden, notFound, badRequest } from "@/lib/apiError";

async function requireOwner(documentId: string) {
  const session = await auth();
  if (!session?.user) throw unauthorized();
  const userId = (session.user as { id: string }).id;
  const role = await getRole(documentId, userId);
  if (!canManage(role)) throw forbidden("Only the document owner can manage sharing.");
  return userId;
}

// list collaborators (owner + everyone with explicit access)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const { id } = await params;
    await requireOwner(id);

    const doc = await prisma.document.findUnique({
      where: { id },
      select: { owner: { select: { id: true, email: true, name: true } } },
    });
    if (!doc) throw notFound("Document not found.");

    const access = await prisma.documentAccess.findMany({
      where: { documentId: id },
      select: { userId: true, role: true, user: { select: { email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      owner: doc.owner,
      collaborators: access.map((a) => ({
        userId: a.userId,
        role: a.role,
        email: a.user.email,
        name: a.user.name,
      })),
    });
  });
}

// invite / grant access
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const ownerId = await requireOwner(id);

    const body = await req.json().catch(() => null);
    const parsed = grantAccessSchema.safeParse(body);
    if (!parsed.success) throw badRequest("Enter a valid email and role.");

    const target = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!target) throw notFound("No account exists with that email yet.");
    if (target.id === ownerId) throw badRequest("You already own this document.");

    const access = await prisma.documentAccess.upsert({
      where: { documentId_userId: { documentId: id, userId: target.id } },
      update: { role: parsed.data.role },
      create: { documentId: id, userId: target.id, role: parsed.data.role },
    });

    return NextResponse.json({ access }, { status: 201 });
  });
}

// change a collaborator's role
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const { id } = await params;
    await requireOwner(id);

    const body = await req.json().catch(() => null);
    const parsed = updateAccessSchema.safeParse(body);
    if (!parsed.success) throw badRequest("Invalid role update request.");

    const updated = await prisma.documentAccess.updateMany({
      where: { documentId: id, userId: parsed.data.userId },
      data: { role: parsed.data.role },
    });
    if (updated.count === 0) throw notFound("That collaborator doesn't have access to this document.");

    return NextResponse.json({ ok: true });
  });
}

// revoke access
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const { id } = await params;
    await requireOwner(id);

    const body = await req.json().catch(() => null);
    const parsed = revokeAccessSchema.safeParse(body);
    if (!parsed.success) throw badRequest("Invalid request.");

    await prisma.documentAccess.deleteMany({
      where: { documentId: id, userId: parsed.data.userId },
    });

    return NextResponse.json({ ok: true });
  });
}
