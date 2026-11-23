import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Check,
  Clock3,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SquircleCard } from "@/components/repbook/SquircleCard";

type RestState = {
  duration: number;
  remaining: number;
  endsAt: number | null;
  done: boolean;
};

type StartRestDetail = {
  workoutId: number;
  seconds?: number | null;
};

const DEFAULT_REST = 90;
const REST_OPTIONS = [60, 90, 120];

const AUTO_KEY = "forma:rest:auto";
const SOUND_KEY = "forma:rest:sound";

let audioContext: AudioContext | null = null;

function readPreference(key: string, fallback: boolean) {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : saved === "true";
  } catch {
    return fallback;
  }
}

function savePreference(key: string, value: boolean) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Хранилище может быть недоступно.
  }
}

function storageKey(workoutId: number) {
  return `forma:rest:${workoutId}`;
}

function idleState(duration = DEFAULT_REST): RestState {
  return {
    duration,
    remaining: duration,
    endsAt: null,
    done: false,
  };
}

function restoreState(workoutId: number): RestState | null {
  try {
    const raw = localStorage.getItem(storageKey(workoutId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as RestState;

    if (
      !Number.isFinite(parsed.duration) ||
      parsed.duration <= 0 ||
      parsed.duration > 3600 ||
      !Number.isFinite(parsed.remaining) ||
      parsed.remaining < 0 ||
      parsed.remaining > 3600 ||
      (parsed.endsAt !== null && !Number.isFinite(parsed.endsAt))
    ) {
      return null;
    }

    if (parsed.endsAt !== null) {
      const remaining = Math.max(
        0,
        Math.ceil((parsed.endsAt - Date.now()) / 1000),
      );

      return {
        duration: parsed.duration,
        remaining,
        endsAt: remaining > 0 ? parsed.endsAt : null,
        done: remaining === 0,
      };
    }

    return parsed;
  } catch {
    return null;
  }
}

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

// Браузеры обычно требуют пользовательского действия
// перед воспроизведением звука.
export function unlockRestAudio() {
  if (!readPreference(SOUND_KEY, false)) return;

  try {
    audioContext ??= new AudioContext();

    if (audioContext.state === "suspended") {
      void audioContext.resume().catch(() => {});
    }
  } catch {
    // Звук необязателен для работы таймера.
  }
}

function playRestSound() {
  const context = audioContext;

  if (!context || context.state !== "running") {
    return;
  }

  try {
    const start = context.currentTime;

    for (let index = 0; index < 2; index++) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      const at = start + index * 0.24;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(740, at);

      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.12, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(at);
      oscillator.stop(at + 0.2);
    }
  } catch {
    // Ошибка воспроизведения не влияет на тренировку.
  }
}

// Вызываем ТОЛЬКО после успешного PATCH подхода.
export function startRestTimer(workoutId: number, seconds?: number | null) {
  window.dispatchEvent(
    new CustomEvent<StartRestDetail>("forma:rest-start", {
      detail: { workoutId, seconds },
    }),
  );
}

// Вызываем ТОЛЬКО после успешного finish / cancel.
export function clearRestTimer(workoutId: number) {
  try {
    localStorage.removeItem(storageKey(workoutId));
  } catch {
    // Игнорируем ограничения браузера.
  }

  window.dispatchEvent(
    new CustomEvent<number>("forma:rest-clear", {
      detail: workoutId,
    }),
  );
}

export function RestTimer({ workoutId }: { workoutId: number }) {
  const [rest, setRest] = useState<RestState | null>(() =>
    restoreState(workoutId),
  );

  const [autoStart, setAutoStart] = useState(() =>
    readPreference(AUTO_KEY, true),
  );

  const [soundEnabled, setSoundEnabled] = useState(() =>
    readPreference(SOUND_KEY, false),
  );

  const wasRunning = useRef(false);
  const current = rest ?? idleState();
  const running = current.endsAt !== null;

  // Сохраняем текущее состояние.
  useEffect(() => {
    try {
      if (rest === null) {
        localStorage.removeItem(storageKey(workoutId));
      } else {
        localStorage.setItem(storageKey(workoutId), JSON.stringify(rest));
      }
    } catch {
      // Таймер продолжит работать в памяти.
    }
  }, [rest, workoutId]);

  // Пересчитываем время по абсолютному времени окончания.
  useEffect(() => {
    if (rest?.endsAt === null || !rest) return;

    const interval = window.setInterval(() => {
      setRest((previous) => {
        if (!previous || previous.endsAt === null) {
          return previous;
        }

        const remaining = Math.max(
          0,
          Math.ceil((previous.endsAt - Date.now()) / 1000),
        );

        if (remaining === 0) {
          return {
            ...previous,
            remaining: 0,
            endsAt: null,
            done: true,
          };
        }

        if (remaining === previous.remaining) {
          return previous;
        }

        return { ...previous, remaining };
      });
    }, 250);

    return () => window.clearInterval(interval);
  }, [rest?.endsAt]);

  // Сигнал при переходе от запущенного таймера
  // к завершённому.
  useEffect(() => {
    if (current.done && wasRunning.current && soundEnabled) {
      playRestSound();
    }

    wasRunning.current = running;
  }, [current.done, running, soundEnabled]);

  // Автоматический старт после выполненного подхода.
  useEffect(() => {
    function onStart(event: Event) {
      if (!autoStart) return;

      const detail = (event as CustomEvent<StartRestDetail>).detail;

      if (detail.workoutId !== workoutId) return;

      // 0 секунд означает отсутствие отдыха.
      if (detail.seconds === 0) return;

      setRest((previous) => {
        const duration =
          detail.seconds != null &&
          Number.isFinite(detail.seconds) &&
          detail.seconds > 0
            ? detail.seconds
            : (previous?.duration ?? DEFAULT_REST);

        return {
          duration,
          remaining: duration,
          endsAt: Date.now() + duration * 1000,
          done: false,
        };
      });
    }

    function onClear(event: Event) {
      const id = (event as CustomEvent<number>).detail;

      if (id === workoutId) {
        setRest(null);
      }
    }

    window.addEventListener("forma:rest-start", onStart);
    window.addEventListener("forma:rest-clear", onClear);

    return () => {
      window.removeEventListener("forma:rest-start", onStart);
      window.removeEventListener("forma:rest-clear", onClear);
    };
  }, [autoStart, workoutId]);

  function selectDuration(duration: number) {
    setRest(idleState(duration));
  }

  function toggleTimer() {
    unlockRestAudio();

    setRest((previous) => {
      const state = previous ?? idleState();

      if (state.endsAt !== null) {
        return {
          ...state,
          remaining: Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000)),
          endsAt: null,
          done: false,
        };
      }

      const remaining = state.remaining > 0 ? state.remaining : state.duration;

      return {
        ...state,
        remaining,
        endsAt: Date.now() + remaining * 1000,
        done: false,
      };
    });
  }

  function resetTimer() {
    setRest(idleState(current.duration));
  }

  function toggleSound() {
    const next = !soundEnabled;

    savePreference(SOUND_KEY, next);
    setSoundEnabled(next);

    if (next) {
      unlockRestAudio();
    }
  }

  const progress =
    current.duration > 0 ? (current.remaining / current.duration) * 100 : 0;

  return (
    <SquircleCard className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock3 size={20} className="text-[#927AA0]" />
          <h2 className="font-extrabold">Отдых</h2>
        </div>

        <button
          type="button"
          onClick={toggleSound}
          aria-label={
            soundEnabled ? "Выключить звук таймера" : "Включить звук таймера"
          }
          aria-pressed={soundEnabled}
          className="flex size-10 cursor-pointer items-center justify-center rounded-xl bg-[#F2EDF4] text-[#806B8E]"
        >
          {soundEnabled ? <Bell size={18} /> : <BellOff size={18} />}
        </button>
      </div>

      <div className="flex gap-2">
        {REST_OPTIONS.map((duration) => (
          <button
            key={duration}
            type="button"
            aria-pressed={current.duration === duration}
            onClick={() => selectDuration(duration)}
            className={`flex-1 cursor-pointer rounded-xl px-3 py-2 text-xs font-bold ${
              current.duration === duration
                ? "bg-[#302C33] text-white"
                : "bg-[#F2EDF4] text-[#806B8E]"
            }`}
          >
            {duration} сек
          </button>
        ))}
      </div>

      <div className="py-2 text-center">
        {current.done ? (
          <>
            <Check size={27} className="mx-auto mb-2 text-[#927AA0]" />
            <p className="text-xl font-extrabold">Отдых завершён</p>
            <p className="mt-1 text-xs text-[#82768A]">
              Можно приступать к следующему подходу
            </p>
          </>
        ) : (
          <>
            <p
              role="timer"
              className="text-5xl font-extrabold tabular-nums tracking-tight"
            >
              {formatSeconds(current.remaining)}
            </p>
            <p className="mt-2 text-xs text-[#82768A]">
              {running
                ? "Отсчёт идёт"
                : current.remaining < current.duration
                  ? "На паузе"
                  : "Готов к запуску"}
            </p>
          </>
        )}
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[#EEE8F0]">
        <div
          className="h-full rounded-full bg-[#AA91B5] transition-[width] duration-300"
          style={{
            width: `${Math.max(0, Math.min(100, progress))}%`,
          }}
        />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button
          type="button"
          onClick={toggleTimer}
          className="h-12 cursor-pointer rounded-2xl bg-[#EDBE65] font-bold text-[#302C33] hover:bg-[#E2AD50]"
        >
          {running ? <Pause size={17} /> : <Play size={17} />}
          {running
            ? "Пауза"
            : current.done
              ? "Повторить"
              : current.remaining < current.duration
                ? "Продолжить"
                : "Старт"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={resetTimer}
          aria-label="Сбросить таймер"
          className="h-12 cursor-pointer rounded-2xl px-4"
        >
          <RotateCcw size={18} />
        </Button>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-[#EEE8F0] pt-4">
        <div>
          <p className="text-sm font-bold">Автоматический отдых</p>
          <p className="mt-1 text-xs text-[#82768A]">
            После выполнения подхода
          </p>
        </div>

        <input
          type="checkbox"
          checked={autoStart}
          onChange={(event) => {
            setAutoStart(event.target.checked);
            savePreference(AUTO_KEY, event.target.checked);
          }}
          className="size-5 cursor-pointer accent-[#AA91B5]"
        />
      </label>
    </SquircleCard>
  );
}
