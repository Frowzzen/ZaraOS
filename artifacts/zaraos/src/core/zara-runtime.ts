// ============================================================
// Zara Runtime — Central Brain of ZaraOS
//
// All commands from every input source (voice, gesture, keyboard,
// system, plugin) flow through this runtime. The UI never calls
// individual engines directly — it calls the runtime.
//
// Layer responsibilities:
//   UI Layer     → calls runtime.executeCommand() or runtime.sendAssistantMessage()
//   Runtime      → checks permissions, routes to correct engine, returns result
//   AI Layer     → runtime.sendAssistantMessage() / streamAssistantMessage() → aiRuntime
//   Input Layer  → voice/gesture engines call runtime.handleInput()
//   System Layer → runtime.launchApp() dispatches here (mocked in Alpha 0.2)
//   Plugin Layer → runtime.registerPlugin() / runtime.executeCommand from plugin
//   Skill Layer  → runtime.executeSkill() → skillRuntime.executeSkill()
//   Security     → runtime enforces permissions before every action
//
// Alpha 0.3 change: All AI calls now route through aiRuntime instead of aiEngine.
// The old aiEngine (lib/ai-engine.ts) is retained for legacy compatibility only.
//
// Future Tauri integration:
//   Replace the mocked systemDispatch() calls with Tauri invoke() calls.
//   The runtime interface will stay identical — only the implementation changes.
// ============================================================

import { parseAndRoute } from "@/lib/command-router";
import { permissionsManager } from "./permissions";
import { skillRuntime } from "./skills/skill-runtime";
import { aiRuntime } from "./ai/ai-runtime";
import type { AIStreamCallback } from "./ai/providers/provider-adapter";
import type {
  InputSource,
  CommandResult,
  ParsedCommand,
  ZaraStatus,
  SystemStatus,
  AIProvider,
  PluginManifest,
  PermissionCategory,
} from "./types";
import type { ZaraSkill, SkillExecutionResult } from "./skills/types";

// ── Runtime Event Listeners ───────────────────────────────
type StatusListener = (status: ZaraStatus) => void;
type CommandListener = (result: CommandResult) => void;

class ZaraRuntime {
  private zaraStatus: ZaraStatus = "idle";
  private plugins: Map<string, PluginManifest> = new Map();
  private statusListeners: Set<StatusListener> = new Set();
  private commandListeners: Set<CommandListener> = new Set();
  private commandHistory: CommandResult[] = [];

  // ── Lifecycle ─────────────────────────────────────────
  public initialize(): void {
    this.setZaraStatus("idle");
    // Initialize AI Runtime (starts or resumes conversation session)
    aiRuntime.initialize().catch(() => {
      // Graceful degradation — AI Runtime failure is non-fatal
    });
  }

