import { App } from "./App"; // Assuming you have a main App file
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivacyProvider } from "@/lib/privacy-store";

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
      <Route component={NotFound} />
    </Switch>
  );
}

export default function MainApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <PrivacyProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </PrivacyProvider>
    </QueryClientProvider>
  );
}
