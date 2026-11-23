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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getWeekStart(date: Date) {
  const monday = startOfDay(date);
  const day = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - day);
  return monday;
}

function getFinishDate(workout: Workout) {
  if (!workout.finishedAt) return null;

  const date = new Date(workout.finishedAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDashboardData(workouts: Workout[], now: Date) {
  const weekStart = getWeekStart(now);

  const completed = workouts.filter(
    (workout) => workout.status === "COMPLETED",
  );

  const thisWeek = completed.filter((workout) => {
    const date = getFinishDate(workout);

    return date !== null && date >= weekStart && date <= now;
  });

  const totalSets = thisWeek.reduce(
    (sum, workout) => sum + getWorkoutStats(workout).completedSets,
    0,
  );

  const totalVolume = thisWeek.reduce(
    (sum, workout) => sum + getWorkoutStats(workout).volumeKg,
    0,
  );

  const activity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);

    const count = thisWeek.filter((workout) => {
      const finished = getFinishDate(workout);

      return (
        finished !== null && startOfDay(finished).getTime() === date.getTime()
      );
    }).length;

    return {
      label: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][index],
      count,
    };
  });

  const sorted = [...workouts].sort((a, b) => {
    const first = Date.parse(a.createdAt);
    const second = Date.parse(b.createdAt);

    return (
      (Number.isFinite(second) ? second : 0) -
      (Number.isFinite(first) ? first : 0)
    );
  });

  const active = sorted.find((workout) => workout.status === "IN_PROGRESS");

  const planned = sorted.find((workout) => workout.status === "PLANNED");

  const recent = [...completed]
    .sort((a, b) => {
      const first = getFinishDate(a)?.getTime() ?? 0;
      const second = getFinishDate(b)?.getTime() ?? 0;
      return second - first;
    })
    .slice(0, 3);

  return {
    weekCount: thisWeek.length,
    totalSets,
    totalVolume,
    activity,
    active,
    planned,
    recent,
    completed,
  };
}

function StatCard({
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
    <SquircleCard className="flex min-h-39 flex-col justify-between gap-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#82768A]">{label}</p>
        <Icon size={19} className="text-[#AA91B5]" />
      </div>

      <div>
        <span className="text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl">
          {value}
        </span>
        {unit && (
          <span className="ml-1.5 text-xs font-medium text-[#82768A]">
            {unit}
          </span>
        )}
      </div>
    </SquircleCard>
  );
}

function ActivityChart({
  activity,
}: {
  activity: { label: string; count: number }[];
}) {
  const maximum = Math.max(1, ...activity.map((day) => day.count));

  return (
    <SquircleCard className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Активность</h2>
        <span className="text-xs text-[#82768A]">Эта неделя</span>
      </div>

      <div className="grid h-44 grid-cols-7 gap-2 sm:gap-4">
        {activity.map((day, index) => {
          const height = day.count
            ? Math.max(12, (day.count / maximum) * 100)
            : 4;

          return (
            <div
              key={day.label}
              className="flex min-w-0 flex-col items-center justify-end gap-3"
            >
              <div className="flex h-full w-full max-w-12 items-end">
                <div
                  role="img"
                  aria-label={`${day.label}: ${day.count} тренировок`}
                  title={`${day.count} тренировок`}
                  className={`w-full rounded-t-[14px] transition-all ${
                    day.count > 0
                      ? index === 6
                        ? "bg-[#EDBE65]"
                        : "bg-[#AA91B5]"
                      : "bg-[#EEE8F0]"
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

function MainWorkoutCard({
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
            <Dumbbell size={25} />
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

  const href =
    selected.status === "IN_PROGRESS"
      ? `/workouts/${selected.id}/active`
      : `/workouts/${selected.id}`;

  const stats = getWorkoutStats(selected);

  return (
    <SquircleCard
      variant="dark"
      className="flex min-h-58 flex-col justify-between gap-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-[#EDBE65]">
          <Dumbbell size={25} />
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

export function DashboardPage() {
  const workoutsQuery = useQuery({
    queryKey: workoutKeys.all,
    queryFn: getWorkouts,
  });

  const now = new Date();

  const data = getDashboardData(workoutsQuery.data ?? [], now);

  return (
    <main className="px-4 py-7 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#927AA0]">
              Твой прогресс
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

        {workoutsQuery.isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-58 rounded-[28px]" />

            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-40 rounded-[28px]" />
              ))}
            </div>
          </div>
        ) : workoutsQuery.isError ? (
          <SquircleCard className="space-y-4 text-center">
            <p className="font-bold">Не удалось загрузить данные</p>

            <Button
              onClick={() => void workoutsQuery.refetch()}
              className="cursor-pointer rounded-2xl"
            >
              Повторить
            </Button>
          </SquircleCard>
        ) : (
          <>
            <MainWorkoutCard active={data.active} planned={data.planned} />

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                label="Тренировки за неделю"
                value={String(data.weekCount)}
                icon={Dumbbell}
              />

              <StatCard
                label="Выполненные подходы"
                value={String(data.totalSets)}
                icon={CheckCircle2}
              />

              <StatCard
                label="Объём нагрузки"
                value={formatVolume(data.totalVolume)}
                unit="кг"
                icon={TrendingUp}
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
              <ActivityChart activity={data.activity} />

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

                {data.recent.length === 0 ? (
                  <div className="flex min-h-36 items-center justify-center text-center">
                    <p className="text-sm text-[#82768A]">
                      Завершённых тренировок пока нет.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.recent.map((workout) => {
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
