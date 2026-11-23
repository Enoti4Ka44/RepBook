import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";

import { AuthPage } from "@/features/auth/AuthPage";
import { useAuth } from "@/features/auth/AuthProvider";

import { AppLayout } from "@/components/repbook/AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { WorkoutEditPage } from "@/features/workouts/WorkoutEditPage";
import { ExercisesPage } from "@/features/exercises/ExercisesPage";
import { ProgressPage } from "@/features/progress/ProgressPage";
import { WorkoutsPage } from "@/features/workouts/WorkoutsPage";
import { WorkoutBuilderPage } from "@/features/workouts/WorkoutBuilderPage";
import { WorkoutDetailsPage } from "@/features/workouts/WorkoutDetailsPage";
import { ActiveWorkoutPage } from "@/features/workouts/ActiveWorkoutPage";
import { WorkoutHistoryPage } from "@/features/workouts/WorkoutHistoryPage";
import { WorkoutSummaryPage } from "@/features/workouts/WorkoutSummaryPage";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F1F8] text-sm text-[#82768A]">
        Загрузка...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-[#F6F1F8]" />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Авторизация */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthPage />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <AuthPage />
          </PublicRoute>
        }
      />

      {/* Основное приложение */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/exercises" element={<ExercisesPage />} />

        <Route path="/workouts" element={<WorkoutsPage />} />

        <Route path="/workouts/new" element={<WorkoutBuilderPage />} />

        <Route path="/workouts/:id" element={<WorkoutDetailsPage />} />

        <Route path="/workouts/:id/summary" element={<WorkoutSummaryPage />} />

        <Route path="/workouts/:id/edit" element={<WorkoutEditPage />} />

        <Route path="/history" element={<WorkoutHistoryPage />} />

        <Route path="/progress" element={<ProgressPage />} />
      </Route>

      {/* Активная тренировка — без общего меню */}
      <Route
        path="/workouts/:id/active"
        element={
          <ProtectedRoute>
            <ActiveWorkoutPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
