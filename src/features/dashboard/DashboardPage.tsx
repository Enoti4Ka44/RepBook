import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";

import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  Plus,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SquircleCard } from "@/components/repbook/SquircleCard";

import {
  getWorkouts,
  workoutKeys,
  type Workout,
} from "@/features/workouts/workouts-api";

import {
  formatDuration,
  formatVolume,
  formatWorkoutDate,
  getWorkoutStats,
} from "@/features/workouts/workout-utils";

import {
  analyticsKeys,
  getAnalyticsSummary,
  getCurrentWeekPeriod,
  getVolumeDynamics,
  type VolumePoint,
} from "@/features/progress/analytics-api";

function sortNewest(a: Workout, b: Workout): number {
  const first = Date.parse(a.createdAt);
  const second = Date.parse(b.createdAt);

  return (
    (Number.isFinite(second) ? second : 0) -
    (Number.isFinite(first) ? first : 0)
  );
}

function getFeaturedWorkouts(workouts: Workout[]) {
  const sorted = [...workouts].sort(sortNewest);

  const active = sorted.find((workout) => workout.status === "IN_PROGRESS");

  const planned = sorted.find((workout) => workout.status === "PLANNED");

  const recent = sorted
    .filter((workout) => workout.status === "COMPLETED")
    .sort((a, b) => {
      const first = Date.parse(a.finishedAt ?? a.createdAt);

      const second = Date.parse(b.finishedAt ?? b.createdAt);

      return (
        (Number.isFinite(second) ? second : 0) -
        (Number.isFinite(first) ? first : 0)
      );
    })
    .slice(0, 3);

  return { active, planned, recent };
}

function DashboardStat({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: typeof Dumbbell;
}) {
  return (
    <SquircleCard className="flex min-h-36 flex-col justify-between gap-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#82768A]">{label}</p>

        <Icon size={20} className="text-[#AA91B5]" />
      </div>

      <div>
        <span className="text-3xl font-extrabold tracking-tight tabular-nums">
          {value}
        </span>

        {unit && <span className="ml-1 text-xs text-[#82768A]">{unit}</span>}
      </div>
    </SquircleCard>
  );
}

