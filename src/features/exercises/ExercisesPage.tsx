import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dumbbell, Plus, Search, Pencil, Trash2, Layers } from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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

import { SquircleCard } from "@/components/repbook/SquircleCard";
import { ExerciseFormDialog } from "./ExerciseFormDialog";

import {
  deleteExercise,
  exerciseKeys,
  getExercises,
  getMuscleGroups,
  type Exercise,
} from "./exercises-api";

export function ExercisesPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState("");

  const exercisesQuery = useQuery({
    queryKey: exerciseKeys.all,
    queryFn: getExercises,
  });

  const groupsQuery = useQuery({
    queryKey: exerciseKeys.muscleGroups,
    queryFn: getMuscleGroups,
  });

  const exercises = exercisesQuery.data ?? [];
  const groups = groupsQuery.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();

    return exercises.filter((exercise) => {
      const matchesSearch =
        exercise.name.toLocaleLowerCase().includes(term) ||
        (exercise.description ?? "").toLocaleLowerCase().includes(term);

      const matchesGroup =
        selectedGroup === null || exercise.muscleGroup?.id === selectedGroup;

      return matchesSearch && matchesGroup;
    });
  }, [exercises, search, selectedGroup]);

  const deleteMutation = useMutation({
    mutationFn: deleteExercise,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: exerciseKeys.all,
      });
      setDeletingExercise(null);
      setDeleteError("");
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        setDeleteError(
          error.response?.data?.message ?? "Не удалось удалить упражнение.",
        );
      } else {
        setDeleteError("Не удалось удалить упражнение.");
      }
    },
  });

  function openCreate() {
    setEditingExercise(null);
    setFormOpen(true);
  }

  function openEdit(exercise: Exercise) {
    setEditingExercise(exercise);
    setFormOpen(true);
  }

  const isLoading = exercisesQuery.isPending || groupsQuery.isPending;
  const hasError = exercisesQuery.isError || groupsQuery.isError;

  return (
    <main className="min-h-screen bg-[#F6F1F8] px-4 py-8 text-[#302C33] sm:px-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#947BA1]">
              RepBook/ LIBRARY
            </span>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Упражнения
            </h1>

            <p className="mt-2 text-sm text-[#82768A]">
              Твоя библиотека движений.
            </p>
          </div>

          <Button
            onClick={openCreate}
            className="h-12 cursor-pointer rounded-2xl bg-[#EDBE65] px-5 font-bold text-[#302C33] hover:bg-[#E2AD50]"
          >
            <Plus className="size-4" />
            Добавить
          </Button>
        </header>

        <SquircleCard className="space-y-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#9A8EA1]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Найти упражнение"
              aria-label="Поиск упражнений"
              className="h-13 rounded-2xl border-[#ECE5EF] bg-[#F8F5F9] pl-12"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedGroup(null)}
              className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                selectedGroup === null
                  ? "bg-[#302C33] text-white"
                  : "bg-[#F0EAF2] text-[#75667C] hover:bg-[#E8DEEC]"
              }`}
            >
              Все
            </button>

            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroup(group.id)}
                className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  selectedGroup === group.id
                    ? "bg-[#302C33] text-white"
                    : "bg-[#F0EAF2] text-[#75667C] hover:bg-[#E8DEEC]"
                }`}
              >
                {group.name}
              </button>
            ))}
          </div>
        </SquircleCard>

        {hasError ? (
          <SquircleCard className="text-center">
            <p className="font-semibold">Не удалось загрузить библиотеку</p>
            <p className="mt-2 text-sm text-[#82768A]">
              Проверь подключение к серверу.
            </p>
            <Button
              className="mt-5 cursor-pointer rounded-2xl"
              onClick={() => {
                void exercisesQuery.refetch();
                void groupsQuery.refetch();
              }}
            >
              Повторить
            </Button>
          </SquircleCard>
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-44 rounded-[28px]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <SquircleCard className="py-14 text-center">
            <Dumbbell className="mx-auto size-9 text-[#AA91B5]" />
            <h2 className="mt-4 font-bold">Ничего не найдено</h2>
            <p className="mt-2 text-sm text-[#82768A]">
              Попробуй изменить поиск или фильтр.
            </p>
          </SquircleCard>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#82768A]">
                Найдено: {filtered.length}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((exercise) => (
                <SquircleCard
                  key={exercise.id}
                  className="flex min-h-44 flex-col justify-between gap-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-[#F0E8F3] text-[#8E75A0]">
                      <Dumbbell className="size-5" />
                    </div>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Редактировать ${exercise.name}`}
                        onClick={() => openEdit(exercise)}
                        className="cursor-pointer rounded-xl p-2 text-[#8B7D91] transition-colors hover:bg-[#F2EDF4]"
                      >
                        <Pencil className="size-4" />
                      </button>

                      <button
                        type="button"
                        aria-label={`Удалить ${exercise.name}`}
                        onClick={() => {
                          setDeleteError("");
                          setDeletingExercise(exercise);
                        }}
                        className="cursor-pointer rounded-xl p-2 text-[#8B7D91] transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight">
                      {exercise.name}
                    </h2>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#F0EAF2] px-3 py-1.5 text-xs font-medium text-[#7F6B8C]">
                        {exercise.muscleGroup?.name ?? "Без группы"}
                      </span>

                      {exercise.isCompound && (
                        <span className="flex items-center gap-1 rounded-full bg-[#FFF3D9] px-3 py-1.5 text-xs font-medium text-[#86652B]">
                          <Layers className="size-3" />
                          Базовое
                        </span>
                      )}
                    </div>
                  </div>
                </SquircleCard>
              ))}
            </div>
          </>
        )}
      </div>

      <ExerciseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        exercise={editingExercise}
        muscleGroups={groups}
      />

      <AlertDialog
        open={Boolean(deletingExercise)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setDeletingExercise(null);
            setDeleteError("");
          }
        }}
      >
        <AlertDialogContent className="rounded-[28px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить упражнение?</AlertDialogTitle>
            <AlertDialogDescription>
              «{deletingExercise?.name}» будет удалено из библиотеки. Это
              действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <p role="alert" className="text-sm text-red-600">
              {deleteError}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="cursor-pointer rounded-xl"
            >
              Отмена
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={deleteMutation.isPending}
              className="cursor-pointer rounded-xl bg-red-600 text-white hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                if (deletingExercise) {
                  deleteMutation.mutate(deletingExercise.id);
                }
              }}
            >
              {deleteMutation.isPending ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
