import { getApiBaseUrl } from "./config";
import type {
  Battery,
  BatteryEvent,
  Profile,
  ProfileBootstrapResponse,
  RechargeAnalyzeInput,
  RechargeAnalyzeResponse,
  RechargeCommitInput,
  RechargeCommitResponse,
  Task,
  TaskCreateInput,
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

/** Readable message for mutation handlers (ApiError, Error, or unknown). */
export function mutationErrorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong. Please try again.";
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

/** GET /tasks — optional `status` query (e.g. `pending`). */
export async function getTasks(status?: string): Promise<Task[]> {
  const q =
    status !== undefined && status !== ""
      ? `?status=${encodeURIComponent(status)}`
      : "";
  const raw = await apiRequest<unknown>(`/tasks${q}`, { method: "GET" });
  if (!Array.isArray(raw)) return [];
  return raw as Task[];
}

export async function completeTask(taskId: string): Promise<Task> {
  return apiRequest<Task>(
    `/tasks/${encodeURIComponent(taskId)}/complete`,
    { method: "POST" },
  );
}

export async function skipTask(taskId: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${encodeURIComponent(taskId)}/skip`, {
    method: "POST",
  });
}

/** POST /tasks — returns created task (201). Throws ApiError with readable message on validation failure. */
export async function createTask(payload: TaskCreateInput): Promise<Task> {
  const jsonBody: Record<string, unknown> = {
    title: payload.title,
    description: payload.description,
    difficulty: payload.difficulty,
    duration_minutes: payload.duration_minutes,
    priority: payload.priority,
  };
  const due = payload.due_at;
  if (due != null && String(due).trim() !== "") {
    jsonBody.due_at = due;
  }
  return apiRequest<Task>("/tasks", {
    method: "POST",
    jsonBody,
  });
}

function rechargeJsonBody(payload: RechargeAnalyzeInput): Record<string, unknown> {
  const jsonBody: Record<string, unknown> = {
    description: payload.description,
    feeling_text: payload.feeling_text,
  };
  const d = payload.duration_minutes;
  if (d != null && d > 0) {
    jsonBody.duration_minutes = d;
  }
  return jsonBody;
}

export async function analyzeRecharge(
  payload: RechargeAnalyzeInput,
): Promise<RechargeAnalyzeResponse> {
  return apiRequest<RechargeAnalyzeResponse>("/recharge/analyze", {
    method: "POST",
    jsonBody: rechargeJsonBody(payload),
  });
}

export async function commitRecharge(
  payload: RechargeCommitInput,
): Promise<RechargeCommitResponse> {
  return apiRequest<RechargeCommitResponse>("/recharge/commit", {
    method: "POST",
    jsonBody: rechargeJsonBody(payload),
  });
}
