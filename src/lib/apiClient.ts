export class ApiRequestError extends Error {}

export async function apiFetch<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body — fall through with generic message
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && String((data as { error: unknown }).error)) ||
      `Request failed (${res.status})`;
    throw new ApiRequestError(message as string);
  }

  return data as T;
}
