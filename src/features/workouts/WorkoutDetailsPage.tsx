import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Dumbbell,
  LoaderCircle,
  Pencil,
  Play,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SquircleCard } from "@/components/repbook/SquircleCard";

import {
  getWorkout,
  startWorkout,
  workoutKeys,
  type Workout,
  type WorkoutStatus,
} from "./workouts-api";

// Названия статусов
const statusLabels: Record<WorkoutStatus, string> = {
  PLANNED: "Запланирована",
  IN_PROGRESS: "В процессе",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
};

// Форматирование даты
function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Форматирование продолжительности
function formatDuration(startedAt?: string | null, finishedAt?: string | null) {
  if (!startedAt || !finishedAt) return null;

  const start = new Date(startedAt).getTime();
  const finish = new Date(finishedAt).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(finish) || finish < start) {
    return null;
  }

  const minutes = Math.floor((finish - start) / 60000);

  if (minutes < 60) {
    return `${minutes} мин`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours} ч ${remainingMinutes} мин`
    : `${hours} ч`;
}

// Количество выполненных подходов
function getCompletedSets(workout: Workout) {
  return (workout.exercises ?? []).reduce(
    (total, exercise) =>
      total + (exercise.sets ?? []).filter((set) => set.isCompleted).length,
    0,
  );
}

// Общее количество подходов
function getTotalSets(workout: Workout) {
  return (workout.exercises ?? []).reduce(
    (total, exercise) => total + (exercise.sets ?? []).length,
    0,
  );
}

// Общий тренировочный объём
function getTotalVolume(workout: Workout) {
  return (workout.exercises ?? []).reduce(
    (total, exercise) =>
      total +
      (exercise.sets ?? []).reduce((sum, set) => {
        if (!set.isCompleted) return sum;

        return sum + (set.weightKg ?? 0) * (set.reps ?? 0);
      }, 0),
    0,
  );
}

export function WorkoutDetailsPage() {
  const { id } = useParams();

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const workoutId = Number(id);

  const validId = Number.isSafeInteger(workoutId) && workoutId > 0;

  // Получение тренировки
  const workoutQuery = useQuery({
    queryKey: workoutKeys.detail(workoutId),
    queryFn: () => getWorkout(workoutId),
    enabled: validId,
  });

  // Запуск тренировки
  const startMutation = useMutation({
    mutationFn: () => startWorkout(workoutId),

    onSuccess: async (updatedWorkout) => {
      queryClient.setQueryData(workoutKeys.detail(workoutId), updatedWorkout);

      await queryClient.invalidateQueries({
        queryKey: workoutKeys.all,
      });

      navigate(`/workouts/${workoutId}/active`);
    },
  });

  const workout = workoutQuery.data;

  // Ошибочный ID
  if (!validId) {
    return (
      <PageMessage
        title="Неверный адрес"
        description="Проверь ссылку на тренировку."
      />
    );
  }

  // Загрузка
  if (workoutQuery.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F6F1F8]">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="size-8 animate-spin text-[#AA91B5]" />

          <p className="text-sm text-[#82768A]">Загружаем тренировку...</p>
        </div>
      </main>
    );
  }

  // Ошибка сервера
  if (workoutQuery.isError || !workout) {
    return (
      <PageMessage
        title="Не удалось загрузить тренировку"
        description="Проверь подключение и попробуй снова."
        onRetry={() => void workoutQuery.refetch()}
      />
    );
  }

  const exercises = workout.exercises ?? [];

  const completedSets = getCompletedSets(workout);
  const totalSets = getTotalSets(workout);
  const totalVolume = getTotalVolume(workout);

  const progress =
    totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  const duration = formatDuration(workout.startedAt, workout.finishedAt);

  return (
    <main className="min-h-screen bg-[#F6F1F8] px-4 py-7 pb-20 text-[#302C33] sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Навигация */}
        <header className="flex items-center justify-between">
          <Link
            to="/workouts"
            className="flex items-center gap-2 text-sm font-semibold text-[#82768A] transition-colors hover:text-[#302C33]"
          >
            <ArrowLeft size={18} />
            Мои тренировки
          </Link>

          <span className="text-xs font-extrabold tracking-[0.18em] text-[#AA91B5]">
            REPBOOK
          </span>
        </header>

        {/* Заголовок */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-[#E9DFEC] px-3 py-1.5 text-xs font-bold text-[#806B8E]">
              {statusLabels[workout.status]}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Тренировка #{workout.id}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#82768A]">
            <span className="flex items-center gap-2">
              <CalendarDays size={16} />
              {formatDate(workout.createdAt)}
            </span>

            {duration && (
              <span className="flex items-center gap-2">
                <Clock3 size={16} />
                {duration}
              </span>
            )}
          </div>
        </section>

        {/* Редактирование запланированной тренировки */}
        {workout.status === "PLANNED" && (
          <Link
            to={`/workouts/${workout.id}/edit`}
            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#D8CADD] bg-white px-5 text-sm font-bold text-[#806B8E] transition-colors hover:bg-[#F0E9F3]"
          >
            <Pencil size={17} />
            Редактировать тренировку
          </Link>
        )}

        {/* Главная карточка */}
        <SquircleCard variant="dark" className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/60">
                {workout.status === "PLANNED"
                  ? "Готов к тренировке?"
                  : workout.status === "IN_PROGRESS"
                    ? "Тренировка идёт"
                    : "Результат тренировки"}
              </p>

              <h2 className="mt-2 text-2xl font-extrabold text-white">
                {workout.status === "COMPLETED"
                  ? "Отличная работа!"
                  : "Твой план"}
              </h2>
            </div>

            <div className="flex size-14 shrink-0 items-center justify-center rounded-[20px] bg-[#EDBE65] text-[#302C33]">
              <Dumbbell size={26} />
            </div>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-3 gap-3">
            <StatItem value={String(exercises.length)} label="Упражнений" />

            <StatItem value={String(totalSets)} label="Подходов" />

            <StatItem value={`${progress}%`} label="Прогресс" />
          </div>

          {/* Прогресс */}
          <div className="h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#EDBE65] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Кнопки управления */}
          {workout.status === "PLANNED" && (
            <div className="space-y-3">
              <Button
                type="button"
                disabled={startMutation.isPending || exercises.length === 0}
                onClick={() => startMutation.mutate()}
                className="h-13 w-full cursor-pointer rounded-2xl bg-[#EDBE65] font-extrabold text-[#302C33] hover:bg-[#E2AD50] disabled:cursor-not-allowed"
              >
                {startMutation.isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Запуск...
                  </>
                ) : (
                  <>
                    <Play size={18} fill="currentColor" />
                    Начать тренировку
                  </>
                )}
              </Button>

              {startMutation.isError && (
                <p role="alert" className="text-sm text-red-300">
                  Не удалось запустить тренировку. Возможно, другая тренировка
                  уже активна.
                </p>
              )}
            </div>
          )}

          {workout.status === "IN_PROGRESS" && (
            <Button
              asChild
              className="h-13 w-full cursor-pointer rounded-2xl bg-[#EDBE65] font-extrabold text-[#302C33] hover:bg-[#E2AD50]"
            >
              <Link to={`/workouts/${workout.id}/active`}>
                Продолжить тренировку
                <ArrowRight size={18} />
              </Link>
            </Button>
          )}
        </SquircleCard>

        {/* Результаты завершённой тренировки */}
        {workout.status === "COMPLETED" && (
          <div className="grid grid-cols-2 gap-4">
            <SquircleCard>
              <p className="text-sm text-[#82768A]">Выполнено подходов</p>

              <p className="mt-3 text-3xl font-extrabold">{completedSets}</p>
            </SquircleCard>

            <SquircleCard>
              <p className="text-sm text-[#82768A]">Объём нагрузки</p>

              <p className="mt-3 text-3xl font-extrabold">
                {totalVolume.toLocaleString("ru-RU")}
                <span className="ml-1 text-sm font-medium text-[#82768A]">
                  кг
                </span>
              </p>
            </SquircleCard>
          </div>
        )}

        {/* Заметки */}
        {workout.notes && (
          <SquircleCard>
            <p className="text-xs font-bold uppercase tracking-wide text-[#AA91B5]">
              Заметки
            </p>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
              {workout.notes}
            </p>
          </SquircleCard>
        )}

        {/* Упражнения */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold">Упражнения</h2>

            <span className="rounded-full bg-[#E9DFEC] px-3 py-1.5 text-xs font-bold text-[#806B8E]">
              {exercises.length}
            </span>
          </div>

          {exercises.length === 0 ? (
            <SquircleCard className="py-12 text-center">
              <Dumbbell className="mx-auto size-9 text-[#AA91B5]" />

              <p className="mt-4 font-bold">Упражнений пока нет</p>

              <p className="mt-2 text-sm text-[#82768A]">
                Добавь упражнения в план тренировки.
              </p>
            </SquircleCard>
          ) : (
            exercises.map((item, index) => (
              <SquircleCard key={item.id} className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFE7F2] font-extrabold text-[#8D75A0]">
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-extrabold">{item.exercise.name}</h3>

                    <p className="mt-1 text-xs text-[#82768A]">
                      {item.exercise.muscleGroup?.name ?? "Без группы"}
                    </p>
                  </div>
                </div>

                {/* Подходы */}
                <div className="space-y-2">
                  {(item.sets ?? []).map((set) => (
                    <div
                      key={set.id}
                      className={`flex items-center justify-between gap-3 rounded-[18px] px-4 py-3 ${
                        set.isCompleted ? "bg-[#EEE7F2]" : "bg-[#F8F5F9]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-8 items-center justify-center rounded-xl ${
                            set.isCompleted
                              ? "bg-[#AA91B5] text-white"
                              : "bg-white text-[#82768A]"
                          }`}
                        >
                          {set.isCompleted ? (
                            <Check size={16} />
                          ) : (
                            <span className="text-xs font-bold">
                              {set.setNumber}
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-bold">
                            Подход {set.setNumber}
                          </p>

                          {set.isWarmup && (
                            <p className="text-xs text-[#927AA0]">Разминка</p>
                          )}
                        </div>
                      </div>

                      <p className="text-sm font-bold tabular-nums">
                        {set.isCompleted
                          ? (set.weightKg ?? set.plannedWeightKg ?? 0)
                          : (set.plannedWeightKg ?? 0)}
                        {" кг × "}
                        {set.isCompleted
                          ? (set.reps ?? set.plannedReps ?? "—")
                          : (set.plannedReps ?? "—")}
                      </p>
                    </div>
                  ))}
                </div>
              </SquircleCard>
            ))
          )}
        </section>

        {/* Возврат */}
        <Link
          to="/workouts"
          className="flex cursor-pointer items-center justify-center gap-2 py-4 text-sm font-semibold text-[#82768A] transition-colors hover:text-[#302C33]"
        >
          <ArrowLeft size={17} />К списку тренировок
        </Link>
      </div>
    </main>
  );
}

// Статистика внутри тёмной карточки
function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-extrabold tabular-nums text-[#EDBE65]">
        {value}
      </p>

      <p className="mt-1 text-xs text-white/55">{label}</p>
    </div>
  );
}

// Экран ошибки
function PageMessage({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F1F8] p-5">
      <SquircleCard className="w-full max-w-md space-y-5 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-[20px] bg-[#EFE7F2] text-[#8D75A0]">
          <RotateCcw size={25} />
        </div>

        <div>
          <h1 className="text-xl font-extrabold">{title}</h1>

          <p className="mt-2 text-sm text-[#82768A]">{description}</p>
        </div>

        <div className="flex justify-center gap-3">
          <Button
            asChild
            variant="outline"
            className="cursor-pointer rounded-2xl"
          >
            <Link to="/workouts">Назад</Link>
          </Button>

          {onRetry && (
            <Button
              type="button"
              onClick={onRetry}
              className="cursor-pointer rounded-2xl bg-[#302C33] text-white hover:bg-[#49434C]"
            >
              Повторить
            </Button>
          )}
        </div>
      </SquircleCard>
    </main>
  );
}
