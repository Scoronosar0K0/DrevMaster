"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

// Уведомления и подтверждения внутри приложения вместо alert()/confirm()
// браузера. Функции можно вызывать из любого обработчика без хуков:
//   notify.success("Сохранено"); notify.error("Ошибка");
//   if (!(await confirmAction("Удалить?", { danger: true }))) return;

type Tone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  danger?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  message: string;
  resolve: (ok: boolean) => void;
}

let pushToast: ((tone: Tone, message: string) => void) | null = null;
let openConfirm: ((request: ConfirmRequest) => void) | null = null;

function show(tone: Tone, message: string) {
  // Если хост не смонтирован (например, до гидратации), используем браузер
  if (pushToast) pushToast(tone, message);
  else window.alert(message);
}

export const notify = {
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
  info: (message: string) => show("info", message),
};

export function confirmAction(
  message: string,
  options: ConfirmOptions = {}
): Promise<boolean> {
  if (!openConfirm) return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => openConfirm!({ message, ...options, resolve }));
}

const TOAST_STYLES: Record<Tone, { box: string; icon: string }> = {
  success: { box: "border-emerald-200", icon: "text-emerald-600" },
  error: { box: "border-red-200", icon: "text-red-600" },
  info: { box: "border-ink-200", icon: "text-brand-600" },
};

export function FeedbackHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    pushToast = (tone, message) => {
      const id = ++nextId.current;
      setToasts((list) => [...list.slice(-3), { id, tone, message }]);
      setTimeout(
        () => setToasts((list) => list.filter((t) => t.id !== id)),
        tone === "error" ? 7000 : 4000
      );
    };
    openConfirm = (r) => setRequest(r);
    return () => {
      pushToast = null;
      openConfirm = null;
    };
  }, []);

  useEffect(() => {
    if (!request) return;
    confirmButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const close = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };

  return (
    <>
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-end gap-2 sm:left-auto sm:w-96"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-xl animate-slideInUp ${TOAST_STYLES[toast.tone].box}`}
          >
            <Icon
              name={toast.tone === "error" ? "alert" : toast.tone === "success" ? "check" : "info"}
              className={`mt-0.5 h-5 w-5 shrink-0 ${TOAST_STYLES[toast.tone].icon}`}
            />
            <p className="flex-1 whitespace-pre-line text-sm text-ink-800">
              {toast.message}
            </p>
            <button
              onClick={() =>
                setToasts((list) => list.filter((t) => t.id !== toast.id))
              }
              className="rounded-md p-0.5 text-ink-400 hover:text-ink-700"
              aria-label="Закрыть"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {request && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-950/50 animate-fadeIn"
            onClick={() => close(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="relative w-full max-w-md rounded-xl border border-ink-200 bg-white p-6 shadow-xl animate-scaleIn"
          >
            <h3 id="confirm-title" className="text-lg font-semibold text-ink-900">
              {request.title || "Подтвердите действие"}
            </h3>
            <p className="mt-2 whitespace-pre-line text-sm text-ink-600">
              {request.message}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-secondary" onClick={() => close(false)}>
                Отмена
              </button>
              <button
                ref={confirmButton}
                className={`btn ${request.danger ? "btn-danger" : "btn-primary"}`}
                onClick={() => close(true)}
              >
                {request.confirmText || "Подтвердить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
