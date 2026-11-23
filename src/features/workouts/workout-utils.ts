
import type { Workout } from "./workouts-api";

export function getWorkoutStats(workout: Workout) {
  const exercises = workout.exercises ?? [];

  const sets = exercises.flatMap(
    (exercise) => exercise.sets ?? []
  );

  const completed = sets.filter((set) => set.isCompleted);

  const volumeKg = completed.reduce(
    (total, set) =>
      total + (set.weightKg ?? 0) * (set.reps ?? 0),
    0
  );

  const start = workout.startedAt
    ? new Date(workout.startedAt).getTime()
    : NaN;

  const finish = workout.finishedAt
    ? new Date(workout.finishedAt).getTime()
    : NaN;

  const durationMinutes =
    Number.isFinite(start) &&
    Number.isFinite(finish) &&
    finish >= start
      ? Math.floor((finish - start) / 60_000)
      : null;

  return {
    exerciseCount: exercises.length,
    totalSets: sets.length,
    completedSets: completed.length,
    volumeKg,
    durationMinutes,
  };
}

export function formatDuration(minutes: number | null) {
  if (minutes === null) return "—";

  if (minutes < 60) return `${minutes} мин`;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining
    ? `${hours} ч ${remaining} мин`
    : `${hours} ч`;
}

export function formatWorkoutDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatVolume(value: number) {
  return value.toLocaleString("ru-RU", {
    maximumFractionDigits: 1,
  });
}
