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

/**
 * Fetch an authenticated file (e.g. a salary slip) and open it in a new
 * tab as a blob URL.
 *
 * A plain `<a href={apiUrl} target="_blank">` doesn't work here: opening
 * a link is a full top-level browser navigation, not a fetch from the
 * page's own JS — and the cross-site auth cookie (SameSite=None,
 * Partitioned in production) isn't reliably attached to that kind of
 * direct navigation the way it is to an actual `fetch()` call. The
 * backend's `requireAuth` also accepts a `?token=` query param as a
 * fallback specifically for this case, but the frontend can't use it:
 * the token lives in an httpOnly cookie precisely so JavaScript can
 * never read it. So the only path that reliably carries auth here is a
 * real `fetch()` with credentials, same as every other API call — then
 * hand the browser the resulting bytes as a blob URL instead of asking
 * it to navigate to a protected API URL directly.
 */
export async function openAuthenticatedFile(path: string): Promise<void> {
  const url = `${_baseUrl}${path}`;
  const res = await fetch(url, { credentials: "include" });

  if (!res.ok) {
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    const parsed = parseErrorMessage(res.status, json);
    throw new ApiError(res.status, parsed.code, parsed.message, parsed.details, json);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank");
  // Revoke once the new tab has had time to load it, rather than
  // leaking the object URL for the rest of the page's lifetime.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
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
