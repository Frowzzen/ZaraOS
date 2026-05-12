// ============================================================
// useRuntime hook
//
// Lives in its own module so Vite Fast Refresh can correctly
// distinguish it from the RuntimeProvider component in
// runtime-context.tsx. Mixing a component export and a hook
// export in one file breaks Fast Refresh and causes full-page
// reloads on every save.
// ============================================================

import { useContext } from "react";
import { RuntimeContext } from "./runtime-context";
import type { RuntimeContextType } from "./runtime-context";

export function useRuntime(): RuntimeContextType {
  const ctx = useContext(RuntimeContext);
  if (!ctx) {
    throw new Error("useRuntime must be used within a RuntimeProvider");
  }
  return ctx;
}
