import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { ArrowRight, Dumbbell, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "./AuthProvider";
import type { ApiError } from "./auth-api";

const schema = z.object({
  name: z.string().max(128).optional(),
  username: z.string().min(1, "Введите логин"),
  password: z.string().min(1, "Введите пароль"),
});

type FormValues = z.infer<typeof schema>;

export function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const isRegister = location.pathname === "/register";
  const [serverError, setServerError] = useState("");

  const {
    register: field,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isRegister) {
        await register({
          username: values.username,
          password: values.password,
          name: values.name?.trim() || undefined,
        });
      } else {
        await login({
          username: values.username,
          password: values.password,
        });
      }
    },
    onSuccess: () => navigate("/dashboard", { replace: true }),
    onError: (error) => {
      if (axios.isAxiosError<ApiError>(error)) {
        const data = error.response?.data;

        if (data?.fieldErrors) {
          for (const [fieldName, message] of Object.entries(data.fieldErrors)) {
            if (
              fieldName === "username" ||
              fieldName === "password" ||
              fieldName === "name"
            ) {
              setError(fieldName, { message });
            }
          }
        }

        setServerError(
          data?.message || "Не удалось выполнить запрос. Проверь подключение.",
        );
      } else {
        setServerError("Произошла непредвиденная ошибка.");
      }
    },
  });

  function submit(values: FormValues) {
    setServerError("");

    if (isRegister) {
      if (
        values.username.length < 3 ||
        !/^[a-zA-Z0-9_.-]+$/.test(values.username)
      ) {
        setError("username", {
          message: "От 3 символов: латиница, цифры, _, - или .",
        });
        return;
      }

      if (values.password.length < 8) {
        setError("password", {
          message: "Минимум 8 символов",
        });
        return;
      }
    }

    mutation.mutate(values);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F1F8] p-4 sm:p-8">
      <div className="w-full max-w-107.5">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-[#302C33] text-[#EDBE65]">
            <Dumbbell size={23} strokeWidth={2.2} />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-[#302C33]">
            repbook.
          </span>
        </div>

        <section className="rounded-[32px] border border-white bg-white p-7 shadow-[0_16px_60px_rgba(48,44,51,0.05)] sm:p-9">
          <div className="mb-8">
            <div className="mb-4 inline-flex rounded-full bg-[#EFE7F2] px-3 py-1.5 text-xs font-bold text-[#806B8E]">
              {isRegister ? "НАЧНИ СЕГОДНЯ" : "С ВОЗВРАЩЕНИЕМ"}
            </div>

            <h1 className="text-[30px] font-extrabold tracking-tight text-[#302C33]">
              {isRegister ? "Создать аккаунт" : "Снова в форме"}
            </h1>

            <p className="mt-2 text-sm text-[#8C8490]">
              {isRegister
                ? "Твой прогресс начинается здесь."
                : "Продолжим с того, на чём остановились."}
            </p>
          </div>

          <form onSubmit={handleSubmit(submit)} className="space-y-5">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  placeholder="Как к тебе обращаться?"
                  autoComplete="name"
                  maxLength={128}
                  className="h-12 rounded-2xl border-[#EAE4EC] bg-[#FAF8FB] px-4"
                  {...field("name")}
                />
                {errors.name && (
                  <p className="text-xs text-red-600">{errors.name.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Логин</Label>
              <Input
                id="username"
                placeholder="Введите логин"
                autoComplete="username"
                className="h-12 rounded-2xl border-[#EAE4EC] bg-[#FAF8FB] px-4"
                {...field("username")}
              />
              {errors.username && (
                <p className="text-xs text-red-600">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Введите пароль"
                autoComplete={isRegister ? "new-password" : "current-password"}
                className="h-12 rounded-2xl border-[#EAE4EC] bg-[#FAF8FB] px-4"
                {...field("password")}
              />
              {errors.password && (
                <p className="text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <p
                role="alert"
                className="rounded-2xl bg-red-50 p-3 text-sm text-red-700"
              >
                {serverError}
              </p>
            )}

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="mt-3 h-13 w-full rounded-2xl bg-[#EDBE65] text-sm font-extrabold text-[#302C33] hover:bg-[#E2AD50]"
            >
              {mutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <>
                  {isRegister ? "Создать аккаунт" : "Войти"}
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-7 text-center text-sm text-[#8C8490]">
            {isRegister ? "Уже есть аккаунт?" : "Ещё нет аккаунта?"}{" "}
            <Link
              to={isRegister ? "/login" : "/register"}
              className="font-bold text-[#806B8E] hover:underline"
            >
              {isRegister ? "Войти" : "Регистрация"}
            </Link>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-[#A69CAC]">
          RepBook· Тренируйся в своём ритме
        </p>
      </div>
    </main>
  );
}
