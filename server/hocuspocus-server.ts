
import "dotenv/config";
import { Server } from "@hocuspocus/server";
import * as Y from "yjs";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const SYNC_JWT_SECRET = process.env.SYNC_JWT_SECRET as string;
const MAX_UPDATE_BYTES = 2 * 1024 * 1024; // keep in sync with src/lib/zodSchemas.ts


const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!dbUrl) throw new Error("Set DIRECT_URL (or DATABASE_URL) in your .env");

const connectionUrl = new URL(dbUrl);
if (!connectionUrl.searchParams.has("connection_limit")) {
  connectionUrl.searchParams.set("connection_limit", "5");
}
if (!connectionUrl.searchParams.has("pool_timeout")) {
  connectionUrl.searchParams.set("pool_timeout", "20");
}

const prisma = new PrismaClient({
  datasourceUrl: connectionUrl.toString(),
});


async function shutdown() {
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const server = Server.configure({
port: Number(process.env.PORT || process.env.SYNC_SERVER_PORT || 1234),
  
  debounce: 2000,
  maxDebounce: 10000,

  async onAuthenticate(data) {
    const { token, documentName } = data;
    if (!token) throw new Error("Missing auth token");

    let userId: string;
    try {
      const payload = jwt.verify(token, SYNC_JWT_SECRET) as { userId: string };
      userId = payload.userId;
    } catch {
      throw new Error("Invalid or expired token");
    }

    const doc = await prisma.document.findUnique({
      where: { id: documentName },
      select: { ownerId: true },
    });
    if (!doc) throw new Error("Document not found");

    let role: "OWNER" | "EDITOR" | "VIEWER" | null = null;
    if (doc.ownerId === userId) {
      role = "OWNER";
    } else {
      const access = await prisma.documentAccess.findUnique({
        where: { documentId_userId: { documentId: documentName, userId } },
        select: { role: true },
      });
      role = access?.role ?? null;
    }
    if (!role) throw new Error("Not authorized for this document");

   
    return { userId, role, readOnly: role === "VIEWER" };
  },

  // --- LOAD latest state when the doc is first opened on this server -----
  async onLoadDocument(data) {
    try {
      const record = await prisma.document.findUnique({
        where: { id: data.documentName },
        select: { state: true },
      });
      if (record?.state) {
        Y.applyUpdate(data.document, new Uint8Array(record.state));
      }
    } catch (err) {
     
      console.error(`Failed to load document ${data.documentName}:`, err);
    }
    return data.document;
  },

  // --- VALIDATE + PERSIST every debounced update --------------------------
  async onStoreDocument(data) {
    const update = Y.encodeStateAsUpdate(data.document);
    if (update.byteLength > MAX_UPDATE_BYTES) {
      console.error(`Refusing to store oversized update (${update.byteLength} bytes) for ${data.documentName}`);
      return;
    }

    try {
      await prisma.document.update({
        where: { id: data.documentName },
        data: { state: Buffer.from(update) },
      });
    } catch (err) {
      console.error(`Failed to persist document ${data.documentName}:`, err);
    }
  },
});

server.listen();
// console.log(`Hocuspocus sync server running on port ${process.env.SYNC_SERVER_PORT ?? 1234}`);
const PORT = Number(process.env.PORT || process.env.SYNC_SERVER_PORT || 1234);

console.log(`🚀 Hocuspocus running on port ${PORT}`);