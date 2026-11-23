import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Clock3, Dumbbell, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SquircleCard } from "@/components/repbook/SquircleCard";

import { getWorkout, workoutKeys } from "./workouts-api";

import { formatDuration, formatVolume, getWorkoutStats } from "./workout-utils";

export function WorkoutSummaryPage() {
  const { id } = useParams();

  const workoutId = Number(id);
  const validId = Number.isSafeInteger(workoutId) && workoutId > 0;

  const {
    data: workout,
    isPending,
    isError,
  } = useQuery({
    queryKey: workoutKeys.detail(workoutId),
    queryFn: () => getWorkout(workoutId),
    enabled: validId,
  });

  if (!validId || isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F6F1F8] p-5">
        <SquircleCard className="w-full max-w-md text-center">
          <p className="font-bold">Не удалось открыть результаты</p>

          <Button asChild className="mt-5 cursor-pointer">
            <Link to="/workouts">К тренировкам</Link>
          </Button>
        </SquircleCard>
      </main>
    );
  }

  if (isPending || !workout) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F6F1F8] text-[#82768A]">
        Загрузка результатов...
      </main>
    );
  }

  if (workout.status !== "COMPLETED") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F6F1F8] p-5">
        <SquircleCard className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-xl font-extrabold">
            Тренировка ещё не завершена
          </h1>

          <Button asChild className="cursor-pointer rounded-2xl">
            <Link to={`/workouts/${workout.id}`}>Открыть тренировку</Link>
          </Button>
        </SquircleCard>
      </main>
    );
  }

  const stats = getWorkoutStats(workout);

  return (
    <main className="min-h-screen bg-[#F6F1F8] px-4 py-8 pb-20 text-[#302C33] sm:px-8">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="py-7 text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-[30px] bg-[#EDBE65] text-[#302C33]">
            <Check size={39} strokeWidth={2.5} />
          </div>

          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-[#927AA0]">
            REPBOOK
          </p>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
            Тренировка завершена!
          </h1>

          <p className="mt-2 text-sm text-[#82768A]">Отличная работа.</p>
        </div>

        <SquircleCard variant="dark" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/60">Твой результат</p>

            <TrendingUp size={23} className="text-[#EDBE65]" />
          </div>

          <div>
            <p className="text-4xl font-extrabold tracking-tight text-[#EDBE65] tabular-nums">
              {formatVolume(stats.volumeKg)}
              <span className="ml-2 text-lg font-semibold text-white/65">
                кг
              </span>
            </p>

            <p className="mt-2 text-sm text-white/60">Общий объём нагрузки</p>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-white/15 pt-5">
            <ResultStat
              value={String(stats.exerciseCount)}
              label="Упражнений"
            />

            <ResultStat value={String(stats.completedSets)} label="Подходов" />

            <ResultStat
              value={formatDuration(stats.durationMinutes)}
              label="Время"
            />
          </div>
        </SquircleCard>

        {workout.mood != null && (
          <SquircleCard className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Самочувствие</p>

              <p className="mt-1 text-xs text-[#82768A]">После тренировки</p>
            </div>

            <div className="flex size-13 items-center justify-center rounded-[18px] bg-[#F0E8F3] text-xl font-extrabold text-[#806B8E]">
              {workout.mood}/5
            </div>
          </SquircleCard>
        )}

        <div className="grid grid-cols-2 gap-3">
          <SquircleCard className="flex items-center gap-3 p-4">
            <Dumbbell size={19} className="text-[#927AA0]" />
            <span className="text-sm font-semibold">
              {stats.completedSets} подходов
            </span>
          </SquircleCard>

          <SquircleCard className="flex items-center gap-3 p-4">
            <Clock3 size={19} className="text-[#927AA0]" />
            <span className="text-sm font-semibold">
              {formatDuration(stats.durationMinutes)}
            </span>
          </SquircleCard>
        </div>

        <Button
          asChild
          className="h-14 w-full cursor-pointer rounded-[20px] bg-[#EDBE65] text-sm font-extrabold text-[#302C33] hover:bg-[#E2AD50]"
        >
          <Link to={`/workouts/${workout.id}`}>
            Посмотреть тренировку
            <ArrowRight size={18} />
          </Link>
        </Button>

        <Link
          to="/history"
          className="flex cursor-pointer items-center justify-center py-4 text-sm font-semibold text-[#82768A] hover:text-[#302C33]"
        >
          К истории тренировок
        </Link>
      </div>
    </main>
  );
}

function ResultStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-lg font-extrabold text-white tabular-nums">{value}</p>

      <p className="mt-1 text-xs text-white/55">{label}</p>
    </div>
  );
}
