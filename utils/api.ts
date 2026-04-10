
const DEFAULT_API_BASE = "http://16.171.52.92";

const base = (
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE
).replace(/\/+$/, "");

export type ApiPostResult<T = unknown> = T & {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
  access_token?: string;
  refresh_token?: string;
  user_type?: string;
  user?: unknown;
  /** Some endpoints echo HTTP status in the JSON body */
  status?: number;
  is_access_error?: boolean;
  clinics?: unknown;
  total?: unknown;
};

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function errorMessageFromPayload(payload: ApiPostResult, fallback: string): string {
  let msg =
    typeof payload.message === "string" ? payload.message : fallback;
  const raw = payload as Record<string, unknown>;
  const detail = raw.detail;
  if (Array.isArray(detail) && detail[0] && typeof detail[0] === "object") {
    const first = detail[0] as { msg?: string };
    if (typeof first.msg === "string") msg = first.msg;
  } else if (typeof detail === "string") {
    msg = detail;
  }
  return msg;
}

async function parseJsonBody(res: Response): Promise<ApiPostResult> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as ApiPostResult;
  } catch {
    return {};
  }
}

export const api = {
  async get<T = ApiPostResult>(path: string): Promise<T> {
    const url = path.startsWith("http") ? path : `${base}${path}`;
    const res = await fetch(url, {
      method: "GET",
      headers: authHeaders(),
    });

    const payload = await parseJsonBody(res);

    if (!res.ok) {
      throw new Error(
        errorMessageFromPayload(payload, `Request failed (${res.status})`),
      );
    }

    return payload as T;
  },

  async post<T = ApiPostResult>(path: string, body: unknown): Promise<T> {
    const url = path.startsWith("http") ? path : `${base}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });

    const payload = await parseJsonBody(res);

    if (!res.ok) {
      throw new Error(
        errorMessageFromPayload(payload, `Request failed (${res.status})`),
      );
    }

    return payload as T;
  },

  async put<T = ApiPostResult>(path: string, body: unknown): Promise<T> {
    const url = path.startsWith("http") ? path : `${base}${path}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });

    const payload = await parseJsonBody(res);

    if (!res.ok) {
      throw new Error(
        errorMessageFromPayload(payload, `Request failed (${res.status})`),
      );
    }

    return payload as T;
  },

  async patch<T = ApiPostResult>(path: string, body: unknown = {}): Promise<T> {
    const url = path.startsWith("http") ? path : `${base}${path}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(body ?? {}),
    });

    const payload = await parseJsonBody(res);

    if (!res.ok) {
      throw new Error(
        errorMessageFromPayload(payload, `Request failed (${res.status})`),
      );
    }

    return payload as T;
  },

  async delete<T = ApiPostResult>(path: string): Promise<T> {
    const url = path.startsWith("http") ? path : `${base}${path}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: authHeaders(),
    });

    const payload = await parseJsonBody(res);

    if (!res.ok) {
      throw new Error(
        errorMessageFromPayload(payload, `Request failed (${res.status})`),
      );
    }

    return payload as T;
  },
};
