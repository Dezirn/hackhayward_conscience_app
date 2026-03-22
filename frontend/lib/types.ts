/**
 * Shared shapes for the Conscience / Social Battery API (JSON over the wire).
 * UUIDs and datetimes arrive as strings from FastAPI.
 */

export type ISODateString = string;
export type ISODateTimeString = string;

export type TaskStatus = "pending" | "completed" | "skipped";

export type BatteryEventSourceType = "task" | "recharge" | "daily_bonus";

export interface Profile {
  id: string;
  username: string;
  display_name?: string | null;
  timezone: string;
  onboarding_completed: boolean;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
}

export interface Battery {
  id: string;
  user_id: string;
  current_level: number;
  min_level: number;
  max_level: number;
  baseline_level: number;
  daily_bonus: number;
  recharge_rate_per_hour: number;
  last_recalculated_at: ISODateTimeString;
  last_daily_bonus_date?: ISODateString | null;
  status_label: string;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
}

/** POST /profile/bootstrap — matches `ProfileBootstrapResponse` from the API. */
export interface ProfileBootstrapResponse {
  profile: Profile;
  battery: Battery;
}

/**
 * GET /battery/history returns a JSON array of these (newest first from the API).
 * Field names follow FastAPI snake_case; optional camelCase aliases for flexibility.
 */
export interface BatteryEvent {
  id?: string;
  user_id?: string;
  source_type?: BatteryEventSourceType | string;
  /** camelCase alias some APIs might emit */
  sourceType?: string;
  source_id?: string | null;
  sourceId?: string | null;
  delta?: number;
  battery_before?: number;
  batteryBefore?: number;
  battery_after?: number;
  batteryAfter?: number;
  explanation?: string | null;
  /** summary / note-style fields if backend adds them */
  summary?: string | null;
  note?: string | null;
  created_at?: ISODateTimeString;
  createdAt?: ISODateTimeString;
}

/** Response shape for GET /battery/history (plain array). */
export type BatteryHistoryResponse = BatteryEvent[];

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  difficulty: number;
  duration_minutes: number;
  priority: number;
  due_at?: ISODateTimeString | null;
  status: TaskStatus;
  estimated_battery_delta: number;
  ai_score?: number | null;
  ai_reasoning?: string | null;
  recommended_order?: number | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
}

export interface RechargeAnalyzeRequest {
  description: string;
  feeling_text: string;
  duration_minutes?: number | null;
}

export interface RechargeAnalyzeResponse {
  ai_estimated_delta: number;
  ai_confidence?: number | null;
  ai_summary?: string | null;
  mood_tags?: string[] | null;
}
