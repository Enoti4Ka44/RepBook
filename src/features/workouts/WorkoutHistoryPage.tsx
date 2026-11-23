import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Dumbbell,
  History,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SquircleCard } from "@/components/repbook/SquircleCard";

import { getWorkouts, workoutKeys } from "./workouts-api";

import {
  formatDuration,
  formatVolume,
  formatWorkoutDate,
  getWorkoutStats,
} from "./workout-utils";

export function WorkoutHistoryPage() {
  const workoutsQuery = useQuery({
    queryKey: workoutKeys.all,
    queryFn: getWorkouts,
  });

  const workouts = (workoutsQuery.data ?? [])
    .filter((workout) => workout.status === "COMPLETED")
    .sort((a, b) => {
      const first = Date.parse(a.finishedAt ?? a.createdAt);
      const second = Date.parse(b.finishedAt ?? b.createdAt);

      return (
        (Number.isFinite(second) ? second : 0) -
        (Number.isFinite(first) ? first : 0)
      );
    });

  return (
    <main className="min-h-screen bg-[#F6F1F8] px-4 py-8 pb-24 text-[#302C33] sm:px-8">
      <div className="mx-auto max-w-5xl space-y-7">
        <header>
          <Link
            to="/workouts"
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#82768A] hover:text-[#302C33]"
          >
            <ArrowLeft size={17} />
            Мои тренировки
          </Link>

          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
            История
          </h1>

          <p className="mt-2 text-sm text-[#82768A]">
            Все твои завершённые тренировки.
          </p>
        </header>

        {workoutsQuery.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-52 rounded-[28px]" />
            ))}
          </div>
        ) : workoutsQuery.isError ? (
          <SquircleCard className="space-y-4 text-center">
            <p className="font-bold">Не удалось загрузить историю</p>
            <Button
              className="cursor-pointer rounded-2xl"
              onClick={() => void workoutsQuery.refetch()}
            >
              Повторить
            </Button>
          </SquircleCard>
        ) : workouts.length === 0 ? (
          <SquircleCard className="py-16 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-[24px] bg-[#F0E8F3] text-[#AA91B5]">
              <History size={30} />
            </div>

            <h2 className="mt-5 text-xl font-extrabold">История пока пуста</h2>

            <p className="mt-2 text-sm text-[#82768A]">
              Заверши первую тренировку.
            </p>

            <Button
              asChild
              className="mt-6 cursor-pointer rounded-2xl bg-[#EDBE65] px-6 text-[#302C33] hover:bg-[#E2AD50]"
            >
              <Link to="/workouts">К тренировкам</Link>
            </Button>
          </SquircleCard>
        ) : (
          <>
            <p className="text-sm font-semibold text-[#82768A]">
              Завершено: {workouts.length}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {workouts.map((workout) => {
                const stats = getWorkoutStats(workout);

                return (
                  <Link
                    key={workout.id}
                    to={`/workouts/${workout.id}`}
                    className="group block cursor-pointer rounded-[28px] outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#AA91B5]"
                  >
                    <SquircleCard className="h-full space-y-5 transition-transform duration-200 group-hover:-translate-y-1">
                      <div className="flex items-start justify-between">
                        <div className="flex size-12 items-center justify-center rounded-[18px] bg-[#EFE7F2] text-[#927AA0]">
                          <Dumbbell size={23} />
                        </div>

                        <ArrowUpRight size={20} className="text-[#AA91B5]" />
                      </div>

                      <div>
                        <h2 className="text-lg font-extrabold">
                          Тренировка #{workout.id}
                        </h2>

                        <p className="mt-2 flex items-center gap-2 text-xs text-[#82768A]">
                          <CalendarDays size={14} />
                          {formatWorkoutDate(
                            workout.finishedAt ?? workout.createdAt,
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-t border-[#EEE8F0] pt-4">
                        <div>
                          <p className="text-lg font-extrabold">
                            {stats.exerciseCount}
                          </p>
                          <p className="mt-1 text-xs text-[#82768A]">Упр.</p>
                        </div>

                        <div>
                          <p className="text-lg font-extrabold">
                            {formatDuration(stats.durationMinutes)}
                          </p>
                          <p className="mt-1 text-xs text-[#82768A]">Время</p>
                        </div>

                        <div>
                          <p className="text-lg font-extrabold">
                            {formatVolume(stats.volumeKg)}
                          </p>
                          <p className="mt-1 text-xs text-[#82768A]">
                            Объём, кг
                          </p>
                        </div>
                      </div>
                    </SquircleCard>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
