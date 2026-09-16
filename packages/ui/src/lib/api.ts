/**
 * api.ts — Typed HTTP client wrapper for the LMS API.
 *
 * Authentication: Uses httpOnly cookies — the browser automatically sends
 * the auth cookie. No manual token injection needed.
 *
 * The base URL is read from NEXT_PUBLIC_API_URL directly at module load —
 * Next.js inlines this at build time, so it's already known before any
 * component ever mounts. It used to be set later via a configureApiClient()
 * call inside a useEffect, but React fires effects bottom-up (children
 * before parents): on a hard reload, a deep child's effect (e.g. a
 * protected layout's own auth check) could run and fire a request before
 * that ancestor effect ever got a chance to configure the real URL,
 * silently sending the very first request to the localhost fallback.
 * Reading it at module scope removes the ordering dependency entirely.
 *
 * configureApiClient() remains as an explicit override, e.g. for tests.
 */

// Narrow local ambient type — this package doesn't otherwise pull in
// Node's global types, and this is the one spot that needs `process.env`.
declare const process: { env: Record<string, string | undefined> } | undefined;

let _baseUrl =
  (typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL
    : undefined) ?? "http://localhost:8000/api/v1";

export function configureApiClient(options: { baseUrl?: string }) {
  if (options.baseUrl) {
    _baseUrl = options.baseUrl;
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function parseErrorMessage(
  status: number,
  json: unknown,
): { code: string; message: string; details?: unknown } {
  if (!json || typeof json !== "object") {
    return { code: "UNKNOWN", message: `HTTP ${status}` };
  }

  const err = json as Record<string, any>;
  const code = err.code || "UNKNOWN";

  // Check if details has validation issues from Zod
  if (Array.isArray(err.details) && err.details.length > 0) {
    const detailMessages = err.details
      .map((d: any) => (typeof d === "string" ? d : d?.message))
      .filter(Boolean);
    if (detailMessages.length > 0) {
      return { code, message: detailMessages.join(". "), details: err.details };
    }
  }

  const message =
    err.message ||
    err.error ||
    (typeof err.details === "string" ? err.details : null) ||
    `HTTP ${status}`;

  return { code, message, details: err.details };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestInit,
): Promise<T> {
  const url = `${_baseUrl}${path}`;

  const init: RequestInit = {
    method,
    credentials: "include", // send httpOnly auth cookie
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const parsed = parseErrorMessage(res.status, json);
    throw new ApiError(
      res.status,
      parsed.code,
      parsed.message,
      parsed.details,
      json,
    );
  }

  return json as T;
}

/**
 * Upload a file (multipart/form-data). Skips Content-Type header so the
 * browser sets the correct boundary automatically.
 */
async function upload<T>(path: string, formData: FormData): Promise<T> {
  const url = `${_baseUrl}${path}`;

  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const parsed = parseErrorMessage(res.status, json);
    throw new ApiError(
      res.status,
      parsed.code,
      parsed.message,
      parsed.details,
      json,
    );
  }

  return json as T;
}

/** Get the currently configured API base URL */
export function getApiBase(): string {
  return _baseUrl;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit): Promise<T> =>
    request<T>("GET", path, undefined, options),

  post: <T>(path: string, body?: unknown, options?: RequestInit): Promise<T> =>
    request<T>("POST", path, body, options),

  put: <T>(path: string, body?: unknown, options?: RequestInit): Promise<T> =>
    request<T>("PUT", path, body, options),

  patch: <T>(path: string, body?: unknown, options?: RequestInit): Promise<T> =>
    request<T>("PATCH", path, body, options),

  delete: <T>(path: string, options?: RequestInit): Promise<T> =>
    request<T>("DELETE", path, undefined, options),

  upload: <T>(path: string, formData: FormData): Promise<T> =>
    upload<T>(path, formData),
};

/** Build a query string from a plain object, skipping undefined/null values. */
export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (entries.length === 0) return "";
  const qs = new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)]),
  ).toString();
  return `?${qs}`;
}