function FeaturedWorkout({
  active,
  planned,
}: {
  active?: Workout;
  planned?: Workout;
}) {
  const selected = active ?? planned;

  if (!selected) {
    return (
      <SquircleCard
        variant="dark"
        className="flex min-h-58 flex-col justify-between gap-6"
      >
        <div className="flex items-start justify-between">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-[#EDBE65]">
            <Dumbbell size={24} />
          </div>

          <ArrowUpRight className="text-[#EDBE65]" />
        </div>

        <div>
          <p className="text-sm text-white/55">Готов к следующему шагу?</p>

          <h2 className="mt-2 text-2xl font-extrabold text-white">
            Создай тренировку
          </h2>
        </div>

        <Button
          asChild
          className="h-12 w-full cursor-pointer rounded-2xl bg-[#EDBE65] font-bold text-[#302C33] hover:bg-[#E2AD50] sm:w-fit"
        >
          <Link to="/workouts/new">
            <Plus size={17} />
            Создать план
          </Link>
        </Button>
      </SquircleCard>
    );
  }

  const stats = getWorkoutStats(selected);

  const href =
    selected.status === "IN_PROGRESS"
      ? `/workouts/${selected.id}/active`
      : `/workouts/${selected.id}`;

  return (
    <SquircleCard
      variant="dark"
      className="flex min-h-58 flex-col justify-between gap-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-[#EDBE65]">
          <Dumbbell size={24} />
        </div>

        <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white/80">
          {active ? "В процессе" : "Запланирована"}
        </span>
      </div>

      <div>
        <p className="text-sm text-white/55">
          {active ? "Текущая тренировка" : "Следующая тренировка"}
        </p>

        <h2 className="mt-2 text-2xl font-extrabold text-white">
          Тренировка #{selected.id}
        </h2>

        <p className="mt-2 text-sm text-white/55">
          {stats.exerciseCount} упражнений · {stats.totalSets} подходов
        </p>
      </div>

      <Button
        asChild
        className="h-12 w-full cursor-pointer rounded-2xl bg-[#EDBE65] font-bold text-[#302C33] hover:bg-[#E2AD50] sm:w-fit"
      >
        <Link to={href}>
          {active ? "Продолжить" : "Открыть план"}
          <ArrowRight size={17} />
        </Link>
      </Button>
    </SquircleCard>
  );
}

function WeeklyActivity({
  volume,
  from,
  to,
}: {
  volume: VolumePoint[];
  from: string;
  to: string;
}) {
  const values = new Map(
    volume.map((point) => [point.date, point.workoutCount]),
  );

  const first = new Date(`${from}T12:00:00`);
  const last = new Date(`${to}T12:00:00`);

  const days: {
    label: string;
    date: string;
    count: number;
  }[] = [];

  for (
    let current = new Date(first);
    current <= last;
    current.setDate(current.getDate() + 1)
  ) {
    const key = [
      current.getFullYear(),
      String(current.getMonth() + 1).padStart(2, "0"),
      String(current.getDate()).padStart(2, "0"),
    ].join("-");

    days.push({
      label: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][current.getDay()],
      date: key,
      count: values.get(key) ?? 0,
    });
  }

  const maximum = Math.max(1, ...days.map((item) => item.count));

  return (
    <SquircleCard className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Активность</h2>

        <span className="text-xs text-[#82768A]">Эта неделя</span>
      </div>

      <div className="grid h-44 grid-cols-7 gap-2 sm:gap-4">
        {days.map((day) => {
          const height =
            day.count === 0 ? 4 : Math.max(12, (day.count / maximum) * 100);

          return (
            <div
              key={day.date}
              className="flex min-w-0 flex-col items-center justify-end gap-3"
            >
              <div className="flex h-full w-full max-w-12 items-end">
                <div
                  role="img"
                  aria-label={`${day.label}: ${day.count} тренировок`}
                  title={`${day.count} тренировок`}
                  className={`w-full rounded-t-[14px] ${
                    day.count > 0 ? "bg-[#AA91B5]" : "bg-[#EEE8F0]"
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>

              <span className="text-[11px] text-[#82768A]">{day.label}</span>
            </div>
          );
        })}
      </div>
    </SquircleCard>
  );
}

export function DashboardPage() {
  const weekPeriod = getCurrentWeekPeriod();

  const workoutsQuery = useQuery({
    queryKey: workoutKeys.all,
    queryFn: getWorkouts,
    refetchOnMount: "always",
  });

  const summaryQuery = useQuery({
    queryKey: analyticsKeys.summary(weekPeriod),
    queryFn: () => getAnalyticsSummary(weekPeriod),
    refetchOnMount: "always",
  });

  const volumeQuery = useQuery({
    queryKey: analyticsKeys.volume(weekPeriod, "DAY"),
    queryFn: () => getVolumeDynamics(weekPeriod, "DAY"),
    refetchOnMount: "always",
  });

  const loading =
    workoutsQuery.isPending || summaryQuery.isPending || volumeQuery.isPending;

  const error =
    workoutsQuery.isError || summaryQuery.isError || volumeQuery.isError;

  const featured = getFeaturedWorkouts(workoutsQuery.data ?? []);

  const summary = summaryQuery.data;

  return (
    <main className="px-4 py-7 text-[#302C33] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#927AA0]">
              REPBOOK
            </p>

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Главная
            </h1>

            <p className="mt-2 text-sm text-[#82768A]">
              Каждый подход имеет значение.
            </p>
          </div>

          <Button
            asChild
            className="h-11 cursor-pointer rounded-2xl bg-[#302C33] px-5 font-bold text-white hover:bg-[#48424B]"
          >
            <Link to="/workouts/new">
              <Plus size={17} />
              Новая тренировка
            </Link>
          </Button>
        </header>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-58 rounded-[28px]" />

            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-36 rounded-[28px]" />
              ))}
            </div>

            <Skeleton className="h-48 rounded-[28px]" />
          </div>
        ) : error ? (
          <SquircleCard className="space-y-4 text-center">
            <p className="font-bold">Не удалось загрузить главную страницу</p>

            <Button
              type="button"
              onClick={() => {
                void workoutsQuery.refetch();
                void summaryQuery.refetch();
                void volumeQuery.refetch();
              }}
              className="cursor-pointer rounded-2xl"
            >
              Повторить
            </Button>
          </SquircleCard>
        ) : (
          <>
            <FeaturedWorkout
              active={featured.active}
              planned={featured.planned}
            />

            <section className="grid gap-3 sm:grid-cols-3">
              <DashboardStat
                label="Тренировки за неделю"
                value={String(summary?.workoutCount ?? 0)}
                icon={Dumbbell}
              />

              <DashboardStat
                label="Рабочие подходы"
                value={String(summary?.setCount ?? 0)}
                icon={CheckCircle2}
              />

              <DashboardStat
                label="Тоннаж за неделю"
                value={formatVolume(summary?.totalTonnageKg ?? 0)}
                unit="кг"
                icon={TrendingUp}
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
              <WeeklyActivity
                volume={volumeQuery.data ?? []}
                from={weekPeriod.from}
                to={weekPeriod.to}
              />

              <SquircleCard className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-extrabold">
                    Последние тренировки
                  </h2>

                  <Link
                    to="/history"
                    className="cursor-pointer text-xs font-bold text-[#927AA0] hover:underline"
                  >
                    Все
                  </Link>
                </div>

                {featured.recent.length === 0 ? (
                  <div className="flex min-h-36 items-center justify-center text-center">
                    <p className="text-sm text-[#82768A]">
                      Завершённых тренировок пока нет.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {featured.recent.map((workout) => {
                      const stats = getWorkoutStats(workout);

                      return (
                        <Link
                          key={workout.id}
                          to={`/workouts/${workout.id}`}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-[20px] bg-[#F8F5F9] p-4 transition-colors hover:bg-[#F0E8F3]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#E9DFEC] text-[#927AA0]">
                              <Dumbbell size={18} />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold">
                                Тренировка #{workout.id}
                              </p>

                              <p className="mt-1 text-xs text-[#82768A]">
                                {formatWorkoutDate(
                                  workout.finishedAt ?? workout.createdAt,
                                )}
                                {" · "}
                                {formatDuration(stats.durationMinutes)}
                              </p>
                            </div>
                          </div>

                          <ArrowUpRight
                            size={18}
                            className="shrink-0 text-[#AA91B5]"
                          />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </SquircleCard>
            </section>

            <Link
              to="/history"
              className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#927AA0] hover:underline"
            >
              <CalendarDays size={17} />
              История тренировок
              <ArrowRight size={15} />
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
