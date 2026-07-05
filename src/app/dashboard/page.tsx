import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewDocumentForm from "@/components/NewDocumentForm";
import Navbar from "@/components/Navbar";
import DocumentList from "@/components/DocumentList";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
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

  const docsWithRole = docs.map((d) => ({
    id: d.id,
    title: d.title,
    updatedAt: d.updatedAt.toISOString(),
    role: (d.ownerId === userId ? "OWNER" : d.access[0]?.role ?? "VIEWER") as "OWNER" | "EDITOR" | "VIEWER",
  }));

  return (
    <div>
      <Navbar userEmail={session.user.email} />
      <div className="max-w-2xl mx-auto mt-10 px-4 pb-16">
        <h1 className="text-xl font-medium mb-6">Your documents</h1>
        <NewDocumentForm />
        <DocumentList docs={docsWithRole} />
      </div>
    </div>
  );
}
