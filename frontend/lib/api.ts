import { getApiBaseUrl } from "./config";
import type {
  Battery,
  BatteryEvent,
  Profile,
  ProfileBootstrapResponse,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export type ApiRequestInit = RequestInit & {
  /** Plain object — serialized as JSON with Content-Type application/json */
  jsonBody?: unknown;
};

/** Turn FastAPI-style `{ detail: ... }` into a readable string. */
function formatApiErrorMessage(status: number, parsed: unknown): string {
  if (
    parsed &&
    typeof parsed === "object" &&
    "detail" in parsed &&
    (parsed as { detail: unknown }).detail != null
  ) {
    const d = (parsed as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return JSON.stringify(d);
    return String(d);
  }
  return `Request failed (${status})`;
}

function joinUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Small fetch wrapper for the backend. Prepends API base URL, optional JSON body, parses JSON when possible.
 */
export async function apiRequest<T = unknown>(
  path: string,
  init: ApiRequestInit = {},
): Promise<T> {
  const { jsonBody, headers: hdrs, body: initBody, ...rest } = init;
  const headers = new Headers(hdrs);

  let body: BodyInit | null | undefined = initBody;
  if (jsonBody !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(jsonBody);
  }

  const res = await fetch(joinUrl(path), {
    ...rest,
    headers,
    body: body ?? undefined,
  });

  const text = await res.text();
  let parsed: unknown = text;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  } else {
    parsed = undefined;
  }

  if (!res.ok) {
    const message = formatApiErrorMessage(res.status, parsed);
    throw new ApiError(message, res.status, parsed);
  }

  return parsed as T;
}

export async function bootstrapProfile(): Promise<ProfileBootstrapResponse> {
  return apiRequest<ProfileBootstrapResponse>("/profile/bootstrap", {
    method: "POST",
  });
}

export async function getProfile(): Promise<Profile> {
  return apiRequest<Profile>("/profile", { method: "GET" });
}

export async function getBattery(): Promise<Battery> {
  return apiRequest<Battery>("/battery", { method: "GET" });
}

/** GET /battery/history — newest-first list; tolerates non-array JSON. */
export async function getBatteryHistory(): Promise<BatteryEvent[]> {
  const raw = await apiRequest<unknown>("/battery/history", { method: "GET" });
  if (!Array.isArray(raw)) return [];
  return raw as BatteryEvent[];
}
