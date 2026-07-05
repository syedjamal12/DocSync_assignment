import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRole, canWrite } from "@/lib/roles";
import { withErrorHandling, unauthorized, forbidden, notFound } from "@/lib/apiError";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  return withErrorHandling(async () => {
    const { id, versionId } = await params;
    const session = await auth();
    if (!session?.user) throw unauthorized();
    const userId = (session.user as { id: string }).id;

    const role = await getRole(id, userId);
    if (!role) throw forbidden("You don't have access to this document.");
    if (!canWrite(role)) throw forbidden("Viewers cannot restore versions.");

    const version = await prisma.documentVersion.findFirst({
      where: { id: versionId, documentId: id },
      select: { state: true },
    });
    if (!version) throw notFound("That version no longer exists.");

    return NextResponse.json({ state: version.state.toString("base64") });
  });
}
