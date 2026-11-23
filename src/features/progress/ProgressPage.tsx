import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  Dumbbell,
  Layers3,
  TrendingUp,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SquircleCard } from "@/components/repbook/SquircleCard";

import {
  getWorkouts,
  workoutKeys,
  type Workout,
} from "@/features/workouts/workouts-api";

import {
  formatVolume,
  getWorkoutStats,
} from "@/features/workouts/workout-utils";

type Period = 7 | 30 | 90;

const PERIODS: Period[] = [7, 30, 90];

const COLORS = {
  purple: "#AA91B5",
  charcoal: "#302C33",
  gold: "#EDBE65",
  grid: "#EEE8F0",
  muted: "#82768A",
};

const numberFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 1,
});

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function dayKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function shortDate(date: Date) {
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
}

function finishedDate(workout: Workout) {
  if (!workout.finishedAt) return null;

  const date = new Date(workout.finishedAt);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getPeriodWorkouts(workouts: Workout[], period: Period, now: Date) {
  const start = addDays(startOfDay(now), -(period - 1));

  return workouts.filter((workout) => {
    if (workout.status !== "COMPLETED") return false;

    const date = finishedDate(workout);

    return date !== null && date >= start && date <= now;
  });
}

function getExerciseOptions(workouts: Workout[]) {
  const map = new Map<number, string>();

  for (const workout of workouts) {
    if (workout.status !== "COMPLETED") continue;

    for (const item of workout.exercises ?? []) {
      if (item.exercise) {
        map.set(item.exercise.id, item.exercise.name);
      }
    }
  }

  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

function createVolumeChart(workouts: Workout[], period: Period, now: Date) {
  const start = addDays(startOfDay(now), -(period - 1));
  const dailyVolume = new Map<string, number>();

  for (const workout of workouts) {
    const date = finishedDate(workout);
    if (!date) continue;

    const key = dayKey(date);
    const volume = getWorkoutStats(workout).volumeKg;

    dailyVolume.set(key, (dailyVolume.get(key) ?? 0) + volume);
  }

  // Для длинных периодов объединяем дни,
  // чтобы график не был перегружен.
  const bucketSize = period === 7 ? 1 : period === 30 ? 5 : 10;

  const points: { date: string; volume: number }[] = [];

  for (let i = 0; i < period; i += bucketSize) {
    let sum = 0;

    const bucketStart = addDays(start, i);
    const bucketEnd = addDays(start, Math.min(period - 1, i + bucketSize - 1));

    for (let j = i; j < Math.min(period, i + bucketSize); j++) {
      const date = addDays(start, j);
      sum += dailyVolume.get(dayKey(date)) ?? 0;
    }

    points.push({
      date:
        bucketSize === 1
          ? shortDate(bucketStart)
          : `${shortDate(bucketStart)}–${shortDate(bucketEnd)}`,
      volume: Math.round(sum * 10) / 10,
    });
  }

  return points;
}

function createExerciseChart(workouts: Workout[], exerciseId: number | null) {
  if (exerciseId === null) return [];

  const perDay = new Map<
    string,
    {
      timestamp: number;
      weight: number;
      date: string;
    }
  >();

  for (const workout of workouts) {
    const date = finishedDate(workout);
    if (!date) continue;

    for (const item of workout.exercises ?? []) {
      if (item.exercise?.id !== exerciseId) continue;

      for (const set of item.sets ?? []) {
        if (
          !set.isCompleted ||
          set.weightKg == null ||
          set.reps == null ||
          set.reps < 1
        ) {
          continue;
        }

        const key = dayKey(date);
        const previous = perDay.get(key);

        if (!previous || set.weightKg > previous.weight) {
          perDay.set(key, {
            timestamp: date.getTime(),
            weight: set.weightKg,
            date: shortDate(date),
          });
        }
      }
    }
  }

  return [...perDay.values()]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(({ date, weight }) => ({ date, weight }));
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
    <SquircleCard className="flex min-h-36 flex-col justify-between gap-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#82768A]">{label}</span>

        <Icon className="size-5 text-[#AA91B5]" />
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

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center text-center">
      <p className="max-w-52 text-sm leading-6 text-[#82768A]">{message}</p>
    </div>
  );
}

export function ProgressPage() {
  const [period, setPeriod] = useState<Period>(30);
  const [selectedExercise, setSelectedExercise] = useState<number | null>(null);

  const workoutsQuery = useQuery({
    queryKey: workoutKeys.all,
    queryFn: getWorkouts,
  });

  const workouts = workoutsQuery.data ?? [];

  const now = new Date();

  const periodWorkouts = useMemo(
    () => getPeriodWorkouts(workouts, period, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workouts, period],
  );

  const exerciseOptions = useMemo(
    () => getExerciseOptions(workouts),
    [workouts],
  );

  const effectiveExercise =
    selectedExercise !== null &&
    exerciseOptions.some((item) => item.id === selectedExercise)
      ? selectedExercise
      : (exerciseOptions[0]?.id ?? null);

  const stats = useMemo(() => {
    return periodWorkouts.reduce(
      (result, workout) => {
        const item = getWorkoutStats(workout);

        result.completedSets += item.completedSets;
        result.volumeKg += item.volumeKg;
        result.exerciseEntries += item.exerciseCount;

        return result;
      },
      {
        completedSets: 0,
        volumeKg: 0,
        exerciseEntries: 0,
      },
    );
  }, [periodWorkouts]);

  const volumeChart = createVolumeChart(periodWorkouts, period, now);

  const exerciseChart = createExerciseChart(periodWorkouts, effectiveExercise);

  const activeDays = new Set(
    periodWorkouts
      .map(finishedDate)
      .filter((date): date is Date => date !== null)
      .map(dayKey),
  ).size;

  return (
    <main className="min-h-screen px-4 py-7 text-[#302C33] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Заголовок */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#927AA0]">
              RepBook/ ANALYTICS
            </p>

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Прогресс
            </h1>

            <p className="mt-2 text-sm text-[#82768A]">
              Твои результаты в цифрах.
            </p>
          </div>

          <Link
            to="/history"
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold transition-colors hover:bg-[#EEE8F0]"
          >
            <CalendarDays size={17} />
            История
            <ArrowRight size={16} />
          </Link>
        </header>

        {/* Выбор периода */}
        <div
          role="group"
          aria-label="Период статистики"
          className="inline-flex gap-1 rounded-[20px] bg-white p-1.5"
        >
          {PERIODS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
              className={`cursor-pointer rounded-2xl px-5 py-2.5 text-xs font-bold transition-colors ${
                period === value
                  ? "bg-[#302C33] text-white"
                  : "text-[#82768A] hover:bg-[#F3EDF5]"
              }`}
            >
              {value} дней
            </button>
          ))}
        </div>

        {workoutsQuery.isPending ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-36 rounded-[28px]" />
              ))}
            </div>

            <Skeleton className="h-90 rounded-[28px]" />
          </div>
        ) : workoutsQuery.isError ? (
          <SquircleCard className="space-y-4 text-center">
            <p className="font-bold">Не удалось загрузить статистику</p>

            <Button
              type="button"
              onClick={() => void workoutsQuery.refetch()}
              className="cursor-pointer rounded-2xl"
            >
              Повторить
            </Button>
          </SquircleCard>
        ) : (
          <>
            {/* Основные показатели */}
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Тренировки"
                value={String(periodWorkouts.length)}
                icon={Dumbbell}
              />

              <StatCard
                label="Подходы"
                value={String(stats.completedSets)}
                icon={Layers3}
              />

              <StatCard
                label="Активные дни"
                value={String(activeDays)}
                icon={ChartNoAxesCombined}
              />
            </div>

            {/* Общий объём */}
            <SquircleCard variant="dark" className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/60">Тренировочный объём</p>

                <TrendingUp size={23} className="text-[#EDBE65]" />
              </div>

              <div>
                <span className="text-4xl font-extrabold tracking-tight text-[#EDBE65] tabular-nums">
                  {formatVolume(stats.volumeKg)}
                </span>

                <span className="ml-2 text-sm text-white/60">кг</span>
              </div>

              <p className="text-xs text-white/55">
                За последние {period} дней
              </p>
            </SquircleCard>

            {/* График объёма */}
            <SquircleCard className="space-y-5">
              <div>
                <h2 className="text-lg font-extrabold">Динамика нагрузки</h2>

                <p className="mt-1 text-xs text-[#82768A]">
                  Выполненный объём по периодам
                </p>
              </div>

              {periodWorkouts.length === 0 ? (
                <EmptyChart message="Нет завершённых тренировок за выбранный период." />
              ) : (
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={volumeChart}
                      margin={{
                        top: 10,
                        right: 5,
                        left: -18,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid vertical={false} stroke={COLORS.grid} />

                      <XAxis
                        dataKey="date"
                        tick={{
                          fontSize: 10,
                          fill: COLORS.muted,
                        }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={12}
                        interval="preserveStartEnd"
                      />

                      <YAxis
                        tick={{
                          fontSize: 11,
                          fill: COLORS.muted,
                        }}
                        tickLine={false}
                        axisLine={false}
                        width={55}
                      />

                      <Tooltip
                        formatter={(value) => [
                          `${numberFormatter.format(Number(value ?? 0))} кг`,
                          "Объём",
                        ]}
                        contentStyle={{
                          borderRadius: 16,
                          border: "none",
                          boxShadow: "0 8px 30px rgba(48,44,51,.12)",
                        }}
                      />

                      <Bar
                        dataKey="volume"
                        name="Объём"
                        fill={COLORS.purple}
                        radius={[10, 10, 0, 0]}
                        maxBarSize={54}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SquircleCard>

            {/* Динамика рабочих весов */}
            <SquircleCard className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold">Рабочие веса</h2>

                  <p className="mt-1 text-xs text-[#82768A]">
                    Максимальный вес по упражнению
                  </p>
                </div>

                {exerciseOptions.length > 0 && (
                  <select
                    aria-label="Выбрать упражнение"
                    value={effectiveExercise ?? ""}
                    onChange={(event) =>
                      setSelectedExercise(Number(event.target.value))
                    }
                    className="max-w-full cursor-pointer rounded-2xl border border-[#E9DFEC] bg-[#F8F5F9] px-4 py-3 text-xs font-semibold text-[#302C33] focus-visible:outline-2 focus-visible:outline-[#AA91B5]"
                  >
                    {exerciseOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {exerciseChart.length === 0 ? (
                <EmptyChart message="Нет записанных рабочих весов для этого упражнения за выбранный период." />
              ) : (
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={exerciseChart}
                      margin={{
                        top: 10,
                        right: 12,
                        left: -18,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid vertical={false} stroke={COLORS.grid} />

                      <XAxis
                        dataKey="date"
                        tick={{
                          fontSize: 11,
                          fill: COLORS.muted,
                        }}
                        tickLine={false}
                        axisLine={false}
                      />

                      <YAxis
                        domain={[0, "auto"]}
                        tick={{
                          fontSize: 11,
                          fill: COLORS.muted,
                        }}
                        tickLine={false}
                        axisLine={false}
                      />

                      <Tooltip
                        formatter={(value) => [
                          `${numberFormatter.format(Number(value ?? 0))} кг`,
                          "Вес",
                        ]}
                        contentStyle={{
                          borderRadius: 16,
                          border: "none",
                          boxShadow: "0 8px 30px rgba(48,44,51,.12)",
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="weight"
                        name="Вес"
                        stroke={COLORS.purple}
                        strokeWidth={3}
                        dot={{
                          fill: COLORS.gold,
                          r: 5,
                          stroke: COLORS.charcoal,
                          strokeWidth: 1,
                        }}
                        activeDot={{ r: 7 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SquircleCard>
          </>
        )}
      </div>
    </main>
  );
}
