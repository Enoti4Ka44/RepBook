import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  createExercise,
  updateExercise,
  exerciseKeys,
  type Exercise,
  type MuscleGroup,
  type ExercisePayload,
} from "./exercises-api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise?: Exercise | null;
  muscleGroups: MuscleGroup[];
}

export function ExerciseFormDialog({
  open,
  onOpenChange,
  exercise,
  muscleGroups,
}: Props) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(exercise);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [muscleGroupId, setMuscleGroupId] = useState("none");
  const [isCompound, setIsCompound] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setName(exercise?.name ?? "");
    setDescription(exercise?.description ?? "");
    setMuscleGroupId(exercise?.muscleGroup?.id.toString() ?? "none");
    setIsCompound(exercise?.isCompound ?? true);
    setError("");
  }, [open, exercise]);

  const mutation = useMutation({
    mutationFn: (payload: ExercisePayload) => {
      if (exercise) {
        return updateExercise(exercise.id, payload);
      }
      return createExercise(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: exerciseKeys.all,
      });
      onOpenChange(false);
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;

        setError(
          typeof message === "string"
            ? message
            : "Не удалось сохранить упражнение.",
        );
      } else {
        setError("Не удалось сохранить упражнение.");
      }
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Введите название упражнения.");
      return;
    }

    if (trimmedName.length > 128) {
      setError("Название слишком длинное.");
      return;
    }

    const payload: ExercisePayload = {
      name: trimmedName,
      description: description.trim(),
      isCompound,
      ...(muscleGroupId !== "none"
        ? { muscleGroupId: Number(muscleGroupId) }
        : {}),
    };

    mutation.mutate(payload);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!mutation.isPending) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[28px] border-0 bg-white p-6 sm:max-w-md sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-extrabold text-[#302C33]">
            {isEditing ? "Изменить упражнение" : "Новое упражнение"}
          </DialogTitle>

          <DialogDescription>
            {isEditing
              ? "Обнови информацию об упражнении."
              : "Добавь упражнение в библиотеку."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="exercise-name">Название</Label>
            <Input
              id="exercise-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, жим лёжа"
              maxLength={128}
              required
              className="h-12 rounded-2xl border-[#E9DFEC] bg-[#F9F6FA] px-4"
            />
          </div>

          <div className="space-y-2">
            <Label>Мышечная группа</Label>
            <Select
              value={muscleGroupId}
              onValueChange={(value) => {
                if (value !== null) setMuscleGroupId(value);
              }}
            >
              <SelectTrigger className="h-12 w-full rounded-2xl border-[#E9DFEC] bg-[#F9F6FA] px-4">
                <SelectValue placeholder="Выбрать группу" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="none">Без группы</SelectItem>

                {muscleGroups.map((group) => (
                  <SelectItem key={group.id} value={String(group.id)}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="exercise-description">Описание</Label>
            <Textarea
              id="exercise-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Необязательно"
              maxLength={500}
              rows={3}
              className="resize-none rounded-2xl border-[#E9DFEC] bg-[#F9F6FA] px-4 py-3"
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-[#F4EFF6] p-4">
            <div>
              <p className="text-sm font-semibold text-[#302C33]">
                Базовое упражнение
              </p>
              <p className="mt-1 text-xs text-[#82768A]">
                Задействует несколько суставов
              </p>
            </div>

            <input
              type="checkbox"
              checked={isCompound}
              onChange={(e) => setIsCompound(e.target.checked)}
              className="size-5 cursor-pointer accent-[#AA91B5]"
              aria-label="Базовое упражнение"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={mutation.isPending}
            className="h-12 w-full cursor-pointer rounded-2xl bg-[#EDBE65] font-bold text-[#302C33] hover:bg-[#E2AD50]"
          >
            {mutation.isPending
              ? "Сохранение..."
              : isEditing
                ? "Сохранить изменения"
                : "Добавить упражнение"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
