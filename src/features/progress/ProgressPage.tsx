import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";

import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  Dumbbell,
  Layers3,
  RotateCcw,
  Trophy,
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
  analyticsKeys,
  getAnalyticsPeriod,
  getAnalyticsSummary,
  getExerciseProgress,
  getPersonalRecords,
  getVolumeDynamics,
  type ExerciseProgressPoint,
  type VolumePoint,
} from "./analytics-api";

import {
  formatDuration,
  formatVolume,
} from "@/features/workouts/workout-utils";

type Period = 7 | 30 | 90;

type ProgressMetric = "bestWeightKg" | "bestEst1rmKg" | "tonnageKg";

const periods: Period[] = [7, 30, 90];

const metrics: {
  value: ProgressMetric;
  label: string;
}[] = [
  { value: "bestWeightKg", label: "Вес" },
  { value: "bestEst1rmKg", label: "1RM" },
  { value: "tonnageKg", label: "Тоннаж" },
];

const colors = {
  purple: "#AA91B5",
  purpleActive: "#806B8E",
  charcoal: "#302C33",
  gold: "#EDBE65",
  grid: "#EEE8F0",
  muted: "#82768A",
};

function formatDate(date: string) {
  const parts = date.split("-");

  if (parts.length !== 3) return date;

  return `${parts[2]}.${parts[1]}`;
}

function ChartPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center px-5 text-center">
      <p className="max-w-xs text-sm leading-6 text-[#82768A]">{message}</p>
    </div>
  );
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
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[#82768A]">{label}</span>

        <Icon size={20} className="text-[#AA91B5]" />
      </div>

      <div>
        <span className="text-3xl font-extrabold tabular-nums">{value}</span>

        {unit && <span className="ml-1 text-xs text-[#82768A]">{unit}</span>}
      </div>
    </SquircleCard>
  );
}

// ----------------------------------
// График тренировочного тоннажа
// ----------------------------------

