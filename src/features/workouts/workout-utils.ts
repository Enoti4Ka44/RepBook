
import type { Workout } from "./workouts-api";

export interface WorkoutStats {
  exerciseCount: number;
  totalSets: number;
  completedSets: number;
  completedWorkSets: number;
  warmupSets: number;
  totalReps: number;
  volumeKg: number;
  durationMinutes: number | null;
}

export function getWorkoutStats(
  workout: Workout
): WorkoutStats {
  const exercises = workout.exercises ?? [];

  const sets = exercises.flatMap(
    (exercise) => exercise.sets ?? []
  );

  const completedSets = sets.filter(
    (set) => set.isCompleted
  );

  const workSets = completedSets.filter(
    (set) => !set.isWarmup
  );

  const warmupSets = completedSets.filter(
    (set) => set.isWarmup
  );

  const volumeKg = workSets.reduce(
    (total, set) =>
      total +
      (set.weightKg ?? 0) * (set.reps ?? 0),
    0
  );

  const totalReps = workSets.reduce(
    (total, set) => total + (set.reps ?? 0),
    0
  );

  const startedAt = workout.startedAt
    ? new Date(workout.startedAt).getTime()
    : NaN;

  const finishedAt = workout.finishedAt
    ? new Date(workout.finishedAt).getTime()
    : NaN;

  const durationMinutes =
    Number.isFinite(startedAt) &&
    Number.isFinite(finishedAt) &&
    finishedAt >= startedAt
      ? Math.floor(
          (finishedAt - startedAt) / 60_000
        )
      : null;

  return {
    exerciseCount: exercises.length,
    totalSets: sets.length,
    completedSets: completedSets.length,
    completedWorkSets: workSets.length,
    warmupSets: warmupSets.length,
    totalReps,
    volumeKg,
    durationMinutes,
  };
}

export function formatDuration(
  minutes: number | null
): string {
  if (
    minutes === null ||
    !Number.isFinite(minutes) ||
    minutes < 0
  ) {
    return "—";
  }

  const rounded = Math.floor(minutes);

  if (rounded < 60) {
    return `${rounded} мин`;
  }

  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;

  return remainder
    ? `${hours} ч ${remainder} мин`
    : `${hours} ч`;
}

export function formatWorkoutDate(
  value?: string | null
): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatVolume(value: number): string {
  if (!Number.isFinite(value)) return "—";

  return value.toLocaleString("ru-RU", {
    maximumFractionDigits: 1,
  });
}
