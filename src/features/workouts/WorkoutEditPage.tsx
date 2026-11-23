import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import {
  ArrowLeft,
  Check,
  Dumbbell,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SquircleCard } from "@/components/repbook/SquircleCard";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  getWorkout,
  workoutKeys,
  updateWorkoutNotes,
  updateExercisePlan,
  addExerciseToWorkout,
  removeExerciseFromWorkout,
  type WorkoutExercise,
  type SetPlanPayload,
} from "./workouts-api";

import { getExercises, exerciseKeys } from "@/features/exercises/exercises-api";

// ------------------------------
// Вспомогательные функции
// ------------------------------

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string") {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Не удалось сохранить изменения.";
}

interface EditableSet {
  localId: string;
  weight: string;
  reps: string;
  isWarmup: boolean;
  restSeconds: number;
  notes: string;
}

function createEmptySet(): EditableSet {
  return {
    localId: crypto.randomUUID(),
    weight: "0",
    reps: "10",
    isWarmup: false,
    restSeconds: 120,
    notes: "",
  };
}

function createEditableSets(item: WorkoutExercise): EditableSet[] {
  const sets = [...(item.sets ?? [])]
    .sort((a, b) => a.setNumber - b.setNumber)
    .filter((set) => !set.isCompleted);

  if (sets.length === 0) {
    return [createEmptySet()];
  }

  return sets.map((set) => ({
    localId: crypto.randomUUID(),
    weight: String(set.plannedWeightKg ?? 0),
    reps: String(set.plannedReps ?? 10),
    isWarmup: set.isWarmup ?? false,
    restSeconds: set.restSeconds ?? 120,
    notes: set.notes ?? "",
  }));
}

// ------------------------------
// Редактор одного упражнения
// ------------------------------

