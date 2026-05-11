// ============================================================
// ZaraOS System Context Injector
// Provides current OS state for AI prompt injection.
// ============================================================

export interface SystemContextSnapshot {
  activePanel: string;
  inputMode: string;
  zaraStatus: string;
  uptime: string;
  cpuUsage: number;
  ramUsed: number;
  ramTotal: number;
  capturedAt: number;
}

export function captureSystemContext(overrides?: Partial<SystemContextSnapshot>): SystemContextSnapshot {
  return {
    activePanel: "/assistant",
    inputMode: "hybrid",
    zaraStatus: "idle",
    uptime: "0h 0m",
    cpuUsage: 14,
    ramUsed: 3.2,
    ramTotal: 16,
    capturedAt: Date.now(),
    ...overrides,
  };
}

export function formatSystemContext(ctx: SystemContextSnapshot): string {
  return [
    `Active Panel: ${ctx.activePanel}`,
    `Input Mode: ${ctx.inputMode}`,
    `Zara Status: ${ctx.zaraStatus}`,
    `CPU: ${ctx.cpuUsage}%  RAM: ${ctx.ramUsed}/${ctx.ramTotal} GB`,
    `Uptime: ${ctx.uptime}`,
  ].join("\n");
}
