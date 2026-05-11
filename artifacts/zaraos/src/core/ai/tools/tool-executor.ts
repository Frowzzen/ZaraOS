// ============================================================
// ZaraOS Tool Executor
//
// Executes tool calls returned by AI providers.
// All execution is MOCKED in Alpha 0.3.
//
// FUTURE (Alpha 0.5+):
//   Real execution dispatches to:
//   - Skill Runtime (for skill tools)
//   - Tauri invoke() (for file/system tools)
//   - Permission-gated OS APIs
// ============================================================

import type { ToolCall, ToolResult, ToolExecutionContext } from "./tool-types";
import { toolRegistry } from "./tool-registry";

export class ToolExecutor {
  async execute(
    call: ToolCall,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const start = Date.now();
    const tool = toolRegistry.get(call.toolId);

    if (!tool) {
      return {
        callId: call.callId,
        toolId: call.toolId,
        success: false,
        output: `Unknown tool: ${call.toolId}`,
        error: "Tool not found in registry",
        timestamp: Date.now(),
        executionMs: Date.now() - start,
      };
    }

    if (!tool.enabled) {
      return {
        callId: call.callId,
        toolId: call.toolId,
        success: false,
        output: `Tool ${tool.name} is currently disabled.`,
        timestamp: Date.now(),
        executionMs: Date.now() - start,
      };
    }

    // Confirmation gate.
    if (tool.requiresConfirmation && !context.confirmedByUser) {
      return {
        callId: call.callId,
        toolId: call.toolId,
        success: false,
        output: `${tool.name} requires confirmation before executing.`,
        requiresConfirmation: true,
        timestamp: Date.now(),
        executionMs: Date.now() - start,
      };
    }

    // Alpha 0.3: All tools return mocked results.
    // No real filesystem access, no real network calls,
    // no real system modifications.
    const mockedOutput = this.getMockedOutput(call.toolId, call.arguments);

    return {
      callId: call.callId,
      toolId: call.toolId,
      success: true,
      output: mockedOutput,
      timestamp: Date.now(),
      executionMs: Date.now() - start,
    };
  }

  private getMockedOutput(toolId: string, args: Record<string, unknown>): string {
    const mocks: Record<string, (args: Record<string, unknown>) => string> = {
      "zara.open_app": (a) => `Navigating to ${String(a.target ?? "requested panel")}.`,
      "zara.set_timer": (a) => `Timer set for ${String(a.duration ?? "requested duration")}. All local — no network used.`,
      "zara.search_web": (a) => `Search initiated for "${String(a.query ?? "")}". Results will appear when network permission is granted.`,
      "zara.send_email": (a) => `Email to ${String(a.to ?? "recipient")} queued. Awaiting confirmation.`,
      "zara.delete_files": (a) => `Delete request for "${String(a.paths ?? "specified path")}" is staged. Confirmation required before execution.`,
      "zara.change_settings": (a) => `Setting "${String(a.setting ?? "")}" updated to "${String(a.value ?? "")}".`,
    };

    const handler = mocks[toolId];
    if (handler) return handler(args);
    return `Tool ${toolId} executed successfully (simulated).`;
  }
}

export const toolExecutor = new ToolExecutor();
