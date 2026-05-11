// ============================================================
// ZaraOS Tool Calling Architecture — Types
//
// Future architecture for AI-driven tool execution.
// Tools are the bridge between AI responses and OS actions.
//
// CURRENT STATE (Alpha 0.3): Architecture only. No real
// tool execution. All tools return mocked results.
//
// FUTURE (Alpha 0.5+):
//   Real tool execution will be gated by:
//   1. User permission grants
//   2. Skill system confirmation rules
//   3. Sandboxed execution environment (Tauri)
// ============================================================

// ── Tool Categories ───────────────────────────────────────
export type ToolCategory =
  | "skill"           // Routes to a ZaraOS skill
  | "file"            // File system operations
  | "app"             // Application launching
  | "media"           // Media controls
  | "system"          // System settings
  | "developer"       // Developer / plugin tools
  | "communication";  // Email, SMS, calls

// ── Tool Parameter Schema ──────────────────────────────────
export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object";
  description: string;
  required: boolean;
  enum?: string[];          // Allowed values if constrained
  default?: unknown;
}

// ── Tool Definition ───────────────────────────────────────
// This is what gets registered in the tool registry and
// what gets serialized into AI provider tool-calling schemas.
export interface ZaraTool {
  id: string;
  name: string;
  description: string;         // Clear, AI-readable description of what the tool does
  category: ToolCategory;
  parameters: ToolParameter[];
  requiresPermission?: string; // PermissionCategory key
  requiresConfirmation: boolean;
  dangerous: boolean;
  enabled: boolean;
  skillId?: string;            // If category === "skill", maps to skill system
  version: string;
}

// ── Tool Call (from AI) ───────────────────────────────────
// When an AI provider supports tool calling, it returns this.
export interface ToolCall {
  toolId: string;
  callId: string;              // Unique per invocation for tracking
  arguments: Record<string, unknown>;
  timestamp: number;
}

// ── Tool Result ───────────────────────────────────────────
export interface ToolResult {
  callId: string;
  toolId: string;
  success: boolean;
  output: string;              // Plain text result for feeding back to AI
  data?: unknown;              // Structured data (optional)
  error?: string;
  requiresConfirmation?: boolean;
  timestamp: number;
  executionMs: number;
}

// ── Tool Execution Context ────────────────────────────────
export interface ToolExecutionContext {
  confirmedByUser: boolean;
  source: string;              // InputSource
  sessionId: string;
}
