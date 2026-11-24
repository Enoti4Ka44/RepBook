
import { api } from "@/lib/api";
import type { Exercise } from "@/features/exercises/exercises-api";

export type WorkoutStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface WorkoutSet {
  id: number;
  setNumber: number;
  plannedWeightKg: number | null;
  plannedReps: number | null;
  weightKg: number | null;
  reps: number | null;
  rir: number | null;
  restSeconds: number | null;
  isWarmup: boolean;
  isCompleted: boolean;
  notes: string | null;
}

export interface WorkoutExercise {
  id: number;
  exercise: Exercise;
  position: number;
  notes: string | null;
  sets: WorkoutSet[];
}

export interface Workout {
  id: number;
  createdAt: string;
  status: WorkoutStatus;
  startedAt: string | null;
  finishedAt: string | null;
  notes: string | null;
  bodyWeightKg: number | null;
  mood: number | null;
  exercises: WorkoutExercise[];
}

// План одного подхода
export interface SetPlanPayload {
  plannedWeightKg?: number;
  plannedReps?: number;
  isWarmup?: boolean;
  restSeconds?: number;
  notes?: string;
}

// Сервер принимает либо одинаковые подходы,
// либо массив индивидуальных подходов.
export type CreateWorkoutExercise =
  | {
      exerciseId: number;
      notes?: string;
      plannedSets: number;
      plannedReps?: number;
      plannedWeightKg?: number;
      sets?: never;
    }
  | {
      exerciseId: number;
      notes?: string;
      sets: SetPlanPayload[];
      plannedSets?: never;
      plannedReps?: never;
      plannedWeightKg?: never;
    };

// Используется при добавлении упражнения
export type AddExercisePayload = CreateWorkoutExercise;

export interface CreateWorkoutPayload {
  notes?: string;
  bodyWeightKg?: number;
  exercises: CreateWorkoutExercise[];
}

export interface UpdateWorkoutPayload {
  notes?: string;
  bodyWeightKg?: number;
  mood?: number;
}

export interface UpdateExercisePlanPayload {
  notes?: string;
  sets?: SetPlanPayload[];
  plannedSets?: number;
  plannedReps?: number;
  plannedWeightKg?: number;
}

export interface UpdateSetPayload {
  setNumber?: number;
  plannedWeightKg?: number;
  plannedReps?: number;
  weightKg?: number;
  reps?: number;
  rir?: number;
  restSeconds?: number;
  isCompleted?: boolean;
  isWarmup?: boolean;
  notes?: string;
}

export interface CreateSetPayload {
  setNumber?: number;
  plannedWeightKg?: number;
  plannedReps?: number;
  weightKg?: number;
  reps?: number;
  rir?: number;
  restSeconds?: number;
  isWarmup?: boolean;
  notes?: string;
}

export interface FinishWorkoutPayload {
  mood?: number;
  bodyWeightKg?: number;
  notes?: string;
}

export const workoutKeys = {
  all: ["workouts"] as const,
  detail: (id: number) => ["workouts", id] as const,
};

export async function getWorkouts(): Promise<Workout[]> {
  const { data } = await api.get<Workout[]>("/workouts");

  if (!Array.isArray(data)) {
    throw new Error("GET /workouts: ожидался массив");
  }

  return data;
}

export async function getWorkout(
  id: number
): Promise<Workout> {
  const { data } = await api.get<Workout>(
    `/workouts/${id}`
  );

  return data;
}

export async function createWorkout(
  payload: CreateWorkoutPayload
): Promise<Workout> {
  const { data } = await api.post<Workout>(
    "/workouts",
    payload
  );

  return data;
}

export async function updateWorkout(
  id: number,
  payload: UpdateWorkoutPayload
): Promise<Workout> {
  const { data } = await api.patch<Workout>(
    `/workouts/${id}`,
    payload
  );

  return data;
}

export async function updateWorkoutNotes(
  workoutId: number,
  notes: string
): Promise<Workout> {
  return updateWorkout(workoutId, { notes });
}

export async function deleteWorkout(
  id: number
): Promise<void> {
  await api.delete(`/workouts/${id}`);
}

export async function startWorkout(
  id: number
): Promise<Workout> {
  const { data } = await api.post<Workout>(
    `/workouts/${id}/start`
  );

  return data;
}

export async function finishWorkout(
  id: number,
  payload: FinishWorkoutPayload
): Promise<Workout> {
  const { data } = await api.post<Workout>(
    `/workouts/${id}/finish`,
    payload
  );

  return data;
}

export async function cancelWorkout(
  id: number
): Promise<Workout> {
  const { data } = await api.post<Workout>(
    `/workouts/${id}/cancel`
  );

  return data;
}

export async function addExerciseToWorkout(
  workoutId: number,
  payload: AddExercisePayload
): Promise<WorkoutExercise> {
  const { data } = await api.post<WorkoutExercise>(
    `/workouts/${workoutId}/exercises`,
    payload
  );

  return data;
}

export async function updateExercisePlan(
  workoutId: number,
  workoutExerciseId: number,
  payload: UpdateExercisePlanPayload
): Promise<WorkoutExercise> {
  const { data } = await api.patch<WorkoutExercise>(
    `/workouts/${workoutId}/exercises/${workoutExerciseId}`,
    payload
  );

  return data;
}

export async function removeExerciseFromWorkout(
  workoutId: number,
  workoutExerciseId: number
): Promise<void> {
  await api.delete(
    `/workouts/${workoutId}/exercises/${workoutExerciseId}`
  );
}

export async function addWorkoutSet(
  workoutId: number,
  workoutExerciseId: number,
  payload: CreateSetPayload
): Promise<WorkoutSet> {
  const { data } = await api.post<WorkoutSet>(
    `/workouts/${workoutId}/exercises/${workoutExerciseId}/sets`,
    payload
  );

  return data;
}

export async function updateWorkoutSet(
  workoutId: number,
  setId: number,
  payload: UpdateSetPayload
): Promise<WorkoutSet> {
  const { data } = await api.patch<WorkoutSet>(
    `/workouts/${workoutId}/sets/${setId}`,
    payload
  );

  return data;
}

export async function deleteWorkoutSet(
  workoutId: number,
  setId: number
): Promise<void> {
  await api.delete(
    `/workouts/${workoutId}/sets/${setId}`
  );
}
