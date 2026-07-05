import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Wrap a route handler body so unexpected errors never leak internals to the client. */
export function withErrorHandling(fn: () => Promise<NextResponse>) {
  return fn().catch((err) => {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[api error]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  });
}

export const unauthorized = () => new ApiError(401, "You need to be logged in.");
export const forbidden = (msg = "You don't have access to this document.") => new ApiError(403, msg);
export const notFound = (msg = "Not found.") => new ApiError(404, msg);
export const badRequest = (msg = "Invalid request.") => new ApiError(400, msg);
export const conflict = (msg = "Conflict.") => new ApiError(409, msg);
