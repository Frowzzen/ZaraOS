// ============================================================
// ZaraOS AI Runtime — Central Intelligence Orchestrator
//
// This is the single entry point for all AI operations.
// It sits between the Zara Runtime (OS brain) and the
// provider/routing/memory/context layers.
//
// Flow:
//   Zara Runtime
//     → aiRuntime.sendMessage() | aiRuntime.streamMessage()
//       → Build system prompt + context block
//       → Retrieve conversation history from memory
//       → requestRouter.dispatch() → provider adapter
//       → Store response in memory
//       → Broadcast status to listeners
//
// UI NEVER calls this directly. Always: UI → zaraRuntime → aiRuntime.
// ============================================================

import { conversationMemory } from "./memory/conversation-memory";
import { requestRouter } from "./routing/request-router";
import { initializeProviders } from "./providers/provider-registry";
import { buildSystemPrompt } from "./prompts/zara-system-prompt";
import { buildContextBlock } from "./context/context-injector";
import type { InjectionInput } from "./context/context-injector";
import type { AIStreamCallback } from "./providers/provider-adapter";
import type { SystemContextSnapshot } from "./context/system-context";
import type { PrivacyContextSnapshot } from "./context/privacy-context";
import type { SkillContextEntry } from "./context/skills-context";
import type { MemoryStats } from "./memory/memory-types";
import type { InputSource } from "../types";

// ── Status Types ─────────────────────────────────────────

export interface AIRuntimeStatus {
  phase: "idle" | "thinking" | "streaming" | "done" | "error";
  providerId: string;
  providerName: string;
  modelId: string;
  isSimulated: boolean;
  isCloud: boolean;
  latencyMs?: number;
  memoryTokens?: number;
  conversationTurns?: number;
}

export interface AIRuntimeResult {
  response: string;
  providerId: string;
  providerName: string;
  modelId: string;
  isSimulated: boolean;
  isCloud: boolean;
  latencyMs: number;
  streamed: boolean;
}

// ── AI Runtime Class ──────────────────────────────────────

class AIRuntime {
  private initialized = false;
  private statusListeners: Set<(status: AIRuntimeStatus) => void> = new Set();

  // Current status snapshot
  private currentStatus: AIRuntimeStatus = {
    phase: "idle",
    providerId: "local",
    providerName: "Zara Local Runtime",
    modelId: "zara-v0.3",
    isSimulated: true,
    isCloud: false,
    memoryTokens: 0,
    conversationTurns: 0,
  };

  // Context overrides injected by the OS layer
  private systemOverrides: Partial<SystemContextSnapshot> = {};
  private privacyOverrides: Partial<PrivacyContextSnapshot> = {};
  private skillsList: SkillContextEntry[] = [];
  private recentSkillsList: string[] = [];

