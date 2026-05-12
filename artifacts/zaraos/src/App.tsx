// ============================================================
// ZaraOS App — Alpha 0.5
//
// Route-based code splitting via React.lazy() + Suspense.
// Every page module is a separate chunk — the initial JS payload
// is now only the shell (providers, layout, routing) + the
// current route's page. Other pages load on first navigation.
//
// Vendor code is split into two stable long-cache chunks by
// vite.config.ts manualChunks:
//   vendor-react  — react, react-dom, wouter, react-query
//   vendor-ui     — radix-ui, lucide-react, framer-motion
// ============================================================

import { lazy, Suspense, useState } from "react";
import { FirstBootSetup } from "@/components/first-boot-setup";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivacyProvider } from "@/lib/privacy-store";
import { RuntimeProvider } from "@/core/runtime-context";
import { InputModeProvider } from "@/core/input-mode";
import { ErrorBoundary } from "@/components/error-boundary";

// ── Lazy page imports ─────────────────────────────────────
// Each import() becomes a separate Rollup chunk.
// Home is the landing page — kept separate so it loads first
// and the other 11 pages only load when navigated to.

const Home        = lazy(() => import("@/pages/home"));
const Assistant   = lazy(() => import("@/pages/assistant"));
const Console     = lazy(() => import("@/pages/console"));
const Apps        = lazy(() => import("@/pages/apps"));
const Files       = lazy(() => import("@/pages/files"));
const Media       = lazy(() => import("@/pages/media"));
const Settings    = lazy(() => import("@/pages/settings"));
const Privacy     = lazy(() => import("@/pages/privacy"));
const AIProviders = lazy(() => import("@/pages/ai-providers"));
const Developers  = lazy(() => import("@/pages/developers"));
const Skills      = lazy(() => import("@/pages/skills"));
const Memory      = lazy(() => import("@/pages/memory"));
const Install     = lazy(() => import("@/pages/install"));
const NotFound    = lazy(() => import("@/pages/not-found"));

// ── Page loading fallback ─────────────────────────────────
// Shown for the brief moment a chunk is fetched on first visit.
// Matches ZaraOS dark theme — no flash of white.

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center h-full w-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <span className="text-[11px] font-mono text-muted-foreground/40 tracking-widest">
          LOADING
        </span>
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/"            component={Home} />
        <Route path="/assistant"   component={Assistant} />
        <Route path="/console"     component={Console} />
        <Route path="/apps"        component={Apps} />
        <Route path="/files"       component={Files} />
        <Route path="/media"       component={Media} />
        <Route path="/settings"    component={Settings} />
        <Route path="/privacy"     component={Privacy} />
        <Route path="/ai-providers" component={AIProviders} />
        <Route path="/developers"  component={Developers} />
        <Route path="/skills"      component={Skills} />
        <Route path="/memory"      component={Memory} />
        <Route path="/install"     component={Install} />
        <Route                     component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function MainApp() {
  const [firstBootDone, setFirstBootDone] = useState(false);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RuntimeProvider>
          <InputModeProvider>
            <PrivacyProvider>
              <TooltipProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <ErrorBoundary>
                    <Router />
                  </ErrorBoundary>
                </WouterRouter>
                <Toaster />
                {/* First-boot wizard: only renders on native app, first launch */}
                {!firstBootDone && (
                  <FirstBootSetup onComplete={() => setFirstBootDone(true)} />
                )}
              </TooltipProvider>
            </PrivacyProvider>
          </InputModeProvider>
        </RuntimeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
