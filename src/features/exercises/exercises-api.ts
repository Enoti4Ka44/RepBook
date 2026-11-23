
import { api } from "@/lib/api";

export interface MuscleGroup {
  id: number;
  name: string;
}

export interface Exercise {
  id: number;
  createdAt?: string;
  name: string;
  description?: string | null;
  muscleGroup?: MuscleGroup | null;
  ownerId?: number | null;
  isCompound: boolean;
}

export interface ExercisePayload {
  name: string;
  description?: string;
  muscleGroupId?: number;
  isCompound: boolean;
}

export const exerciseKeys = {
  all: ["exercises"] as const,
  muscleGroups: ["muscle-groups"] as const,
};

export async function getExercises(): Promise<Exercise[]> {
  const { data } = await api.get<Exercise[]>("/exercises");
  return data;
}

export async function getMuscleGroups(): Promise<MuscleGroup[]> {
  const { data } = await api.get<MuscleGroup[]>(
    "/muscle-groups/"
  );
  return data;
}

export async function createExercise(
  payload: ExercisePayload
): Promise<Exercise> {
  const { data } = await api.post<Exercise>(
    "/exercises",
    payload
  );
  return data;
}

export async function updateExercise(
  id: number,
  payload: ExercisePayload
): Promise<Exercise> {
  const { data } = await api.put<Exercise>(
    `/exercises/${id}`,
    payload
  );
  return data;
}

export async function deleteExercise(
  id: number
): Promise<void> {
  await api.delete(`/exercises/${id}`);
}