function VolumeChart({ points }: { points: VolumePoint[] }) {
  const chartData = points.map((point) => ({
    ...point,
    label: formatDate(point.date),
  }));

  if (chartData.length === 0) {
    return <ChartPlaceholder message="За выбранный период данных пока нет." />;
  }

  return (
    <div className="h-66 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 10,
            right: 5,
            left: -15,
            bottom: 0,
          }}
        >
          <CartesianGrid vertical={false} stroke={colors.grid} />

          <XAxis
            dataKey="label"
            tick={{
              fontSize: 10,
              fill: colors.muted,
            }}
            tickLine={false}
            axisLine={false}
            minTickGap={15}
          />

          <YAxis
            tick={{
              fontSize: 11,
              fill: colors.muted,
            }}
            tickLine={false}
            axisLine={false}
            width={60}
          />

          <Tooltip
            cursor={false}
            formatter={(value) => [
              `${formatVolume(Number(value ?? 0))} кг`,
              "Тоннаж",
            ]}
            contentStyle={{
              borderRadius: 16,
              border: "none",
              backgroundColor: "#FFFFFF",
              boxShadow: "0 8px 30px rgba(48,44,51,.12)",
              padding: "12px 14px",
            }}
            labelStyle={{
              color: colors.charcoal,
              fontWeight: 600,
              marginBottom: 4,
            }}
          />

          <Bar
            dataKey="tonnageKg"
            name="Тоннаж"
            fill={colors.purple}
            activeBar={{
              fill: colors.purpleActive,
            }}
            radius={[9, 9, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ----------------------------------
// Прогресс отдельного упражнения
// ----------------------------------

function ExerciseChart({
  points,
  metric,
}: {
  points: ExerciseProgressPoint[];
  metric: ProgressMetric;
}) {
  const chartData = points.map((point) => ({
    ...point,
    label: formatDate(point.date),
  }));

  if (chartData.length === 0) {
    return (
      <ChartPlaceholder message="Пока нет выполненных рабочих подходов по этому упражнению за выбранный период." />
    );
  }

  return (
    <div className="h-66 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 10,
            right: 12,
            left: -15,
            bottom: 0,
          }}
        >
          <CartesianGrid vertical={false} stroke={colors.grid} />

          <XAxis
            dataKey="label"
            tick={{
              fontSize: 10,
              fill: colors.muted,
            }}
            tickLine={false}
            axisLine={false}
            minTickGap={12}
          />

          <YAxis
            domain={[0, "auto"]}
            tick={{
              fontSize: 11,
              fill: colors.muted,
            }}
            tickLine={false}
            axisLine={false}
            width={60}
          />

          <Tooltip
            cursor={false}
            formatter={(value) => [
              `${formatVolume(Number(value ?? 0))} кг`,
              metrics.find((item) => item.value === metric)?.label ??
                "Значение",
            ]}
            contentStyle={{
              borderRadius: 16,
              border: "none",
              backgroundColor: "#FFFFFF",
              boxShadow: "0 8px 30px rgba(48,44,51,.12)",
              padding: "12px 14px",
            }}
            labelStyle={{
              color: colors.charcoal,
              fontWeight: 600,
            }}
          />

          <Line
            type="monotone"
            dataKey={metric}
            stroke={colors.purple}
            strokeWidth={3}
            dot={{
              fill: colors.gold,
              stroke: colors.charcoal,
              strokeWidth: 1,
              r: 4,
            }}
            activeDot={{
              r: 7,
              fill: colors.purpleActive,
              stroke: "#FFFFFF",
              strokeWidth: 2,
            }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ----------------------------------
// Страница аналитики
// ----------------------------------

export function ProgressPage() {
  const [period, setPeriod] = useState<Period>(30);

  const [selectedExercise, setSelectedExercise] = useState<number | null>(null);

  const [metric, setMetric] = useState<ProgressMetric>("bestWeightKg");

  const periodParams = useMemo(() => getAnalyticsPeriod(period), [period]);

  const grouping = period === 90 ? "WEEK" : "DAY";

  const summaryQuery = useQuery({
    queryKey: analyticsKeys.summary(periodParams),
    queryFn: () => getAnalyticsSummary(periodParams),
    refetchOnMount: "always",
  });

  const volumeQuery = useQuery({
    queryKey: analyticsKeys.volume(periodParams, grouping),
    queryFn: () => getVolumeDynamics(periodParams, grouping),
    refetchOnMount: "always",
  });

  const recordsQuery = useQuery({
    queryKey: analyticsKeys.records(),
    queryFn: getPersonalRecords,
    refetchOnMount: "always",
  });

  const records = recordsQuery.data ?? [];

  const effectiveExercise =
    selectedExercise !== null &&
    records.some((item) => item.exerciseId === selectedExercise)
      ? selectedExercise
      : (records[0]?.exerciseId ?? null);

  const exerciseQuery = useQuery({
    queryKey: analyticsKeys.progress(effectiveExercise ?? 0, periodParams),
    queryFn: () => getExerciseProgress(effectiveExercise!, periodParams),
    enabled: effectiveExercise !== null,
    refetchOnMount: "always",
  });

  const summary = summaryQuery.data;

  const loading =
    summaryQuery.isPending || volumeQuery.isPending || recordsQuery.isPending;

  const failed =
    summaryQuery.isError || volumeQuery.isError || recordsQuery.isError;

  return (
    <main className="min-h-screen px-4 py-7 text-[#302C33] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Заголовок */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#927AA0]">
              REPBOOK / ANALYTICS
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
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold hover:bg-[#EEE8F0]"
          >
            <CalendarDays size={17} />
            История
            <ArrowRight size={16} />
          </Link>
        </header>

        {/* Период */}
        <div
          role="group"
          aria-label="Период статистики"
          className="inline-flex gap-1 rounded-[20px] bg-white p-1.5"
        >
          {periods.map((value) => (
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

        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-36 rounded-[28px]" />
              ))}
            </div>

            <Skeleton className="h-64 rounded-[28px]" />
            <Skeleton className="h-72 rounded-[28px]" />
          </div>
        ) : failed ? (
          <SquircleCard className="space-y-4 text-center">
            <p className="font-bold">Не удалось загрузить аналитику</p>

            <Button
              type="button"
              onClick={() => {
                void summaryQuery.refetch();
                void volumeQuery.refetch();
                void recordsQuery.refetch();
              }}
              className="cursor-pointer rounded-2xl"
            >
              <RotateCcw size={16} />
              Повторить
            </Button>
          </SquircleCard>
        ) : (
          <>
            {/* Основные показатели */}
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Тренировки"
                value={String(summary?.workoutCount ?? 0)}
                icon={Dumbbell}
              />

              <StatCard
                label="Рабочие подходы"
                value={String(summary?.setCount ?? 0)}
                icon={Layers3}
              />

              <StatCard
                label="Повторения"
                value={String(summary?.repCount ?? 0)}
                icon={ChartNoAxesCombined}
              />
            </div>

            {/* Тоннаж */}
            <SquircleCard variant="dark" className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/60">Тренировочный объём</p>

                <TrendingUp size={23} className="text-[#EDBE65]" />
              </div>

              <div>
                <span className="text-4xl font-extrabold tracking-tight text-[#EDBE65] tabular-nums">
                  {formatVolume(summary?.totalTonnageKg ?? 0)}
                </span>

                <span className="ml-2 text-sm text-white/60">кг</span>
              </div>

              <div className="flex flex-wrap gap-5 border-t border-white/15 pt-4">
                <div>
                  <p className="text-xs text-white/50">Среднее время</p>

                  <p className="mt-1 font-bold text-white">
                    {formatDuration(summary?.avgDurationMinutes ?? null)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-white/50">Изменение веса тела</p>

                  <p className="mt-1 font-bold text-white">
                    {summary?.bodyWeightChangeKg == null
                      ? "—"
                      : `${
                          summary.bodyWeightChangeKg > 0 ? "+" : ""
                        }${formatVolume(summary.bodyWeightChangeKg)} кг`}
                  </p>
                </div>
              </div>
            </SquircleCard>

            {/* Динамика нагрузки */}
            <SquircleCard className="space-y-5">
              <div>
                <h2 className="text-lg font-extrabold">Динамика нагрузки</h2>

                <p className="mt-1 text-xs text-[#82768A]">
                  Рабочий тоннаж по {grouping === "WEEK" ? "неделям" : "дням"}
                </p>
              </div>

              <VolumeChart points={volumeQuery.data ?? []} />
            </SquircleCard>

            {/* График упражнения */}
            <SquircleCard className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold">
                    Прогресс упражнения
                  </h2>

                  <p className="mt-1 text-xs text-[#82768A]">
                    Вес, 1RM и тоннаж
                  </p>
                </div>

                {records.length > 0 && (
                  <select
                    aria-label="Выбрать упражнение"
                    value={effectiveExercise ?? ""}
                    onChange={(event) =>
                      setSelectedExercise(Number(event.target.value))
                    }
                    className="max-w-full cursor-pointer rounded-2xl border border-[#E9DFEC] bg-[#F8F5F9] px-4 py-3 text-xs font-semibold"
                  >
                    {records.map((record) => (
                      <option key={record.exerciseId} value={record.exerciseId}>
                        {record.exerciseName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {effectiveExercise !== null && (
                <div
                  role="group"
                  aria-label="Показатель графика"
                  className="flex gap-2"
                >
                  {metrics.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      aria-pressed={metric === item.value}
                      onClick={() => setMetric(item.value)}
                      className={`cursor-pointer rounded-xl px-4 py-2.5 text-xs font-bold ${
                        metric === item.value
                          ? "bg-[#302C33] text-white"
                          : "bg-[#F2EDF4] text-[#806B8E]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {effectiveExercise === null ? (
                <ChartPlaceholder message="Личных результатов пока нет." />
              ) : exerciseQuery.isPending ? (
                <Skeleton className="h-64 rounded-2xl" />
              ) : exerciseQuery.isError ? (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-red-600">
                    Не удалось загрузить прогресс упражнения.
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => void exerciseQuery.refetch()}
                  >
                    Повторить
                  </Button>
                </div>
              ) : (
                <ExerciseChart
                  points={exerciseQuery.data ?? []}
                  metric={metric}
                />
              )}
            </SquircleCard>

            {/* Личные рекорды */}
            <SquircleCard className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold">Личные рекорды</h2>

                  <p className="mt-1 text-xs text-[#82768A]">
                    Лучшие результаты за всё время
                  </p>
                </div>

                <Trophy size={22} className="text-[#C59A4E]" />
              </div>

              {records.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#82768A]">
                  Рекордов пока нет.
                </p>
              ) : (
                <div className="space-y-3">
                  {records.map((record) => (
                    <div
                      key={record.exerciseId}
                      className="rounded-[20px] bg-[#F8F5F9] p-4"
                    >
                      <h3 className="font-bold">{record.exerciseName}</h3>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-[11px] text-[#82768A]">
                            Макс. вес
                          </p>

                          <p className="mt-1 text-lg font-extrabold tabular-nums">
                            {formatVolume(record.maxWeightKg)}
                            <span className="ml-1 text-xs font-normal">кг</span>
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] text-[#82768A]">
                            Повторения
                          </p>

                          <p className="mt-1 text-lg font-extrabold tabular-nums">
                            {record.maxReps}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] text-[#82768A]">
                            Тоннаж подхода
                          </p>

                          <p className="mt-1 text-lg font-extrabold tabular-nums">
                            {formatVolume(record.maxSetTonnageKg)}
                            <span className="ml-1 text-xs font-normal">кг</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SquircleCard>
          </>
        )}
      </div>
    </main>
  );
}
