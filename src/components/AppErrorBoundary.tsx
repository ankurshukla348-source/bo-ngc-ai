import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * App-level error boundary.
 *
 * Mounted inside `I18nProvider`, so the fallback can speak the visitor's
 * language instead of showing a blank page. It catches render/lifecycle errors
 * thrown anywhere below it (route components, Convex subscription callbacks,
 * cart and chat widgets) and swaps in a calm, actionable screen:
 * "Đã xảy ra lỗi nhỏ, vui lòng thử lại".
 *
 * The outer `RootErrorBoundary` in main.tsx stays in place as the last resort
 * for a crash *inside a provider* — this one cannot catch those, because it
 * lives below them.
 *
 * The error is logged once with its component stack so the browser console
 * still explains what happened; the visitor only sees the localized copy.
 */
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[app] render error:", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <AppErrorFallback message={this.state.error.message} />;
    }
    return this.props.children;
  }
}

/** Localized crash screen. Must stay defensive: it renders *because* something
 *  else already failed. */
function AppErrorFallback({ message }: { message?: string }) {
  const { t } = useI18n();
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <span className="font-display text-2xl font-bold">!</span>
        </span>
        <h1 className="mt-6 font-display text-2xl font-bold">
          {t("errorBoundaryTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("errorBoundaryBody")}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => window.location.reload()}>
            {t("errorBoundaryRetry")}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            {t("errorBoundaryHome")}
          </Button>
        </div>
        {message && (
          <p className="mt-6 break-words rounded-2xl border border-border bg-card px-4 py-3 text-left text-[11px] leading-relaxed text-muted-foreground">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}

/**
 * One-time global handlers for failures React cannot catch: unhandled promise
 * rejections (a failed Convex mutation outside an event handler) and stray
 * `window.onerror`.
 *
 * Every handler in the app that can reject already has its own try/catch, so
 * reaching this point is always a bug worth seeing — but it must be reported
 * once, in one place, instead of as a wall of duplicate console noise.
 * Safe to call more than once (React StrictMode double-invokes effects).
 */
export function installGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;
  const flag = "__baoNgocErrorHandlers";
  const w = window as unknown as Record<string, unknown>;
  if (w[flag]) return;
  w[flag] = true;

  window.addEventListener("unhandledrejection", (event) => {
    console.error(
      "[app] unhandled promise rejection:",
      event.reason instanceof Error ? event.reason.message : event.reason,
    );
  });

  window.addEventListener("error", (event) => {
    // Resource load errors (an <img> that 404s) also fire "error" but carry no
    // message — logging those produces pure noise.
    if (!event.message) return;
    console.error("[app] uncaught error:", event.message);
  });
}