import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CheckCircle2, Clock3, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { SquircleCard } from "@/components/repbook/SquircleCard";

import {
  addWorkoutSet,
  cancelWorkout,
  finishWorkout,
  getWorkout,
  updateWorkoutSet,
  workoutKeys,
  type WorkoutSet,
} from "./workouts-api";

import {
  AddWorkoutExercise,
  DeleteWorkoutSetButton,
} from "./WorkoutSessionTools";

import {
  RestTimer,
  startRestTimer,
  clearRestTimer,
  unlockRestAudio,
} from "./WorkoutRestTimer";

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [hours, minutes, secs]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function WorkoutTimer({ startedAt }: { startedAt: string }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    function update() {
      const elapsed = Math.max(
        0,
        Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
      );

      setSeconds(Number.isFinite(elapsed) ? elapsed : 0);
    }

    update();
    const interval = window.setInterval(update, 1000);

    return () => window.clearInterval(interval);
  }, [startedAt]);

  return (
    <SquircleCard variant="dark" className="flex items-center justify-between">
      <div>
        <p className="text-sm text-white/60">Время тренировки</p>
        <p className="mt-2 text-4xl font-extrabold tabular-nums tracking-tight text-white">
          {formatTime(seconds)}
        </p>
      </div>

      <div className="flex size-16 items-center justify-center rounded-[22px] bg-[#EDBE65] text-[#302C33]">
        <Clock3 size={29} strokeWidth={1.8} />
      </div>
    </SquircleCard>
  );
}

interface SetRowProps {
  set: WorkoutSet;
  workoutId: number;
  onUpdated: () => Promise<unknown>;
}

