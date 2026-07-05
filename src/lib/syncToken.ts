import jwt from "jsonwebtoken";

const SECRET = process.env.SYNC_JWT_SECRET as string;

export function signSyncToken(userId: string) {
  return jwt.sign({ userId }, SECRET, { expiresIn: "5m" });
}

export function verifySyncToken(token: string): { userId: string } {
  return jwt.verify(token, SECRET) as { userId: string };
}
