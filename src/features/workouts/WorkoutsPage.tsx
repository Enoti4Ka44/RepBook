import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Dumbbell, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SquircleCard } from "@/components/repbook/SquircleCard";

import {
  deleteWorkout,
  getWorkouts,
  workoutKeys,
  type Workout,
  type WorkoutStatus,
} from "./workouts-api";

const statusLabels: Record<WorkoutStatus, string> = {
  PLANNED: "Запланирована",
  IN_PROGRESS: "В процессе",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
};

type StatusFilter = WorkoutStatus | "ALL";

const filters: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Все" },
  { value: "PLANNED", label: "Запланированные" },
  { value: "IN_PROGRESS", label: "Активные" },
  { value: "COMPLETED", label: "Завершённые" },
  { value: "CANCELLED", label: "Отменённые" },
];

function formatDate(value?: string | null) {
  if (!value) return "Дата неизвестна";

  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function WorkoutCard({
  workout,
  onDelete,
  isDeleting,
}: {
  workout: Workout;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  const canDelete =
    workout.status === "PLANNED" || workout.status === "CANCELLED";

  const totalSets = (workout.exercises ?? []).reduce(
    (sum, exercise) => sum + (exercise.sets?.length ?? 0),
    0,
  );

  return (
    <SquircleCard className="flex flex-col justify-between gap-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#F0E9F3] text-[#927AA0]">
            <Dumbbell size={23} />
          </div>

          <span className="rounded-full bg-[#F3EDF5] px-3 py-2 text-xs font-semibold text-[#806B8E]">
            {statusLabels[workout.status]}
          </span>
        </div>

        <h2 className="mt-5 text-xl font-extrabold text-[#302C33]">
          Тренировка #{workout.id}
        </h2>

        <p className="mt-2 flex items-center gap-2 text-xs text-[#82768A]">
          <CalendarDays size={14} />
          {formatDate(workout.createdAt)}
        </p>

        <div className="mt-5 flex gap-5 text-sm text-[#716878]">
          <span>{workout.exercises?.length ?? 0} упр.</span>
          <span>{totalSets} подходов</span>
        </div>

        {workout.notes && (
          <p className="mt-4 line-clamp-2 text-sm text-[#82768A]">
            {workout.notes}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Link
          to={`/workouts/${workout.id}`}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#302C33] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#49434C]"
        >
          Открыть
          <ArrowRight size={16} />
        </Link>

        {canDelete && (
          <button
            type="button"
            disabled={isDeleting}
            aria-label={`Удалить тренировку ${workout.id}`}
            onClick={() => onDelete(workout.id)}
            className="flex size-11 cursor-pointer items-center justify-center rounded-2xl bg-[#F5EDF1] text-[#8D7D8B] transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </SquircleCard>
  );
}

export function WorkoutsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [deleteError, setDeleteError] = useState("");

  const workoutsQuery = useQuery({
    queryKey: workoutKeys.all,
    queryFn: getWorkouts,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workoutKeys.all,
      });
    },
    onError: () => {
      setDeleteError("Не удалось удалить тренировку.");
    },
  });

  const workouts = workoutsQuery.data ?? [];

  const filtered = workouts.filter(
    (workout) => filter === "ALL" || workout.status === filter,
  );

  function handleDelete(id: number) {
    setDeleteError("");

    if (window.confirm("Удалить эту тренировку?")) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F1F8] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#947BA1]">
              RepBook/ WORKOUTS
            </p>

            <h1 className="mt-3 text-3xl font-extrabold text-[#302C33] sm:text-4xl">
              Мои тренировки
            </h1>

            <p className="mt-2 text-sm text-[#82768A]">
              Планируй. Тренируйся. Прогрессируй.
            </p>
          </div>

          <Button
            asChild
            className="h-12 cursor-pointer rounded-2xl bg-[#EDBE65] px-5 font-bold text-[#302C33] hover:bg-[#E2AD50]"
          >
            <Link to="/workouts/new">
              <Plus size={18} />
              Создать
            </Link>
          </Button>
        </header>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`shrink-0 cursor-pointer rounded-full px-5 py-2.5 text-xs font-semibold transition-colors ${
                filter === item.value
                  ? "bg-[#302C33] text-white"
                  : "bg-white text-[#82768A] hover:bg-[#EEE6F1]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {deleteError && (
          <p role="alert" className="text-sm text-red-600">
            {deleteError}
          </p>
        )}

        {workoutsQuery.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-64 rounded-[28px]" />
            ))}
          </div>
        ) : workoutsQuery.isError ? (
          <SquircleCard className="text-center">
            <p className="font-semibold text-[#302C33]">
              Не удалось загрузить тренировки
            </p>
            <Button
              onClick={() => void workoutsQuery.refetch()}
              className="mt-4 cursor-pointer"
            >
              Повторить
            </Button>
          </SquircleCard>
        ) : filtered.length === 0 ? (
          <SquircleCard className="py-16 text-center">
            <Dumbbell size={36} className="mx-auto text-[#AA91B5]" />

            <h2 className="mt-4 text-xl font-bold text-[#302C33]">
              {filter === "ALL" ? "Пока нет тренировок" : "Здесь пока пусто"}
            </h2>

            <p className="mt-2 text-sm text-[#82768A]">
              {filter === "ALL"
                ? "Создай свою первую тренировку."
                : "Для этого статуса тренировок нет."}
            </p>

            {filter === "ALL" && (
              <Button
                asChild
                className="mt-6 cursor-pointer rounded-2xl bg-[#EDBE65] text-[#302C33] hover:bg-[#E2AD50]"
              >
                <Link to="/workouts/new">Создать тренировку</Link>
              </Button>
            )}
          </SquircleCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                isDeleting={deleteMutation.isPending}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
