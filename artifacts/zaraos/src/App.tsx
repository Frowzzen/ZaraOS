import { useState } from "react";
import { FirstBootSetup } from "@/components/first-boot-setup";
import { Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivacyProvider } from "@/lib/privacy-store";
import { RuntimeProvider } from "@/core/runtime-context";
import { InputModeProvider } from "@/core/input-mode";
import { ErrorBoundary } from "@/components/error-boundary";
import { DesktopShell } from "@/components/desktop-shell";

const queryClient = new QueryClient();

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
                    <DesktopShell />
                  </ErrorBoundary>
                </WouterRouter>
                <Toaster />
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
