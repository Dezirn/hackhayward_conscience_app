/**
 * Central place for public env-backed settings.
 * Use NEXT_PUBLIC_* only for values that must be available in the browser.
 */

const DEFAULT_DEV_API_BASE = "http://127.0.0.1:8000";

function readEnvBase(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return raw || undefined;
}

/** Backend origin with no trailing slash (e.g. http://127.0.0.1:8000). */
export function getApiBaseUrl(): string {
  const fromEnv = readEnvBase();
  const base = fromEnv ?? DEFAULT_DEV_API_BASE;
  return base.replace(/\/+$/, "");
}
