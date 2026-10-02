import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import {
  AppErrorBoundary,
  installGlobalErrorHandlers,
} from "@/components/AppErrorBoundary";
import { RequireAuth } from "@/components/RequireAuth";
import { PolicyGate } from "@/components/store/PolicyGate";
import { LiveChatWidget } from "@/components/store/LiveChatWidget";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { CartProvider } from "./lib/cart";
import { I18nProvider } from "./lib/i18n";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Checkout = lazy(() => import("./pages/Checkout.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AuthPage = lazy(() =>
  import("./pages/Auth.tsx").then((m) => ({ default: m.AuthPage })),
);
const Policy = lazy(() => import("./pages/Policy.tsx"));
const TrackOrder = lazy(() => import("./pages/TrackOrder.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in the browser runtime). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[Preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * The Convex deployment URL, validated before anything else boots.
 *
 * `new ConvexReactClient(undefined)` throws at module-evaluation time — before
 * React mounts, and therefore before any error boundary exists to catch it. The
 * symptom is a completely blank white page with nothing in the console that a
 * shop owner can act on, which is the worst possible failure mode for a missing
 * environment variable. Checking it here turns that into a readable message.
 *
 * `VITE_*` variables are inlined at BUILD time, not read at runtime, so this
 * only guards the build — it is not a way to configure the site after it has
 * been deployed.
 */
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL?.trim();

function renderFatalConfigError(detail: string) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = "";
  const box = document.createElement("div");
  box.style.cssText =
    "min-height:100vh;display:flex;align-items:center;justify-content:center;" +
    "padding:2rem;background:#fdf7f9;color:#3b2a32;" +
    "font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif";
  const inner = document.createElement("div");
  inner.style.cssText = "max-width:34rem;text-align:center";
  const heading = document.createElement("h1");
  heading.textContent = "Shop chưa được cấu hình xong";
  heading.style.cssText = "font-size:1.25rem;font-weight:700;margin:0 0 .75rem";
  const body = document.createElement("p");
  body.textContent =
    "Trang chưa thể khởi động vì thiếu cấu hình. Vui lòng thử lại sau.";
  body.style.cssText = "margin:0 0 1rem;line-height:1.6;opacity:.8";
  const detailEl = document.createElement("code");
  detailEl.textContent = detail;
  detailEl.style.cssText =
    "display:block;padding:.75rem;border-radius:.5rem;background:#fff1f5;" +
    "font-size:.8rem;opacity:.85;word-break:break-word";
  inner.append(heading, body, detailEl);
  box.append(inner);
  root.append(box);
}

/**
 * Whether the app can boot at all.
 *
 * When this is false the Convex client is never constructed and React is never
 * mounted — the message on screen is the whole experience. That is deliberate:
 * constructing the client with a bad URL throws at module-evaluation time,
 * before any error boundary is in place, which is what produces a blank page.
 */
const IS_CONFIGURED = !!CONVEX_URL && CONVEX_URL.includes("://");

if (!IS_CONFIGURED) {
  renderFatalConfigError(
    CONVEX_URL
      ? `VITE_CONVEX_URL is not an absolute URL: ${CONVEX_URL}`
      : "Missing environment variable: VITE_CONVEX_URL",
  );
}

/**
 * The client is constructed either way so that this module never throws and
 * leaves an uncaught error in the console. `https://unconfigured.invalid` is a
 * syntactically valid absolute URL that can never resolve; it is unreachable in
 * practice because React is only mounted when `IS_CONFIGURED` is true.
 */
const convex = new ConvexReactClient(
  (CONVEX_URL || "https://unconfigured.invalid") as string,
);

// Report unhandled rejections / stray window errors once, in one place, before
// React mounts — otherwise a single failed mutation logs a wall of duplicates.
installGlobalErrorHandlers();



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
    // New page = top of page (hash anchors on the same route are unaffected).
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


// Only mount when the deployment URL is valid. On a misconfigured build
// `renderFatalConfigError` has already put a readable message in #root, and
// mounting React on top of it would just replace that message with the very
// blank page this guard exists to prevent.
if (IS_CONFIGURED) {
  createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider
        client={convex}
        // The OAuth callback returns with ?code=… . Swap it out of the address
        // bar once the provider has exchanged it, so a refresh doesn't re-run
        // the handshake and the sign-in page isn't stuck in "finishing".
        replaceURL={(url) => window.history.replaceState(null, "", url)}
      >
        <I18nProvider>
          {/* Localized last line of defence for anything that throws below
              the providers: renders "Đã xảy ra lỗi nhỏ, vui lòng thử lại"
              instead of a blank white screen. */}
          <AppErrorBoundary>
          <CartProvider>
            <BrowserRouter>
              <RouteSyncer />
              {/* First-login store policy consent — sits above every route so
                  the notice cannot be skipped by going straight to /checkout. */}
              <PolicyGate />
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/seller" element={<Admin />} />
                  {/* Public store policy — reachable from the header, the
                      footer and the first-login consent modal. */}
                  <Route path="/policy" element={<Policy />} />
                  <Route path="/track" element={<TrackOrder />} />
                  {/* OAuth can land back on the app at /auth (optionally with
                      a sub-path or the ?code= param) — all of them resolve to
                      the sign-in screen, never to an unhandled route. */}
                  <Route path="/auth/*" element={<AuthPage redirectAfterAuth="/" />} />
                  <Route
                    path="/dashboard"
                    element={
                      <RequireAuth>
                        <Dashboard />
                      </RequireAuth>
                    }
                  />
                  {/* Same customer account view, friendlier URL. */}
                  <Route
                    path="/account"
                    element={
                      <RequireAuth>
                        <Dashboard />
                      </RequireAuth>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              {/* Live chat is mounted here, once, for every route — not inside
                  the landing page. It is the shop's ONLY published contact
                  channel (no phone number appears anywhere on the site), so a
                  customer standing on /checkout or /track with a question must
                  still be able to open it. Fixed-position, so it never affects
                  any page's layout. */}
              <LiveChatWidget />
            </BrowserRouter>
          </CartProvider>
          </AppErrorBoundary>
        </I18nProvider>
        <Toaster />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
  );
}
