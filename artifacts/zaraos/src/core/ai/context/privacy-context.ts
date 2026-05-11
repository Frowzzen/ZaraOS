// ============================================================
// ZaraOS Privacy Context Injector
// Provides current privacy/permission state for AI prompts.
// ============================================================

export interface PrivacyContextSnapshot {
  microphoneActive: boolean;
  cameraActive: boolean;
  localAIEnabled: boolean;
  cloudAIEnabled: boolean;
  networkAllowed: boolean;
  filesAllowed: boolean;
  capturedAt: number;
}

export function capturePrivacyContext(
  overrides?: Partial<PrivacyContextSnapshot>
): PrivacyContextSnapshot {
  return {
    microphoneActive: false,
    cameraActive: false,
    localAIEnabled: true,
    cloudAIEnabled: false,
    networkAllowed: false,
    filesAllowed: false,
    capturedAt: Date.now(),
    ...overrides,
  };
}

export function formatPrivacyContext(ctx: PrivacyContextSnapshot): string {
  const lines: string[] = ["Privacy / Permissions:"];
  lines.push(`  Microphone: ${ctx.microphoneActive ? "ACTIVE" : "off"}`);
  lines.push(`  Camera: ${ctx.cameraActive ? "ACTIVE" : "off"}`);
  lines.push(`  Local AI: ${ctx.localAIEnabled ? "enabled" : "disabled"}`);
  lines.push(`  Cloud AI: ${ctx.cloudAIEnabled ? "ENABLED — user consented" : "blocked"}`);
  lines.push(`  Network: ${ctx.networkAllowed ? "allowed" : "blocked"}`);
  lines.push(`  File access: ${ctx.filesAllowed ? "allowed" : "blocked"}`);
  return lines.join("\n");
}
