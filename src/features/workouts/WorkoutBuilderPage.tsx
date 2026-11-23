import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Dumbbell,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SquircleCard } from "@/components/repbook/SquircleCard";

import { exerciseKeys, getExercises } from "@/features/exercises/exercises-api";

import { createWorkout, workoutKeys } from "./workouts-api";

interface PlannedExercise {
  localId: string;
  exerciseId: number;
  sets: number;
  reps: number;
  weight: number;
}

export function WorkoutBuilderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedExercise, setSelectedExercise] = useState("");
  const [planned, setPlanned] = useState<PlannedExercise[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const exercisesQuery = useQuery({
    queryKey: exerciseKeys.all,
    queryFn: getExercises,
  });

  const exercises = exercisesQuery.data ?? [];

  const mutation = useMutation({
    mutationFn: createWorkout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workoutKeys.all,
      });
      navigate("/workouts");
    },
    onError: () => {
      setError(
        "Не удалось сохранить тренировку. Проверь данные и подключение.",
      );
    },
  });

  function addExercise() {
    const exerciseId = Number(selectedExercise);

    if (!exerciseId) return;

    setPlanned((current) => [
      ...current,
      {
        localId: crypto.randomUUID(),
        exerciseId,
        sets: 3,
        reps: 10,
        weight: 0,
      },
    ]);

    setSelectedExercise("");
  }

  function updateExercise(localId: string, changes: Partial<PlannedExercise>) {
    setPlanned((current) =>
      current.map((item) =>
        item.localId === localId ? { ...item, ...changes } : item,
      ),
    );
  }

  function removeExercise(localId: string) {
    setPlanned((current) => current.filter((item) => item.localId !== localId));
  }

  function moveExercise(index: number, direction: -1 | 1) {
    const target = index + direction;

    if (target < 0 || target >= planned.length) return;

    setPlanned((current) => {
      const result = [...current];

      [result[index], result[target]] = [result[target], result[index]];

      return result;
    });
  }

  function handleSave() {
    setError("");

    if (planned.length === 0) {
      setError("Добавь хотя бы одно упражнение.");
      return;
    }

    const invalid = planned.some(
      (item) =>
        !Number.isInteger(item.sets) ||
        item.sets < 1 ||
        !Number.isInteger(item.reps) ||
        item.reps < 1 ||
        !Number.isFinite(item.weight) ||
        item.weight < 0,
    );

    if (invalid) {
      setError("Проверь подходы, повторения и вес.");
      return;
    }

    if (notes.length > 5000) {
      setError("Заметки слишком длинные.");
      return;
    }

    mutation.mutate({
      notes: notes.trim(),
      exercises: planned.map((item) => ({
        exerciseId: item.exerciseId,
        plannedSets: item.sets,
        plannedReps: item.reps,
        plannedWeightKg: item.weight,
      })),
    });
  }

  return (
    <main className="min-h-screen bg-[#F6F1F8] px-4 py-8 pb-32 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <Link
            to="/workouts"
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#82768A] hover:text-[#302C33]"
          >
            <ArrowLeft size={17} />
            Все тренировки
          </Link>

          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[#302C33]">
            Новая тренировка
          </h1>

          <p className="mt-2 text-sm text-[#82768A]">Собери свой план.</p>
        </header>

        <SquircleCard className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[#EFE7F2] text-[#8D75A0]">
              <Plus size={22} />
            </div>

            <div>
              <h2 className="font-bold text-[#302C33]">Добавить упражнение</h2>
              <p className="text-xs text-[#82768A]">Выбери из библиотеки</p>
            </div>
          </div>

          {exercisesQuery.isError ? (
            <div className="space-y-3">
              <p role="alert" className="text-sm text-red-600">
                Не удалось загрузить упражнения.
              </p>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => void exercisesQuery.refetch()}
              >
                Повторить
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                disabled={exercisesQuery.isPending}
                aria-label="Выбрать упражнение"
                className="h-12 min-w-0 flex-1 cursor-pointer rounded-2xl border border-[#E9DFEC] bg-[#F9F6FA] px-4 text-sm text-[#302C33] focus-visible:outline-2 focus-visible:outline-[#AA91B5]"
              >
                <option value="">
                  {exercisesQuery.isPending
                    ? "Загрузка..."
                    : "Выбрать упражнение"}
                </option>

                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                onClick={addExercise}
                disabled={!selectedExercise}
                className="h-12 cursor-pointer rounded-2xl bg-[#302C33] px-6 font-bold text-white hover:bg-[#48424B] disabled:cursor-not-allowed"
              >
                <Plus size={18} />
                Добавить
              </Button>
            </div>
          )}

          {exercises.length === 0 &&
            !exercisesQuery.isPending &&
            !exercisesQuery.isError && (
              <p className="text-sm text-[#82768A]">
                Библиотека пуста.{" "}
                <Link
                  to="/exercises"
                  className="cursor-pointer font-semibold text-[#8D75A0] underline"
                >
                  Создать упражнение
                </Link>
              </p>
            )}
        </SquircleCard>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[#302C33]">Упражнения</h2>

          <span className="rounded-full bg-[#E9DFEC] px-4 py-2 text-xs font-bold text-[#806B8E]">
            {planned.length}
          </span>
        </div>

        {planned.length === 0 ? (
          <SquircleCard className="py-14 text-center">
            <Dumbbell size={36} className="mx-auto text-[#AA91B5]" />

            <p className="mt-4 font-bold text-[#302C33]">План пока пуст</p>

            <p className="mt-2 text-sm text-[#82768A]">
              Добавь первое упражнение.
            </p>
          </SquircleCard>
        ) : (
          <div className="space-y-4">
            {planned.map((item, index) => {
              const exercise = exercises.find((e) => e.id === item.exerciseId);

              return (
                <SquircleCard key={item.localId} className="space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#EFE7F2] font-bold text-[#8D75A0]">
                        {index + 1}
                      </div>

                      <div>
                        <h3 className="font-bold text-[#302C33]">
                          {exercise?.name ?? "Упражнение"}
                        </h3>

                        <p className="mt-1 text-xs text-[#82768A]">
                          {exercise?.muscleGroup?.name ?? "Без группы"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveExercise(index, -1)}
                        aria-label="Переместить выше"
                        className="cursor-pointer rounded-xl p-2 text-[#82768A] hover:bg-[#F1EDF3] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowUp size={17} />
                      </button>

                      <button
                        type="button"
                        disabled={index === planned.length - 1}
                        onClick={() => moveExercise(index, 1)}
                        aria-label="Переместить ниже"
                        className="cursor-pointer rounded-xl p-2 text-[#82768A] hover:bg-[#F1EDF3] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowDown size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeExercise(item.localId)}
                        aria-label="Удалить упражнение из плана"
                        className="cursor-pointer rounded-xl p-2 text-[#82768A] hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`sets-${item.localId}`}
                        className="text-xs"
                      >
                        Подходы
                      </Label>

                      <Input
                        id={`sets-${item.localId}`}
                        type="number"
                        min={1}
                        step={1}
                        value={item.sets}
                        onChange={(e) =>
                          updateExercise(item.localId, {
                            sets: e.target.valueAsNumber,
                          })
                        }
                        className="h-12 rounded-2xl bg-[#F9F6FA] text-center"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor={`reps-${item.localId}`}
                        className="text-xs"
                      >
                        Повторы
                      </Label>

                      <Input
                        id={`reps-${item.localId}`}
                        type="number"
                        min={1}
                        step={1}
                        value={item.reps}
                        onChange={(e) =>
                          updateExercise(item.localId, {
                            reps: e.target.valueAsNumber,
                          })
                        }
                        className="h-12 rounded-2xl bg-[#F9F6FA] text-center"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor={`weight-${item.localId}`}
                        className="text-xs"
                      >
                        Вес, кг
                      </Label>

                      <Input
                        id={`weight-${item.localId}`}
                        type="number"
                        min={0}
                        step="0.5"
                        value={item.weight}
                        onChange={(e) =>
                          updateExercise(item.localId, {
                            weight: e.target.valueAsNumber,
                          })
                        }
                        className="h-12 rounded-2xl bg-[#F9F6FA] text-center"
                      />
                    </div>
                  </div>
                </SquircleCard>
              );
            })}
          </div>
        )}

        <SquircleCard className="space-y-3">
          <Label htmlFor="workout-notes" className="font-bold text-[#302C33]">
            Заметки
          </Label>

          <Textarea
            id="workout-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={5000}
            placeholder="Необязательно"
            className="min-h-24 resize-none rounded-2xl bg-[#F9F6FA] p-4"
          />
        </SquircleCard>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-[#82768A]">
            {planned.reduce(
              (sum, item) => sum + (Number.isFinite(item.sets) ? item.sets : 0),
              0,
            )}{" "}
            подходов в плане
          </p>

          <Button
            type="button"
            onClick={handleSave}
            disabled={mutation.isPending}
            className="h-13 min-w-48 cursor-pointer rounded-2xl bg-[#EDBE65] px-7 font-extrabold text-[#302C33] hover:bg-[#E2AD50] disabled:cursor-not-allowed"
          >
            {mutation.isPending ? "Сохранение..." : "Сохранить тренировку"}
          </Button>
        </div>
      </div>
    </main>
  );
}
