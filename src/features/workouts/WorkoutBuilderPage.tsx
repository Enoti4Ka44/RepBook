import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  Layers3,
  LoaderCircle,
  Plus,
  Timer,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SquircleCard } from "@/components/repbook/SquircleCard";

import { exerciseKeys, getExercises } from "@/features/exercises/exercises-api";

import {
  createWorkout,
  workoutKeys,
  type SetPlanPayload,
} from "./workouts-api";

// ==========================================
// Типы
// ==========================================

interface PlannedSet {
  localId: string;
  weight: string;
  reps: string;
  restSeconds: string;
  isWarmup: boolean;
}

interface PlannedExercise {
  localId: string;
  exerciseId: number;
  sets: PlannedSet[];
}

function makeSet(previous?: PlannedSet): PlannedSet {
  return {
    localId: crypto.randomUUID(),
    weight: previous?.weight ?? "0",
    reps: previous?.reps ?? "10",
    restSeconds: previous?.restSeconds ?? "90",
    isWarmup: previous?.isWarmup ?? false,
  };
}

function makeExercise(exerciseId: number): PlannedExercise {
  return {
    localId: crypto.randomUUID(),
    exerciseId,
    sets: [makeSet(), makeSet(), makeSet()],
  };
}

function isValidSet(set: PlannedSet): boolean {
  const weight = Number(set.weight);
  const reps = Number(set.reps);
  const rest = Number(set.restSeconds);

  return (
    set.weight.trim() !== "" &&
    Number.isFinite(weight) &&
    weight >= 0 &&
    set.reps.trim() !== "" &&
    Number.isInteger(reps) &&
    reps >= 1 &&
    set.restSeconds.trim() !== "" &&
    Number.isInteger(rest) &&
    rest >= 0
  );
}

// ==========================================
// Компонент одного подхода
// ==========================================