  // ── Status Management ─────────────────────────────────
  private setZaraStatus(status: ZaraStatus): void {
    this.zaraStatus = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  public getZaraStatus(): ZaraStatus {
    return this.zaraStatus;
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  public onCommand(listener: CommandListener): () => void {
    this.commandListeners.add(listener);
    return () => this.commandListeners.delete(listener);
  }

  // ── Main Command Entry Point ───────────────────────────
  // All input sources call this. The runtime checks permissions,
  // routes the command, and returns a structured result.
  public async executeCommand(
    input: string,
    source: InputSource = "keyboard"
  ): Promise<CommandResult> {
    const parsed: ParsedCommand = parseAndRoute(input, source);

    // Skill action — delegate to skill runtime
    if (parsed.intent === "skill_action" && parsed.skillId) {
      return this.executeSkill(parsed.skillId, input, source);
    }

    // Permission gate
    if (parsed.requiresPermission) {
      const category = this.intentToPermission(parsed.intent);
      if (category && !permissionsManager.isGranted(category)) {
        const result: CommandResult = {
          success: false,
          intent: parsed.intent,
          response: `Permission denied: ${category} is not enabled. Enable it in Privacy settings.`,
          action: "permission_denied",
          source,
          timestamp: Date.now(),
        };
        this.emit(result);
        return result;
      }
    }

    // Destructive action gate
    if (parsed.destructive) {
      const result: CommandResult = {
        success: false,
        intent: parsed.intent,
        response: `This action requires confirmation. Destructive commands must be approved before execution.`,
        action: "confirm_required",
        requiresConfirmation: true,
        dangerous: true,
        source,
        timestamp: Date.now(),
      };
      this.emit(result);
      return result;
    }

    // Route to AI for questions
    if (parsed.intent === "ai_question") {
      return this.sendAssistantMessage(parsed.raw, source);
    }

    // All other commands — return the routed result
    const result: CommandResult = {
      success: true,
      intent: parsed.intent,
      response: parsed.normalized,
      action: "navigate",
      payload: parsed.target,
      source,
      timestamp: Date.now(),
    };

    this.emit(result);
    return result;
  }

  // ── Assistant Message (non-streaming) ─────────────────
  // Routes through the AI Runtime for context-aware responses.
  public async sendAssistantMessage(
    message: string,
    source: InputSource = "keyboard"
  ): Promise<CommandResult> {
    this.setZaraStatus("thinking");

    try {
      const aiResult = await aiRuntime.sendMessage(message, source);
      this.setZaraStatus("speaking");
      setTimeout(() => this.setZaraStatus("idle"), 2000);

      const result: CommandResult = {
        success: true,
        intent: "ai_question",
        response: aiResult.response,
        action: "noop",
        source,
        timestamp: Date.now(),
      };
      this.emit(result);
      return result;
    } catch {
      this.setZaraStatus("offline");
      const result: CommandResult = {
        success: false,
        intent: "ai_question",
        response: "AI runtime is unavailable. Ensure a local AI provider is running.",
        action: "noop",
        source,
        timestamp: Date.now(),
      };
      this.emit(result);
      return result;
    }
  }

  // ── Streaming Assistant Message ────────────────────────
  // Routes through the AI Runtime with streaming support.
  // Alpha 0.3: simulated streaming (real streaming in Alpha 0.4+ via Ollama).
  public async streamAssistantMessage(
    message: string,
    onChunk: AIStreamCallback,
    source: InputSource = "keyboard"
  ): Promise<CommandResult> {
    this.setZaraStatus("thinking");

    try {
      const aiResult = await aiRuntime.streamMessage(message, onChunk, source);
      this.setZaraStatus("speaking");
      setTimeout(() => this.setZaraStatus("idle"), 800);

      const result: CommandResult = {
        success: true,
        intent: "ai_question",
        response: aiResult.response,
        action: "noop",
        source,
        timestamp: Date.now(),
      };
      this.emit(result);
      return result;
    } catch {
      this.setZaraStatus("offline");
      const result: CommandResult = {
        success: false,
        intent: "ai_question",
        response: "AI runtime is unavailable. Ensure a local AI provider is running.",
        action: "noop",
        source,
        timestamp: Date.now(),
      };
      this.emit(result);
      return result;
    }
  }

  // ── Permission Request ─────────────────────────────────
  public requestPermission(category: PermissionCategory): boolean {
    // In Alpha 0.2, we grant immediately when the user requests.
    // Future: Show a native OS permission prompt (Tauri dialog or browser API).
    permissionsManager.grant(category);
    return true;
  }

  public revokePermission(category: PermissionCategory): void {
    permissionsManager.revoke(category);

    // Side effects — shut down engines that depend on the revoked permission.
    if (category === "microphone") {
      this.setZaraStatus("idle");
    }
    if (category === "camera") {
      // Future: gestureEngine.stopTracking()
    }
  }

  // ── System Status ──────────────────────────────────────
  public getSystemStatus(): SystemStatus {
    // Mocked for Alpha 0.2.
    // Future: Replace with Tauri system-info plugin calls.
    return {
      cpuUsage: Math.floor(Math.random() * 30) + 5,
      ramUsed: 3.2,
      ramTotal: 16,
      networkIO: "1.2 MB/s",
      neuralCores: permissionsManager.isGranted("local_ai") ? "active" : "idle",
      uptime: "2h 14m",
      zaraStatus: this.zaraStatus,
    };
  }

  // ── AI Provider Selection ──────────────────────────────
  public selectAIProvider(provider: AIProvider): void {
    // Cloud AI requires explicit permission.
    if (provider !== "local" && provider !== "ollama" && provider !== "llamacpp") {
      if (!permissionsManager.isGranted("cloud_ai")) {
        return;
      }
    }
    // Alpha 0.3: Provider selection is managed by the AI Runtime's routing layer.
    // The providerRouter automatically picks the best available provider.
    // Direct selection will be exposed in Alpha 0.4 when Ollama is wired.
  }

  // ── AI Conversation Management ─────────────────────────
  public clearAIConversation(): void {
    aiRuntime.clearConversation();
  }

  public getAIMemoryStats() {
    return aiRuntime.getMemoryStats();
  }

  public getAIRuntimeStatus() {
    return aiRuntime.getStatus();
  }

  public onAIStatusChange(listener: Parameters<typeof aiRuntime.onStatusChange>[0]): () => void {
    return aiRuntime.onStatusChange(listener);
  }

  // ── App Launching ──────────────────────────────────────
  public launchApp(appId: string): CommandResult {
    // Mocked for Alpha 0.2.
    // Future: Replace with Tauri spawn() call or Linux exec with allowlist check.
    const appRoutes: Record<string, string> = {
      browser: "/apps",
      files: "/files",
      documents: "/files",
      video: "/media",
      audio: "/media",
      settings: "/settings",
      developers: "/developers",
      "ai-providers": "/ai-providers",
      skills: "/skills",
    };

    const route = appRoutes[appId];
    if (route) {
      return {
        success: true,
        intent: "open_app",
        response: `Launching ${appId}...`,
        action: "navigate",
        payload: route,
        source: "system",
        timestamp: Date.now(),
      };
    }

    return {
      success: false,
      intent: "open_app",
      response: `Unknown app: ${appId}`,
      action: "noop",
      source: "system",
      timestamp: Date.now(),
    };
  }

  // ── Plugin Registry ────────────────────────────────────
  public registerPlugin(manifest: PluginManifest): boolean {
    if (!permissionsManager.isGranted("plugins")) {
      return false;
    }

    // Validate plugin permissions — all declared permissions must be granted.
    if (!permissionsManager.pluginPermissionsGranted(manifest.permissions)) {
      return false;
    }

    this.plugins.set(manifest.id, { ...manifest, installedAt: Date.now() });
    return true;
  }

  public getPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values());
  }