  // ── Lifecycle ────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized) return;
    // Register all AI providers with the router and restore user preferences.
    // This must happen before any routing call is made.
    initializeProviders();
    conversationMemory.resumeOrStartSession();
    this.initialized = true;
    this.updateMemoryStats();
    this.broadcastStatus({ phase: "idle" });
  }

  // ── Core: Send Message (non-streaming) ───────────────────

  async sendMessage(
    message: string,
    source: InputSource = "keyboard",
    intent?: string
  ): Promise<AIRuntimeResult> {
    if (!this.initialized) await this.initialize();

    this.broadcastStatus({ phase: "thinking" });

    const { systemPrompt, messages } = this.buildRequestPayload(message, intent);

    // Record user message in memory
    conversationMemory.addMessage({
      role: "user",
      content: message,
      source,
      intent,
      timestamp: Date.now(),
    });

    try {
      const result = await requestRouter.dispatch({
        messages,
        systemPrompt,
        stream: false,
      });

      // Record assistant response in memory
      conversationMemory.addMessage({
        role: "assistant",
        content: result.response,
        source: "system",
        provider: result.providerId,
        model: result.modelId,
        latencyMs: result.latencyMs,
        streamed: false,
        timestamp: Date.now(),
      });

      this.updateMemoryStats();
      this.broadcastStatus({
        phase: "done",
        providerId: result.providerId,
        providerName: result.providerName,
        modelId: result.modelId,
        isSimulated: result.isSimulated,
        isCloud: result.isCloud,
        latencyMs: result.latencyMs,
      });

      return { ...result, streamed: false };
    } catch (err) {
      this.broadcastStatus({ phase: "error" });
      throw err;
    }
  }

  // ── Core: Stream Message ─────────────────────────────────

  async streamMessage(
    message: string,
    onChunk: AIStreamCallback,
    source: InputSource = "keyboard",
    intent?: string
  ): Promise<AIRuntimeResult> {
    if (!this.initialized) await this.initialize();

    this.broadcastStatus({ phase: "thinking" });

    const { systemPrompt, messages } = this.buildRequestPayload(message, intent);

    // Record user message in memory
    conversationMemory.addMessage({
      role: "user",
      content: message,
      source,
      intent,
      timestamp: Date.now(),
    });

    // Signal streaming start
    this.broadcastStatus({ phase: "streaming" });

    try {
      const result = await requestRouter.dispatch({
        messages,
        systemPrompt,
        stream: true,
        onChunk,
      });

      // Record assistant response in memory
      conversationMemory.addMessage({
        role: "assistant",
        content: result.response,
        source: "system",
        provider: result.providerId,
        model: result.modelId,
        latencyMs: result.latencyMs,
        streamed: true,
        timestamp: Date.now(),
      });

      this.updateMemoryStats();
      this.broadcastStatus({
        phase: "done",
        providerId: result.providerId,
        providerName: result.providerName,
        modelId: result.modelId,
        isSimulated: result.isSimulated,
        isCloud: result.isCloud,
        latencyMs: result.latencyMs,
      });

      return { ...result, streamed: true };
    } catch (err) {
      this.broadcastStatus({ phase: "error" });
      throw err;
    }
  }

  // ── Context Injection ────────────────────────────────────
  // Called by Zara Runtime to keep AI context in sync with OS state.

  injectSystemState(overrides: Partial<SystemContextSnapshot>): void {
    this.systemOverrides = { ...this.systemOverrides, ...overrides };
  }

  injectPrivacyState(overrides: Partial<PrivacyContextSnapshot>): void {
    this.privacyOverrides = { ...this.privacyOverrides, ...overrides };
  }

  injectSkills(skills: SkillContextEntry[], recentSkills: string[] = []): void {
    this.skillsList = skills;
    this.recentSkillsList = recentSkills;
  }

  // ── Status ───────────────────────────────────────────────

  getStatus(): AIRuntimeStatus {
    return { ...this.currentStatus };
  }

  onStatusChange(listener: (status: AIRuntimeStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  // ── Memory ───────────────────────────────────────────────

  getMemoryStats(): MemoryStats {
    return conversationMemory.getStats();
  }

  clearConversation(): void {
    conversationMemory.clearCurrentSession();
    this.updateMemoryStats();
    this.broadcastStatus({ phase: "idle" });
  }

  isSimulated(): boolean {
    return this.currentStatus.isSimulated;
  }

  getActiveProviderId(): string {
    return this.currentStatus.providerId;
  }

  getActiveProviderName(): string {
    return this.currentStatus.providerName;
  }

  getActiveModel(): string {
    return this.currentStatus.modelId;
  }

  // ── Internal ─────────────────────────────────────────────

  private buildRequestPayload(
    message: string,
    intent?: string
  ): { systemPrompt: string; messages: Array<{ role: "user" | "assistant" | "system"; content: string }> } {
    const baseSystemPrompt = buildSystemPrompt();

    const injectionInput: InjectionInput = {
      system: this.systemOverrides,
      privacy: this.privacyOverrides,
      skills: this.skillsList.length > 0 ? this.skillsList : undefined,
      recentSkills: this.recentSkillsList,
      simulatedMode: this.currentStatus.isSimulated,
      provider: this.currentStatus.providerName,
      model: this.currentStatus.modelId,
    };

    const contextBlock = buildContextBlock(injectionInput);
    const systemPrompt = baseSystemPrompt + "\n\n" + contextBlock;

    // Retrieve pruned conversation history from memory
    const history = conversationMemory.getMessagesForContext(3000);
    const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
      ...history.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    return { systemPrompt, messages };
  }

  private broadcastStatus(partial: Partial<AIRuntimeStatus>): void {
    this.currentStatus = { ...this.currentStatus, ...partial };
    this.statusListeners.forEach((fn) => fn(this.currentStatus));
  }

  private updateMemoryStats(): void {
    const stats = conversationMemory.getStats();
    this.currentStatus = {
      ...this.currentStatus,
      memoryTokens: stats.estimatedTokens,
      conversationTurns: stats.conversationTurns,
    };
  }
}

// Singleton — one instance for the entire OS session.
export const aiRuntime = new AIRuntime();
