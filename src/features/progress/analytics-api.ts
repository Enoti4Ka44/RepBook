
import { api } from "@/lib/api";

export type AnalyticsGrouping = "DAY" | "WEEK";

export interface AnalyticsPeriod {
  from: string;
  to: string;
}

export interface AnalyticsSummary {
  workoutCount: number;
  totalTonnageKg: number;
  setCount: number;
  repCount: number;
  avgDurationMinutes: number | null;
  bodyWeightChangeKg: number | null;
}

export interface VolumePoint {
  date: string;
  tonnageKg: number;
  workoutCount: number;
}

export interface ExerciseRecord {
  exerciseId: number;
  exerciseName: string;
  maxWeightKg: number;
  maxReps: number;
  maxSetTonnageKg: number;
}

export interface ExerciseProgressPoint {
  date: string;
  bestWeightKg: number;
  bestEst1rmKg: number;
  tonnageKg: number;
  setCount: number;
}

export const analyticsKeys = {
  all: ["analytics"] as const,

  summary: (period: AnalyticsPeriod) =>
    [
      "analytics",
      "summary",
      period.from,
      period.to,
    ] as const,

  volume: (
    period: AnalyticsPeriod,
    grouping: AnalyticsGrouping
  ) =>
    [
      "analytics",
      "volume",
      period.from,
      period.to,
      grouping,
    ] as const,

  records: () =>
    ["analytics", "records"] as const,

  progress: (
    exerciseId: number,
    period: AnalyticsPeriod
  ) =>
    [
      "analytics",
      "exercise-progress",
      exerciseId,
      period.from,
      period.to,
    ] as const,
};

export async function getAnalyticsSummary(
  period: AnalyticsPeriod
): Promise<AnalyticsSummary> {
  const { data } = await api.get<AnalyticsSummary>(
    "/analytics/summary",
    { params: period }
  );

  return data;
}

export async function getVolumeDynamics(
  period: AnalyticsPeriod,
  grouping: AnalyticsGrouping = "DAY"
): Promise<VolumePoint[]> {
  const { data } = await api.get<VolumePoint[]>(
    "/analytics/volume",
    {
      params: {
        ...period,
        grouping,
      },
    }
  );

  if (!Array.isArray(data)) {
    throw new Error("Analytics volume: expected an array");
  }

  return data;
}

export async function getPersonalRecords(): Promise<
  ExerciseRecord[]
> {
  const { data } = await api.get<ExerciseRecord[]>(
    "/analytics/records"
  );

  if (!Array.isArray(data)) {
    throw new Error("Analytics records: expected an array");
  }

  return data;
}

export async function getExerciseProgress(
  exerciseId: number,
  period: AnalyticsPeriod
): Promise<ExerciseProgressPoint[]> {
  const { data } = await api.get<ExerciseProgressPoint[]>(
    `/analytics/exercises/${exerciseId}/progress`,
    {
      params: period,
    }
  );

  if (!Array.isArray(data)) {
    throw new Error("Exercise progress: expected an array");
  }

  return data;
}

export function toLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getAnalyticsPeriod(
  days: number,
  now = new Date()
): AnalyticsPeriod {
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  return {
    from: toLocalDate(start),
    to: toLocalDate(end),
  };
}

export function getCurrentWeekPeriod(
  now = new Date()
): AnalyticsPeriod {
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const start = new Date(end);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);

  return {
    from: toLocalDate(start),
    to: toLocalDate(end),
  };
}