  // ── Skill Layer ────────────────────────────────────────
  // All skill operations flow through here — never called directly from UI.

  public listSkills(): ZaraSkill[] {
    return skillRuntime.listSkills();
  }

  public getSkill(skillId: string): ZaraSkill | undefined {
    return skillRuntime.getSkill(skillId);
  }

  public async executeSkill(
    skillId: string,
    input: string,
    source: InputSource = "keyboard",
    confirmedByUser = false
  ): Promise<CommandResult> {
    const skill = skillRuntime.getSkill(skillId);

    if (!skill) {
      const result: CommandResult = {
        success: false,
        intent: "skill_action",
        response: `Unknown skill: ${skillId}`,
        action: "noop",
        skillId,
        source,
        timestamp: Date.now(),
      };
      this.emit(result);
      return result;
    }

    const execResult: SkillExecutionResult = await skillRuntime.executeSkill({
      skillId,
      rawInput: input,
      source,
      confirmedByUser,
    });

    const result: CommandResult = {
      success: execResult.success,
      intent: "skill_action",
      response: execResult.response,
      action: execResult.action as CommandResult["action"],
      payload: execResult.payload,
      skillId,
      requiresConfirmation: execResult.action === "confirm_required",
      dangerous: execResult.dangerous,
      confirmationReason: skill.confirmationReason,
      source,
      timestamp: execResult.timestamp,
    };

    this.emit(result);
    return result;
  }

  public checkSkillPermissions(skillId: string): { granted: boolean; missing: string[] } {
    return skillRuntime.checkSkillPermissions(skillId);
  }

  public requestSkillConfirmation(skillId: string): { required: boolean; reason?: string } {
    const skill = skillRuntime.getSkill(skillId);
    if (!skill) return { required: false };
    return {
      required: skill.requiresConfirmation || skill.dangerous,
      reason: skill.confirmationReason,
    };
  }

  public enableSkill(skillId: string): boolean {
    return skillRuntime.enableSkill(skillId);
  }

  public disableSkill(skillId: string): boolean {
    return skillRuntime.disableSkill(skillId);
  }

  // ── Command History ────────────────────────────────────
  public getHistory(limit = 50): CommandResult[] {
    return this.commandHistory.slice(-limit);
  }

  // ── Internal Helpers ───────────────────────────────────
  private emit(result: CommandResult): void {
    this.commandHistory.push(result);
    this.commandListeners.forEach((fn) => fn(result));
  }

  private intentToPermission(intent: string): PermissionCategory | null {
    const map: Partial<Record<string, PermissionCategory>> = {
      file_action: "files",
      privacy_action: "system_actions",
      developer_action: "developer_mode",
    };
    return map[intent] ?? null;
  }
}

// Singleton runtime — one instance for the entire OS session.
export const zaraRuntime = new ZaraRuntime();
