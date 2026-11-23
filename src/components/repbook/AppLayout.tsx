import { NavLink, Outlet } from "react-router";
import {
  ChartNoAxesColumn,
  Dumbbell,
  House,
  Library,
  LogOut,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/features/auth/AuthProvider";

interface NavigationItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const navigation: NavigationItem[] = [
  {
    to: "/dashboard",
    label: "Главная",
    icon: House,
  },
  {
    to: "/workouts",
    label: "Тренировки",
    icon: Dumbbell,
  },
  {
    to: "/exercises",
    label: "Упражнения",
    icon: Library,
  },
  {
    to: "/progress",
    label: "Прогресс",
    icon: ChartNoAxesColumn,
  },
];

function NavigationLink({
  item,
  mobile = false,
}: {
  item: NavigationItem;
  mobile?: boolean;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.to === "/dashboard"}
      className={({ isActive }) =>
        [
          "cursor-pointer transition-colors",
          "focus-visible:outline-2 focus-visible:outline-[#AA91B5]",
          mobile
            ? "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2"
            : "flex items-center gap-3 rounded-2xl px-4 py-3",
          isActive
            ? "bg-[#E9DFEC] font-bold text-[#302C33]"
            : "text-[#82768A] hover:bg-[#F1EBF3]",
        ].join(" ")
      }
    >
      <Icon size={mobile ? 21 : 20} strokeWidth={1.9} />

      <span className={mobile ? "text-[10px]" : "text-sm"}>{item.label}</span>
    </NavLink>
  );
}

export function AppLayout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#F6F1F8] text-[#302C33]">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[#EAE2ED] bg-white px-5 py-7 lg:flex">
        <NavLink
          to="/dashboard"
          className="flex cursor-pointer items-center gap-3 px-3"
        >
          <div className="flex size-11 items-center justify-center rounded-[16px] bg-[#302C33] text-[#EDBE65]">
            <Dumbbell size={23} />
          </div>

          <span className="text-2xl font-extrabold tracking-tight">
            repbook.
          </span>
        </NavLink>

        <p className="mt-12 px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#A69CAC]">
          Меню
        </p>

        <nav aria-label="Основная навигация" className="mt-4 space-y-2">
          {navigation.map((item) => (
            <NavigationLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="mt-auto border-t border-[#EEE8F0] pt-5">
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-[#82768A] transition-colors hover:bg-[#F1EBF3] hover:text-[#302C33]"
          >
            <LogOut size={19} />
            Выйти
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="min-h-screen lg:pl-64">
        <header className="flex h-17 items-center justify-between border-b border-[#EAE2ED] bg-white/80 px-5 backdrop-blur-md lg:hidden">
          <NavLink
            to="/dashboard"
            className="cursor-pointer text-xl font-extrabold tracking-tight"
          >
            repbook<span className="text-[#AA91B5]">.</span>
          </NavLink>

          <button
            type="button"
            aria-label="Выйти из аккаунта"
            onClick={() => void logout()}
            className="flex size-10 cursor-pointer items-center justify-center rounded-2xl bg-[#F1EBF3] text-[#82768A] hover:bg-[#E9DFEC]"
          >
            <LogOut size={19} />
          </button>
        </header>

        <div className="pb-24 lg:pb-0">
          <Outlet />
        </div>
      </div>

      {/* Mobile Navigation */}
      <nav
        aria-label="Мобильная навигация"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#EAE2ED] bg-white/95 px-3 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-8px_35px_rgba(48,44,51,0.04)] backdrop-blur-lg lg:hidden"
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-1">
          {navigation.map((item) => (
            <NavigationLink key={item.to} item={item} mobile />
          ))}
        </div>
      </nav>
    </div>
  );
}