function SetRow({ set, workoutId, onUpdated }: SetRowProps) {
  const [weight, setWeight] = useState(
    String(set.weightKg ?? set.plannedWeightKg ?? 0),
  );

  const [reps, setReps] = useState(String(set.reps ?? set.plannedReps ?? 10));

  const [rir, setRir] = useState(set.rir == null ? "" : String(set.rir));

  const mutation = useMutation({
    mutationFn: () => {
      const actualWeight = Number(weight);
      const actualReps = Number(reps);

      if (
        weight.trim() === "" ||
        !Number.isFinite(actualWeight) ||
        actualWeight < 0 ||
        reps.trim() === "" ||
        !Number.isInteger(actualReps) ||
        actualReps < 1
      ) {
        throw new Error("Проверь вес и повторения");
      }

      const payload: {
        weightKg: number;
        reps: number;
        rir?: number;
        isCompleted: boolean;
      } = {
        weightKg: actualWeight,
        reps: actualReps,
        isCompleted: true,
      };

      if (rir.trim()) {
        const rirValue = Number(rir);

        if (!Number.isFinite(rirValue) || rirValue < 0 || rirValue > 10) {
          throw new Error("RIR должен быть от 0 до 10");
        }

        payload.rir = rirValue;
      }

      return updateWorkoutSet(workoutId, set.id, payload);
    },
    onSuccess: async () => {
      startRestTimer(workoutId, set.restSeconds);
      await onUpdated();
    },
  });

  if (set.isCompleted) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#F0EDF3] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#DCD1E2] text-[#806B8E]">
            <Check size={18} />
          </div>

          <div>
            <p className="text-sm font-bold text-[#302C33]">
              Подход {set.setNumber}
            </p>
            <p className="mt-0.5 text-xs text-[#82768A]">
              {set.weightKg ?? 0} кг × {set.reps ?? "—"}
            </p>
          </div>
        </div>

        <CheckCircle2 className="size-5 text-[#8E77A0]" />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[22px] bg-[#F8F5F9] p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[#302C33]">
          Подход {set.setNumber}
        </span>

        {set.isWarmup && (
          <span className="text-xs text-[#8E77A0]">Разминка</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-[#82768A]">Вес, кг</Label>
          <Input
            aria-label={`Вес подхода ${set.setNumber}`}
            type="number"
            min={0}
            step="0.5"
            value={weight}
            disabled={mutation.isPending}
            onChange={(e) => setWeight(e.target.value)}
            className="h-11 rounded-xl bg-white text-center"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-[#82768A]">Повторы</Label>
          <Input
            aria-label={`Повторы подхода ${set.setNumber}`}
            type="number"
            min={1}
            step={1}
            value={reps}
            disabled={mutation.isPending}
            onChange={(e) => setReps(e.target.value)}
            className="h-11 rounded-xl bg-white text-center"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-[#82768A]">RIR</Label>
          <Input
            aria-label={`RIR подхода ${set.setNumber}`}
            type="number"
            min={0}
            max={10}
            step={1}
            placeholder="—"
            value={rir}
            disabled={mutation.isPending}
            onChange={(e) => setRir(e.target.value)}
            className="h-11 rounded-xl bg-white text-center"
          />
        </div>
      </div>

      <Button
        type="button"
        disabled={mutation.isPending}
        onClick={() => {
          unlockRestAudio();
          mutation.mutate();
        }}
        className="h-11 w-full cursor-pointer rounded-2xl bg-[#302C33] font-bold text-white hover:bg-[#49434C] disabled:cursor-not-allowed"
      >
        <Check size={17} />
        {mutation.isPending ? "Сохранение..." : "Выполнено"}
      </Button>

      {mutation.isError && (
        <p role="alert" className="text-xs text-red-600">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Ошибка сохранения подхода"}
        </p>
      )}
    </div>
  );
}

export function ActiveWorkoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const workoutId = Number(id);
  const validId = Number.isSafeInteger(workoutId) && workoutId > 0;

  const [finishOpen, setFinishOpen] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [bodyWeight, setBodyWeight] = useState("");

  const workoutQuery = useQuery({
    queryKey: workoutKeys.detail(workoutId),
    queryFn: () => getWorkout(workoutId),
    enabled: validId,
    refetchOnMount: "always",
  });

  async function refreshWorkout() {
    await queryClient.invalidateQueries({
      queryKey: workoutKeys.all,
    });
  }

  const finishMutation = useMutation({
    mutationFn: () => {
      if (bodyWeight.trim()) {
        const value = Number(bodyWeight);

        if (!Number.isFinite(value) || value < 0) {
          throw new Error("Проверь вес тела");
        }
      }

      return finishWorkout(workoutId, {
        ...(mood !== null ? { mood } : {}),
        ...(bodyWeight.trim() ? { bodyWeightKg: Number(bodyWeight) } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
    },

    onSuccess: async (updatedWorkout) => {
      clearRestTimer(workoutId);
      queryClient.setQueryData(workoutKeys.detail(workoutId), updatedWorkout);

      await queryClient.invalidateQueries({
        queryKey: workoutKeys.all,
      });

      setFinishOpen(false);

      navigate(`/workouts/${workoutId}/summary`, {
        replace: true,
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelWorkout(workoutId),

    onSuccess: async (updatedWorkout) => {
      clearRestTimer(workoutId);

      queryClient.setQueryData(workoutKeys.detail(workoutId), updatedWorkout);

      await queryClient.invalidateQueries({
        queryKey: workoutKeys.all,
      });

      navigate("/workouts", {
        replace: true,
      });
    },
  });

  const workout = workoutQuery.data;
  const exercises = workout?.exercises ?? [];

  const totalSets = exercises.reduce(
    (sum, exercise) => sum + exercise.sets.length,
    0,
  );

  const completedSets = exercises.reduce(
    (sum, exercise) =>
      sum + exercise.sets.filter((set) => set.isCompleted).length,
    0,
  );

  if (!validId || workoutQuery.isError) {
    return (
      <main className="min-h-screen bg-[#F6F1F8] p-6">
        <p className="text-center text-[#302C33]">
          Не удалось открыть тренировку.
        </p>
        <Link
          className="mt-4 block cursor-pointer text-center underline"
          to="/workouts"
        >
          Назад к тренировкам
        </Link>
      </main>
    );
  }

  if (workoutQuery.isPending || !workout) {
    return (
      <main className="min-h-screen bg-[#F6F1F8] p-8 text-center text-[#82768A]">
        Загрузка...
      </main>
    );
  }

  if (workout.status !== "IN_PROGRESS") {
    return (
      <main className="min-h-screen bg-[#F6F1F8] p-6">
        <div className="mx-auto max-w-xl">
          <SquircleCard className="space-y-4 text-center">
            <h1 className="text-xl font-bold">Тренировка не активна</h1>
            <p className="text-sm text-[#82768A]">
              Открой её из списка тренировок.
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
    <main className="min-h-screen bg-[#F6F1F8] px-4 py-6 pb-28 text-[#302C33] sm:px-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="flex items-center justify-between">
          <Link
            to={`/workouts/${workoutId}`}
            aria-label="Назад к тренировке"
            className="flex size-11 cursor-pointer items-center justify-center rounded-2xl bg-white text-[#302C33]"
          >
            <ArrowLeft size={20} />
          </Link>

          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#927AA0]">
            REPBOOK
          </span>

          <span className="rounded-full bg-[#E9DFEC] px-3 py-2 text-xs font-bold text-[#806B8E]">
            В процессе
          </span>
        </header>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Тренировка #{workout.id}
          </h1>
          <p className="mt-2 text-sm text-[#82768A]">
            {completedSets} из {totalSets} подходов
          </p>
        </div>

        {workout.startedAt && <WorkoutTimer startedAt={workout.startedAt} />}
        <RestTimer workoutId={workoutId} />

        <div className="h-2 overflow-hidden rounded-full bg-[#E9DFEC]">
          <div
            className="h-full rounded-full bg-[#AA91B5] transition-all"
            style={{
              width: `${
                totalSets > 0 ? (completedSets / totalSets) * 100 : 0
              }%`,
            }}
          />
        </div>

        {exercises.map((item) => (
          <WorkoutExerciseCard
            key={item.id}
            workoutId={workoutId}
            item={item}
            onUpdated={refreshWorkout}
          />
        ))}
        <AddWorkoutExercise workoutId={workoutId} />

        <div className="space-y-3 pt-3">
          <Button
            type="button"
            onClick={() => setFinishOpen(true)}
            className="h-14 w-full cursor-pointer rounded-[20px] bg-[#EDBE65] text-base font-extrabold text-[#302C33] hover:bg-[#E2AD50]"
          >
            <CheckCircle2 size={19} />
            Завершить тренировку
          </Button>

          <Button
            type="button"
            variant="ghost"
            disabled={cancelMutation.isPending}
            onClick={() => {
              if (window.confirm("Отменить тренировку?")) {
                cancelMutation.mutate();
              }
            }}
            className="h-11 w-full cursor-pointer rounded-2xl text-[#82768A] hover:bg-[#EEE8F0]"
          >
            <X size={17} />
            Отменить
          </Button>

          {cancelMutation.isError && (
            <p role="alert" className="text-sm text-red-600">
              Не удалось отменить тренировку.
            </p>
          )}
        </div>
      </div>

      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent className="rounded-[28px] bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold">
              Завершить тренировку
            </DialogTitle>
            <DialogDescription>Как прошло занятие?</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-3">
            <div className="space-y-2">
              <Label>Самочувствие</Label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-label={`Самочувствие ${value} из 5`}
                    aria-pressed={mood === value}
                    onClick={() => setMood(value)}
                    className={`h-12 cursor-pointer rounded-2xl font-bold ${
                      mood === value
                        ? "bg-[#EDBE65] text-[#302C33]"
                        : "bg-[#F2EDF4] text-[#806B8E]"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="finish-weight">Вес тела, кг</Label>
              <Input
                id="finish-weight"
                type="number"
                min={0}
                step="0.1"
                placeholder="Необязательно"
                value={bodyWeight}
                onChange={(e) => setBodyWeight(e.target.value)}
                className="h-12 rounded-2xl bg-[#F9F6FA]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="finish-notes">Заметки</Label>
              <Textarea
                id="finish-notes"
                placeholder="Необязательно"
                maxLength={5000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-2xl bg-[#F9F6FA]"
              />
            </div>

            {finishMutation.isError && (
              <p role="alert" className="text-sm text-red-600">
                {finishMutation.error instanceof Error
                  ? finishMutation.error.message
                  : "Не удалось завершить тренировку"}
              </p>
            )}

            <Button
              type="button"
              onClick={() => finishMutation.mutate()}
              disabled={finishMutation.isPending}
              className="h-13 w-full cursor-pointer rounded-2xl bg-[#EDBE65] font-extrabold text-[#302C33] hover:bg-[#E2AD50]"
            >
              {finishMutation.isPending
                ? "Сохранение..."
                : "Сохранить результат"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

type ExerciseItem = NonNullable<
  Awaited<ReturnType<typeof getWorkout>>["exercises"]
>[number];

function WorkoutExerciseCard({
  workoutId,
  item,
  onUpdated,
}: {
  workoutId: number;
  item: ExerciseItem;
  onUpdated: () => Promise<unknown>;
}) {
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const last = item.sets[item.sets.length - 1];

      return addWorkoutSet(workoutId, item.id, {
        plannedWeightKg: last?.plannedWeightKg ?? 0,
        plannedReps: last?.plannedReps ?? 10,
      });
    },
    onSuccess: async () => {
      setError("");
      await onUpdated();
    },
    onError: () => {
      setError("Не удалось добавить подход.");
    },
  });

  return (
    <SquircleCard className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">{item.exercise.name}</h2>
          <p className="mt-1 text-xs text-[#82768A]">
            {item.sets.filter((set) => set.isCompleted).length} /{" "}
            {item.sets.length} подходов
          </p>
        </div>

        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEE6F1] text-[#8E77A0]">
          <CheckCircle2 size={21} />
        </div>
      </div>

      <div className="space-y-2">
        {item.sets.map((set) => (
          <div key={set.id} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <SetRow set={set} workoutId={workoutId} onUpdated={onUpdated} />
            </div>

            {!set.isCompleted && (
              <DeleteWorkoutSetButton
                workoutId={workoutId}
                setId={set.id}
                setNumber={set.setNumber}
              />
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#CBBBD2] text-sm font-bold text-[#806B8E] transition-colors hover:bg-[#F4EFF6] disabled:cursor-not-allowed"
      >
        <Plus size={17} />
        {mutation.isPending ? "Добавление..." : "Добавить подход"}
      </button>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </SquircleCard>
  );
}
