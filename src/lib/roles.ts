import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export async function getRole(documentId: string, userId: string): Promise<Role | null> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { ownerId: true },
  });
  if (!doc) return null;
  if (doc.ownerId === userId) return "OWNER";

  const access = await prisma.documentAccess.findUnique({
    where: { documentId_userId: { documentId, userId } },
    select: { role: true },
  });
  return access?.role ?? null;
}

export function canWrite(role: Role | null): boolean {
  return role === "OWNER" || role === "EDITOR";
}

export function canManage(role: Role | null): boolean {
  return role === "OWNER";
}
