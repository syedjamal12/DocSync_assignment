import { z } from "zod";
import { AI_ACTION_IDS } from "@/lib/aiActions";


export const MAX_UPDATE_BYTES = 2 * 1024 * 1024; // 2 MB

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(80).optional(),
});

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
});

export const createVersionSchema = z.object({
  label: z.string().max(100).optional(),
  // base64-encoded Yjs state (Y.encodeStateAsUpdate)
  state: z
    .string()
    .refine((s) => Buffer.byteLength(s, "base64") <= MAX_UPDATE_BYTES, {
      message: "Snapshot too large",
    }),
});

export const grantAccessSchema = z.object({
  email: z.string().email(),
  role: z.enum(["EDITOR", "VIEWER"]), // owner is set at creation, not grantable here
});

export const updateAccessSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export const revokeAccessSchema = z.object({
  userId: z.string().min(1),
});

export const renameDocumentSchema = z.object({
  title: z.string().min(1).max(200),
});


export const aiRequestSchema = z.object({
  action: z.enum(AI_ACTION_IDS),
  text: z
    .string()
    .trim()
    .min(1, "Select some text first.")
    .max(8000, "That selection is too long for an AI action (max 8000 characters)."),
});