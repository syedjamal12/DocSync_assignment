import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { signSyncToken } from "@/lib/syncToken";
import Editor from "@/components/Editor";
import Navbar from "@/components/Navbar";
import DocHeader from "@/components/DocHeader";
import AIBanner from "@/components/AIBanner";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;

  const role = await getRole(id, userId);
  if (!role) redirect("/dashboard");

  const doc = await prisma.document.findUnique({ where: { id }, select: { title: true } });
  if (!doc) redirect("/dashboard");

  const syncToken = signSyncToken(userId);

  return (
    <div>
      <Navbar userEmail={session.user.email} />
      <div className="mt-8 px-4 pb-16">
          <AIBanner />

        <DocHeader documentId={id} initialTitle={doc.title} role={role} />
        <Editor
          documentId={id}
          role={role}
          syncToken={syncToken}
          userName={session.user.name || session.user.email || "Anonymous"}
        />
      </div>
    </div>
  );
}
