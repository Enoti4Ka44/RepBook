import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { SquircleCard } from "@/components/repbook/SquircleCard";

import { exerciseKeys, getExercises } from "@/features/exercises/exercises-api";

import { addExerciseToWorkout, workoutKeys } from "./workouts-api";

import { Plus, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { deleteWorkoutSet } from "./workouts-api";

export function AddWorkoutExercise({ workoutId }: { workoutId: number }) {
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");

  const exercisesQuery = useQuery({
    queryKey: exerciseKeys.all,
    queryFn: getExercises,
  });

  const mutation = useMutation({
    mutationFn: () =>
      addExerciseToWorkout(workoutId, {
        exerciseId: Number(selectedId),
        plannedSets: 3,
        plannedReps: 10,
        plannedWeightKg: 0,
      }),

    onSuccess: async () => {
      setSelectedId("");
      setError("");

      await queryClient.invalidateQueries({
        queryKey: workoutKeys.all,
      });
    },

    onError: () => {
      setError("Не удалось добавить упражнение.");
    },
  });

  return (
    <SquircleCard className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[#EFE7F2] text-[#927AA0]">
          <Plus size={22} />
        </div>

        <h2 className="font-extrabold">Добавить упражнение</h2>
      </div>

      {exercisesQuery.isError ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-red-600">
            Не удалось загрузить библиотеку.
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={() => void exercisesQuery.refetch()}
            className="cursor-pointer rounded-2xl"
          >
            Повторить
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={selectedId}
            aria-label="Выбрать упражнение"
            disabled={exercisesQuery.isPending}
            onChange={(event) => setSelectedId(event.target.value)}
            className="h-12 min-w-0 flex-1 cursor-pointer rounded-2xl border border-[#E9DFEC] bg-[#F9F6FA] px-4 text-sm focus-visible:outline-2 focus-visible:outline-[#AA91B5]"
          >
            <option value="">
              {exercisesQuery.isPending ? "Загрузка..." : "Выбрать упражнение"}
            </option>

            {(exercisesQuery.data ?? []).map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>

          <Button
            type="button"
            disabled={!selectedId || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="h-12 cursor-pointer rounded-2xl bg-[#302C33] px-5 font-bold text-white hover:bg-[#48424B] disabled:cursor-not-allowed"
          >
            <Plus size={17} />
            {mutation.isPending ? "Добавление..." : "Добавить"}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </SquircleCard>
  );
}

export function DeleteWorkoutSetButton({
  workoutId,
  setId,
  setNumber,
}: {
  workoutId: number;
  setId: number;
  setNumber: number;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => deleteWorkoutSet(workoutId, setId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workoutKeys.all,
      });

      setError("");
      setOpen(false);
    },

    onError: () => {
      setError("Не удалось удалить подход.");
    },
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!mutation.isPending) {
          setOpen(value);
          if (!value) setError("");
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label={`Удалить подход ${setNumber}`}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[#A093A6] transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={17} />
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent className="rounded-[28px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить подход?</AlertDialogTitle>

          <AlertDialogDescription>
            Подход {setNumber} будет удалён из тренировки.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={mutation.isPending}
            className="cursor-pointer rounded-2xl"
          >
            Отмена
          </AlertDialogCancel>

          <AlertDialogAction
            disabled={mutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
            className="cursor-pointer rounded-2xl bg-red-600 text-white hover:bg-red-700"
          >
            {mutation.isPending ? "Удаление..." : "Удалить"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
