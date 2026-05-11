import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivacyProvider } from "@/lib/privacy-store";
import { RuntimeProvider } from "@/core/runtime-context";
import { InputModeProvider } from "@/core/input-mode";
import { ErrorBoundary } from "@/components/error-boundary";

import Home from "@/pages/home";
import Assistant from "@/pages/assistant";
import Console from "@/pages/console";
import Apps from "@/pages/apps";
import Files from "@/pages/files";
import Media from "@/pages/media";
import Settings from "@/pages/settings";
import Privacy from "@/pages/privacy";
import AIProviders from "@/pages/ai-providers";
import Developers from "@/pages/developers";
import Skills from "@/pages/skills";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/assistant" component={Assistant} />
      <Route path="/console" component={Console} />
      <Route path="/apps" component={Apps} />
      <Route path="/files" component={Files} />
      <Route path="/media" component={Media} />
      <Route path="/settings" component={Settings} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/ai-providers" component={AIProviders} />
      <Route path="/developers" component={Developers} />
      <Route path="/skills" component={Skills} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function MainApp() {
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
              </TooltipProvider>
            </PrivacyProvider>
          </InputModeProvider>
        </RuntimeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