function ExerciseEditor({
  item,
  workoutId,
  onChanged,
}: {
  item: WorkoutExercise;
  workoutId: number;
  onChanged: () => Promise<unknown>;
}) {
  const [sets, setSets] = useState<EditableSet[]>(() =>
    createEditableSets(item),
  );

  const [notes, setNotes] = useState(item.notes ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (payload: { notes: string; sets: SetPlanPayload[] }) =>
      updateExercisePlan(workoutId, item.id, payload),

    onSuccess: async () => {
      await onChanged();
      setError("");
      setSaved(true);
    },

    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => removeExerciseFromWorkout(workoutId, item.id),

    onSuccess: async () => {
      await onChanged();
      setDeleteOpen(false);
    },

    onError: (err) => {
      setError(getErrorMessage(err));
      setDeleteOpen(false);
    },
  });

  function updateSet(localId: string, changes: Partial<EditableSet>) {
    setSaved(false);

    setSets((current) =>
      current.map((set) =>
        set.localId === localId ? { ...set, ...changes } : set,
      ),
    );
  }

  function addSet() {
    const previous = sets[sets.length - 1];

    setSets((current) => [
      ...current,
      {
        ...createEmptySet(),
        weight: previous?.weight ?? "0",
        reps: previous?.reps ?? "10",
        restSeconds: previous?.restSeconds ?? 120,
      },
    ]);

    setSaved(false);
  }

  function removeSet(localId: string) {
    if (sets.length <= 1) return;

    setSets((current) => current.filter((set) => set.localId !== localId));

    setSaved(false);
  }

  function savePlan() {
    setError("");
    setSaved(false);

    if (sets.length === 0) {
      setError("Добавь хотя бы один подход.");
      return;
    }

    if (notes.length > 500) {
      setError("Заметки слишком длинные.");
      return;
    }

    const invalid = sets.some((set) => {
      const weight = Number(set.weight);
      const reps = Number(set.reps);

      return (
        set.weight.trim() === "" ||
        !Number.isFinite(weight) ||
        weight < 0 ||
        set.reps.trim() === "" ||
        !Number.isInteger(reps) ||
        reps < 1 ||
        !Number.isInteger(set.restSeconds) ||
        set.restSeconds < 0 ||
        set.notes.length > 500
      );
    });

    if (invalid) {
      setError("Проверь значения подходов.");
      return;
    }

    const payload: SetPlanPayload[] = sets.map((set) => ({
      plannedWeightKg: Number(set.weight),
      plannedReps: Number(set.reps),
      isWarmup: set.isWarmup,
      restSeconds: set.restSeconds,
      notes: set.notes.trim(),
    }));

    saveMutation.mutate({
      notes: notes.trim(),
      sets: payload,
    });
  }

  return (
    <SquircleCard className="space-y-5">
      {/* Заголовок упражнения */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-[18px] bg-[#EFE7F2] text-[#927AA0]">
            <Dumbbell size={23} />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold">
              {item.exercise.name}
            </h2>

            <p className="mt-1 text-xs text-[#82768A]">
              {item.exercise.muscleGroup?.name ?? "Без группы"}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label={`Удалить ${item.exercise.name}`}
          onClick={() => setDeleteOpen(true)}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[#82768A] transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Подходы */}
      <div className="space-y-3">
        <div className="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_32px] items-center gap-2 px-1 text-xs text-[#82768A]">
          <span>№</span>
          <span>Вес, кг</span>
          <span>Повторы</span>
          <span />
        </div>

        {sets.map((set, index) => (
          <div
            key={set.localId}
            className="space-y-3 rounded-[20px] bg-[#F8F5F9] p-3"
          >
            <div className="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_32px] items-center gap-2">
              <span className="text-center text-sm font-bold text-[#927AA0]">
                {index + 1}
              </span>

              <Input
                type="number"
                aria-label={`Вес подхода ${index + 1}`}
                min={0}
                step="0.5"
                value={set.weight}
                onChange={(e) =>
                  updateSet(set.localId, {
                    weight: e.target.value,
                  })
                }
                className="h-11 min-w-0 rounded-xl border-[#E9DFEC] bg-white text-center"
              />

              <Input
                type="number"
                aria-label={`Повторения подхода ${index + 1}`}
                min={1}
                step={1}
                value={set.reps}
                onChange={(e) =>
                  updateSet(set.localId, {
                    reps: e.target.value,
                  })
                }
                className="h-11 min-w-0 rounded-xl border-[#E9DFEC] bg-white text-center"
              />

              <button
                type="button"
                aria-label={`Удалить подход ${index + 1}`}
                disabled={sets.length === 1}
                onClick={() => removeSet(set.localId)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#A093A6] transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EBE4EE] pt-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#806B8E]">
                <input
                  type="checkbox"
                  checked={set.isWarmup}
                  onChange={(e) =>
                    updateSet(set.localId, {
                      isWarmup: e.target.checked,
                    })
                  }
                  className="size-4 cursor-pointer accent-[#AA91B5]"
                />
                Разминка
              </label>

              <div className="flex items-center gap-2">
                <Label
                  htmlFor={`rest-${set.localId}`}
                  className="text-xs text-[#82768A]"
                >
                  Отдых, сек
                </Label>

                <Input
                  id={`rest-${set.localId}`}
                  type="number"
                  min={0}
                  step={1}
                  value={set.restSeconds}
                  onChange={(e) =>
                    updateSet(set.localId, {
                      restSeconds: e.target.valueAsNumber,
                    })
                  }
                  className="h-9 w-19 rounded-xl bg-white text-center"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSet}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#CBBBD2] text-sm font-bold text-[#806B8E] transition-colors hover:bg-[#F4EFF6]"
      >
        <Plus size={17} />
        Добавить подход
      </button>

      {/* Заметки упражнения */}
      <div className="space-y-2">
        <Label htmlFor={`notes-${item.id}`}>Заметки</Label>

        <Textarea
          id={`notes-${item.id}`}
          value={notes}
          maxLength={500}
          onChange={(event) => {
            setNotes(event.target.value);
            setSaved(false);
          }}
          placeholder="Необязательно"
          className="min-h-18 resize-none rounded-2xl bg-[#F9F6FA]"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <div aria-live="polite">
          {saved && (
            <span className="flex items-center gap-1 text-xs font-semibold text-[#806B8E]">
              <Check size={15} />
              Сохранено
            </span>
          )}
        </div>

        <Button
          type="button"
          disabled={saveMutation.isPending}
          onClick={savePlan}
          className="h-11 cursor-pointer rounded-2xl bg-[#EDBE65] px-5 font-bold text-[#302C33] hover:bg-[#E2AD50] disabled:cursor-not-allowed"
        >
          {saveMutation.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Сохранить
        </Button>
      </div>

      {/* Подтверждение удаления */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-[28px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить упражнение?</AlertDialogTitle>

            <AlertDialogDescription>
              «{item.exercise.name}» и его подходы будут удалены из этой
              тренировки. Само упражнение останется в библиотеке.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer rounded-xl">
              Отмена
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                deleteMutation.mutate();
              }}
              className="cursor-pointer rounded-xl bg-red-600 text-white hover:bg-red-700"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SquircleCard>
  );
}

// ------------------------------
// Основная страница
// ------------------------------

export function WorkoutEditPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const workoutId = Number(id);
  const validId = Number.isSafeInteger(workoutId) && workoutId > 0;

  const [selectedExercise, setSelectedExercise] = useState("");
  const [pageError, setPageError] = useState("");

  const workoutQuery = useQuery({
    queryKey: workoutKeys.detail(workoutId),
    queryFn: () => getWorkout(workoutId),
    enabled: validId,
  });

  const exercisesQuery = useQuery({
    queryKey: exerciseKeys.all,
    queryFn: getExercises,
  });

  const workout = workoutQuery.data;

  async function refreshWorkout() {
    await queryClient.invalidateQueries({
      queryKey: workoutKeys.all,
    });
  }

  const addMutation = useMutation({
    mutationFn: () =>
      addExerciseToWorkout(workoutId, {
        exerciseId: Number(selectedExercise),
        plannedSets: 3,
        plannedReps: 10,
        plannedWeightKg: 0,
      }),

    onSuccess: async () => {
      setSelectedExercise("");
      setPageError("");
      await refreshWorkout();
    },

    onError: (error) => {
      setPageError(getErrorMessage(error));
    },
  });

  if (!validId || workoutQuery.isError) {
    return (
      <main className="min-h-screen bg-[#F6F1F8] p-6">
        <div className="mx-auto max-w-2xl">
          <SquircleCard className="space-y-4 text-center">
            <h1 className="text-xl font-bold">Не удалось открыть тренировку</h1>
            <Link
              to="/workouts"
              className="cursor-pointer text-sm font-semibold text-[#806B8E] underline"
            >
              К тренировкам
            </Link>
          </SquircleCard>
        </div>
      </main>
    );
  }

  if (workoutQuery.isPending || !workout) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F6F1F8]">
        <LoaderCircle className="size-7 animate-spin text-[#AA91B5]" />
      </main>
    );
  }

  if (workout.status !== "PLANNED") {
    return (
      <main className="min-h-screen bg-[#F6F1F8] p-6">
        <div className="mx-auto max-w-2xl">
          <SquircleCard className="space-y-4 text-center">
            <h1 className="text-xl font-bold">Редактирование недоступно</h1>
            <p className="text-sm text-[#82768A]">
              Изменять план можно только до начала тренировки.
            </p>
            <Button asChild className="cursor-pointer">
              <Link to={`/workouts/${workoutId}`}>К тренировке</Link>
            </Button>
          </SquircleCard>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F1F8] px-4 py-7 pb-24 text-[#302C33] sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Заголовок */}
        <header>
          <Link
            to={`/workouts/${workoutId}`}
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#82768A] hover:text-[#302C33]"
          >
            <ArrowLeft size={17} />
            Назад
          </Link>

          <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
            Редактировать план
          </h1>

          <p className="mt-2 text-sm text-[#82768A]">
            Тренировка #{workout.id}
          </p>
        </header>

        {/* Заметки тренировки */}
        <WorkoutNotesEditor
          key={workout.id}
          workoutId={workoutId}
          initialNotes={workout.notes ?? ""}
          onChanged={refreshWorkout}
        />

        {/* Добавление упражнения */}
        <SquircleCard className="space-y-4">
          <h2 className="text-lg font-extrabold">Добавить упражнение</h2>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              aria-label="Выбрать упражнение"
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              disabled={exercisesQuery.isPending}
              className="h-12 min-w-0 flex-1 cursor-pointer rounded-2xl border border-[#E9DFEC] bg-[#F9F6FA] px-4 text-sm focus-visible:outline-2 focus-visible:outline-[#AA91B5]"
            >
              <option value="">Выбрать упражнение</option>

              {(exercisesQuery.data ?? []).map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>

            <Button
              type="button"
              disabled={!selectedExercise || addMutation.isPending}
              onClick={() => addMutation.mutate()}
              className="h-12 cursor-pointer rounded-2xl bg-[#302C33] px-5 font-bold text-white hover:bg-[#48424B] disabled:cursor-not-allowed"
            >
              <Plus size={17} />
              Добавить
            </Button>
          </div>

          {exercisesQuery.isError && (
            <p role="alert" className="text-sm text-red-600">
              Не удалось загрузить библиотеку.
            </p>
          )}

          {pageError && (
            <p role="alert" className="text-sm text-red-600">
              {pageError}
            </p>
          )}
        </SquircleCard>

        {/* Список упражнений */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Упражнения</h2>

          <span className="rounded-full bg-[#E9DFEC] px-3 py-1.5 text-xs font-bold text-[#806B8E]">
            {workout.exercises?.length ?? 0}
          </span>
        </div>

        {(workout.exercises ?? []).length === 0 ? (
          <SquircleCard className="py-12 text-center">
            <Dumbbell className="mx-auto size-9 text-[#AA91B5]" />

            <p className="mt-4 font-bold">Пока нет упражнений</p>
          </SquircleCard>
        ) : (
          <div className="space-y-4">
            {(workout.exercises ?? []).map((item) => (
              <ExerciseEditor
                key={item.id}
                item={item}
                workoutId={workoutId}
                onChanged={refreshWorkout}
              />
            ))}
          </div>
        )}

        <Button
          asChild
          className="h-13 w-full cursor-pointer rounded-2xl bg-[#EDBE65] font-extrabold text-[#302C33] hover:bg-[#E2AD50]"
        >
          <Link to={`/workouts/${workoutId}`}>Вернуться к тренировке</Link>
        </Button>
      </div>
    </main>
  );
}

// ------------------------------
// Редактор заметок тренировки
// ------------------------------

function WorkoutNotesEditor({
  workoutId,
  initialNotes,
  onChanged,
}: {
  workoutId: number;
  initialNotes: string;
  onChanged: () => Promise<unknown>;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => updateWorkoutNotes(workoutId, notes.trim()),

    onSuccess: async () => {
      await onChanged();
      setSaved(true);
    },
  });

  return (
    <SquircleCard className="space-y-3">
      <Label htmlFor="workout-edit-notes" className="font-bold">
        Заметки к тренировке
      </Label>

      <Textarea
        id="workout-edit-notes"
        value={notes}
        maxLength={5000}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        placeholder="Необязательно"
        className="min-h-24 resize-none rounded-2xl bg-[#F9F6FA] p-4"
      />

      <div className="flex items-center justify-between">
        <span aria-live="polite" className="text-xs text-[#806B8E]">
          {saved ? "Сохранено" : ""}
        </span>

        <Button
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          className="cursor-pointer rounded-2xl bg-[#302C33] px-5 text-white hover:bg-[#48424B]"
        >
          <Save size={16} />
          Сохранить заметки
        </Button>
      </div>

      {mutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          {getErrorMessage(mutation.error)}
        </p>
      )}
    </SquircleCard>
  );
}