function PlannedSetRow({
  set,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  set: PlannedSet;
  index: number;
  canRemove: boolean;
  onChange: (changes: Partial<PlannedSet>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`space-y-3 rounded-[20px] border p-3 transition-colors sm:p-4 ${
        set.isWarmup
          ? "border-[#F1D99B] bg-[#FFF8E9]"
          : "border-[#EEE9F0] bg-[#F8F6F9]"
      }`}
    >
      <div className="grid grid-cols-[32px_minmax(0,1fr)_minmax(0,1fr)_36px] items-end gap-2 sm:gap-3">
        {/* Номер подхода */}
        <div className="flex h-11 items-center justify-center">
          <div
            className={`flex size-9 items-center justify-center rounded-xl text-sm font-extrabold tabular-nums ${
              set.isWarmup
                ? "bg-[#EDBE65] text-[#302C33]"
                : "bg-[#302C33] text-white"
            }`}
          >
            {index + 1}
          </div>
        </div>

        {/* Вес */}
        <div className="min-w-0 space-y-1.5">
          <Label className="text-[11px] font-semibold text-[#82768A]">
            Вес, кг
          </Label>

          <Input
            type="number"
            min={0}
            step="0.5"
            aria-label={`Вес подхода ${index + 1}`}
            value={set.weight}
            onChange={(event) =>
              onChange({
                weight: event.target.value,
              })
            }
            className="h-11 min-w-0 rounded-xl border-[#E6E0E9] bg-white text-center text-base font-bold tabular-nums text-[#302C33] focus-visible:border-[#AA91B5] focus-visible:ring-[#AA91B5]/20"
          />
        </div>

        {/* Повторения */}
        <div className="min-w-0 space-y-1.5">
          <Label className="text-[11px] font-semibold text-[#82768A]">
            Повторы
          </Label>

          <Input
            type="number"
            min={1}
            step={1}
            aria-label={`Повторения подхода ${index + 1}`}
            value={set.reps}
            onChange={(event) =>
              onChange({
                reps: event.target.value,
              })
            }
            className="h-11 min-w-0 rounded-xl border-[#E6E0E9] bg-white text-center text-base font-bold tabular-nums text-[#302C33] focus-visible:border-[#AA91B5] focus-visible:ring-[#AA91B5]/20"
          />
        </div>

        {/* Удаление */}
        <button
          type="button"
          aria-label={`Удалить подход ${index + 1}`}
          disabled={!canRemove}
          onClick={onRemove}
          className="flex size-9 cursor-pointer items-center justify-center rounded-xl text-[#A093A6] transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Trash2 size={17} />
        </button>
      </div>

      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-t pt-3 ${
          set.isWarmup ? "border-[#F1DEA9]" : "border-[#E9E3EC]"
        }`}
      >
        {/* Разминочный подход */}
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={set.isWarmup}
            onChange={(event) =>
              onChange({
                isWarmup: event.target.checked,
              })
            }
            className="size-4 cursor-pointer accent-[#C69A41]"
          />

          <span
            className={`flex items-center gap-1.5 text-xs font-bold ${
              set.isWarmup ? "text-[#9A702B]" : "text-[#82768A]"
            }`}
          >
            <Flame size={14} />
            Разминка
          </span>
        </label>

        {/* Отдых */}
        <div className="flex items-center gap-2">
          <Timer size={15} className="text-[#82768A]" />

          <Label
            htmlFor={`rest-${set.localId}`}
            className="text-xs font-medium text-[#82768A]"
          >
            Отдых
          </Label>

          <Input
            id={`rest-${set.localId}`}
            type="number"
            min={0}
            step={1}
            value={set.restSeconds}
            onChange={(event) =>
              onChange({
                restSeconds: event.target.value,
              })
            }
            className="h-9 w-19 rounded-xl border-[#E6E0E9] bg-white text-center text-sm font-bold tabular-nums"
          />

          <span className="text-xs text-[#82768A]">сек</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Страница конструктора
// ==========================================

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

  const createMutation = useMutation({
    mutationFn: createWorkout,

    onSuccess: async (workout) => {
      await queryClient.invalidateQueries({
        queryKey: workoutKeys.all,
      });

      navigate(`/workouts/${workout.id}`);
    },

    onError: () => {
      setError("Не удалось создать тренировку. Проверь данные и подключение.");
    },
  });

  // ========================================
  // Управление упражнениями
  // ========================================

  function addExercise() {
    const exerciseId = Number(selectedExercise);

    if (
      !Number.isSafeInteger(exerciseId) ||
      exerciseId <= 0 ||
      !exercises.some((item) => item.id === exerciseId)
    ) {
      return;
    }

    setPlanned((current) => [...current, makeExercise(exerciseId)]);

    setSelectedExercise("");
    setError("");
  }

  function removeExercise(localId: string) {
    setPlanned((current) => current.filter((item) => item.localId !== localId));

    setError("");
  }

  function moveExercise(index: number, direction: -1 | 1) {
    setPlanned((current) => {
      const target = index + direction;

      if (target < 0 || target >= current.length) {
        return current;
      }

      const updated = [...current];

      [updated[index], updated[target]] = [updated[target], updated[index]];

      return updated;
    });
  }

  // ========================================
  // Управление подходами
  // ========================================

  function updateSet(
    exerciseLocalId: string,
    setLocalId: string,
    changes: Partial<PlannedSet>,
  ) {
    setPlanned((current) =>
      current.map((exercise) => {
        if (exercise.localId !== exerciseLocalId) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets.map((set) =>
            set.localId === setLocalId ? { ...set, ...changes } : set,
          ),
        };
      }),
    );
  }

  function addSet(exerciseLocalId: string) {
    setPlanned((current) =>
      current.map((exercise) => {
        if (exercise.localId !== exerciseLocalId) {
          return exercise;
        }

        const previous = exercise.sets[exercise.sets.length - 1];

        return {
          ...exercise,
          sets: [...exercise.sets, makeSet(previous)],
        };
      }),
    );
  }

  function removeSet(exerciseLocalId: string, setLocalId: string) {
    setPlanned((current) =>
      current.map((exercise) => {
        if (exercise.localId !== exerciseLocalId || exercise.sets.length <= 1) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets.filter((set) => set.localId !== setLocalId),
        };
      }),
    );
  }

  // ========================================
  // Сохранение
  // ========================================

  function handleSave() {
    if (createMutation.isPending) return;

    setError("");

    if (planned.length === 0) {
      setError("Добавь хотя бы одно упражнение.");
      return;
    }

    if (
      planned.some(
        (exercise) =>
          exercise.sets.length === 0 ||
          exercise.sets.some((set) => !isValidSet(set)),
      )
    ) {
      setError("Проверь вес, повторения и время отдыха во всех подходах.");
      return;
    }

    if (notes.length > 5000) {
      setError("Заметки не должны превышать 5000 символов.");
      return;
    }

    createMutation.mutate({
      notes: notes.trim(),

      exercises: planned.map((exercise) => {
        const sets: SetPlanPayload[] = exercise.sets.map((set) => ({
          plannedWeightKg: Number(set.weight),
          plannedReps: Number(set.reps),
          restSeconds: Number(set.restSeconds),
          isWarmup: set.isWarmup,
        }));

        return {
          exerciseId: exercise.exerciseId,
          sets,
        };
      }),
    });
  }

  const totalSets = planned.reduce(
    (sum, exercise) => sum + exercise.sets.length,
    0,
  );

  const warmupSets = planned.reduce(
    (sum, exercise) => sum + exercise.sets.filter((set) => set.isWarmup).length,
    0,
  );

  const workSets = totalSets - warmupSets;

  return (
    <main className="min-h-screen bg-[#F6F1F8] px-4 py-7 pb-28 text-[#302C33] sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* ==================================
            Заголовок страницы
        ================================== */}
        <header>
          <Link
            to="/workouts"
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#82768A] transition-colors hover:text-[#302C33]"
          >
            <ArrowLeft size={17} />
            Все тренировки
          </Link>

          <div className="mt-7 flex items-start gap-4">
            <div className="mt-1 hidden h-18 w-1.5 shrink-0 rounded-full bg-[#EDBE65] sm:block" />

            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#927AA0]">
                REPBOOK / NEW WORKOUT
              </p>

              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Новая тренировка
              </h1>

              <p className="mt-2 text-sm text-[#82768A]">
                Построй тренировку под себя.
              </p>
            </div>
          </div>
        </header>

        {/* ==================================
            Быстрая статистика плана
        ================================== */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-[22px] bg-[#302C33] p-4">
            <div className="flex items-center gap-2 text-[#EDBE65]">
              <Dumbbell size={16} />
              <span className="text-[11px] font-semibold">Упражнения</span>
            </div>

            <p className="mt-4 text-3xl font-extrabold tabular-nums text-white">
              {planned.length}
            </p>
          </div>

          <div className="rounded-[22px] bg-white p-4">
            <div className="flex items-center gap-2 text-[#927AA0]">
              <Layers3 size={16} />
              <span className="text-[11px] font-semibold">Рабочие</span>
            </div>

            <p className="mt-4 text-3xl font-extrabold tabular-nums">
              {workSets}
            </p>
          </div>

          <div className="rounded-[22px] bg-[#FFF2D6] p-4">
            <div className="flex items-center gap-2 text-[#A47A32]">
              <Flame size={16} />
              <span className="text-[11px] font-semibold">Разминка</span>
            </div>

            <p className="mt-4 text-3xl font-extrabold tabular-nums">
              {warmupSets}
            </p>
          </div>
        </div>

        {/* ==================================
            Добавление упражнения
        ================================== */}
        <SquircleCard className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-[18px] bg-[#302C33] text-[#EDBE65]">
              <Plus size={23} />
            </div>

            <div>
              <h2 className="font-extrabold">Добавить упражнение</h2>

              <p className="mt-1 text-xs text-[#82768A]">
                Выбери из библиотеки repbook
              </p>
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
                onClick={() => void exercisesQuery.refetch()}
                className="cursor-pointer rounded-2xl"
              >
                Повторить
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                aria-label="Выбрать упражнение"
                value={selectedExercise}
                disabled={exercisesQuery.isPending}
                onChange={(event) => setSelectedExercise(event.target.value)}
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
                disabled={!selectedExercise || createMutation.isPending}
                onClick={addExercise}
                className="h-12 cursor-pointer rounded-2xl bg-[#302C33] px-6 font-bold text-white hover:bg-[#48424B] disabled:cursor-not-allowed"
              >
                <Plus size={17} />
                Добавить
              </Button>
            </div>
          )}

          {exercisesQuery.isSuccess && exercises.length === 0 && (
            <p className="text-sm text-[#82768A]">
              Библиотека пуста.{" "}
              <Link
                to="/exercises"
                className="cursor-pointer font-semibold text-[#927AA0] underline"
              >
                Создать упражнение
              </Link>
            </p>
          )}
        </SquircleCard>

        {/* ==================================
            Список упражнений
        ================================== */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">План тренировки</h2>

          <span className="rounded-full bg-[#302C33] px-4 py-2 text-xs font-bold text-[#EDBE65]">
            {totalSets} подходов
          </span>
        </div>

        {planned.length === 0 ? (
          <SquircleCard className="py-14 text-center">
            <div className="mx-auto flex size-17 items-center justify-center rounded-[24px] bg-[#FFF2D6] text-[#A47A32]">
              <Dumbbell size={33} />
            </div>

            <h3 className="mt-5 text-lg font-extrabold">План пока пуст</h3>

            <p className="mt-2 text-sm text-[#82768A]">
              Добавь первое упражнение.
            </p>
          </SquircleCard>
        ) : (
          <div className="space-y-5">
            {planned.map((item, exerciseIndex) => {
              const exercise = exercises.find(
                (value) => value.id === item.exerciseId,
              );

              const exerciseWarmups = item.sets.filter(
                (set) => set.isWarmup,
              ).length;

              return (
                <SquircleCard key={item.localId} className="space-y-5">
                  {/* Заголовок упражнения */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-[18px] bg-[#302C33] text-lg font-extrabold text-[#EDBE65] tabular-nums">
                        {String(exerciseIndex + 1).padStart(2, "0")}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-lg font-extrabold">
                          {exercise?.name ?? `Упражнение #${item.exerciseId}`}
                        </h3>

                        <p className="mt-1 text-xs text-[#82768A]">
                          {exercise?.muscleGroup?.name ?? "Без группы"}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        aria-label="Переместить упражнение выше"
                        disabled={exerciseIndex === 0}
                        onClick={() => moveExercise(exerciseIndex, -1)}
                        className="flex size-9 cursor-pointer items-center justify-center rounded-xl text-[#82768A] transition-colors hover:bg-[#F1EBF3] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowUp size={17} />
                      </button>

                      <button
                        type="button"
                        aria-label="Переместить упражнение ниже"
                        disabled={exerciseIndex === planned.length - 1}
                        onClick={() => moveExercise(exerciseIndex, 1)}
                        className="flex size-9 cursor-pointer items-center justify-center rounded-xl text-[#82768A] transition-colors hover:bg-[#F1EBF3] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowDown size={17} />
                      </button>

                      <button
                        type="button"
                        aria-label="Удалить упражнение"
                        onClick={() => removeExercise(item.localId)}
                        className="flex size-9 cursor-pointer items-center justify-center rounded-xl text-[#82768A] transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  {/* Счётчик подходов */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#F0EAF3] px-3 py-1.5 text-[11px] font-bold text-[#806B8E]">
                      {item.sets.length} подходов
                    </span>

                    {exerciseWarmups > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-[#FFF2D6] px-3 py-1.5 text-[11px] font-bold text-[#A47A32]">
                        <Flame size={12} />
                        {exerciseWarmups} разм.
                      </span>
                    )}
                  </div>

                  {/* Индивидуальные подходы */}
                  <div className="space-y-3">
                    {item.sets.map((set, setIndex) => (
                      <PlannedSetRow
                        key={set.localId}
                        set={set}
                        index={setIndex}
                        canRemove={item.sets.length > 1}
                        onChange={(changes) =>
                          updateSet(item.localId, set.localId, changes)
                        }
                        onRemove={() => removeSet(item.localId, set.localId)}
                      />
                    ))}
                  </div>

                  {/* Добавить подход */}
                  <button
                    type="button"
                    onClick={() => addSet(item.localId)}
                    className="group flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#CBBBD2] bg-[#F9F6FA] text-sm font-bold text-[#806B8E] transition-all hover:border-[#EDBE65] hover:bg-[#FFF6E4] hover:text-[#8B6624]"
                  >
                    <Plus
                      size={17}
                      className="transition-transform group-hover:rotate-90"
                    />
                    Добавить подход
                  </button>
                </SquircleCard>
              );
            })}
          </div>
        )}

        {/* ==================================
            Заметки
        ================================== */}
        <SquircleCard className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#EDBE65]" />

            <Label htmlFor="workout-notes" className="text-base font-extrabold">
              Заметки к тренировке
            </Label>
          </div>

          <Textarea
            id="workout-notes"
            value={notes}
            maxLength={5000}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Необязательно"
            className="min-h-24 resize-none rounded-2xl border-[#E9DFEC] bg-[#F9F6FA] p-4"
          />
        </SquircleCard>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        {/* ==================================
            Сохранение
        ================================== */}
        <div className="rounded-[28px] bg-[#302C33] p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#EDBE65]">
                <Check size={18} />

                <p className="text-sm font-bold">Твой план</p>
              </div>

              <p className="mt-2 text-sm text-white/65">
                {planned.length} упражнений · {totalSets} подходов
              </p>
            </div>

            <Button
              type="button"
              disabled={createMutation.isPending || planned.length === 0}
              onClick={handleSave}
              className="h-13 w-full cursor-pointer rounded-2xl bg-[#EDBE65] px-7 font-extrabold text-[#302C33] transition-colors hover:bg-[#E2AD50] disabled:cursor-not-allowed sm:w-auto"
            >
              {createMutation.isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  Создать тренировку
                  <ChevronRight size={18} />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
