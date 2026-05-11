// ============================================================
// ZaraOS Skill Type System
//
// Skills are the capability unit of ZaraOS — the equivalent of
// Alexa skills, iOS Shortcuts, or Android intents. Every action
// Zara can perform is declared as a skill with typed metadata.
//
// Skills are NOT executed directly by UI components.
// All skill execution flows through zaraRuntime.executeSkill().
//
// Design principles:
//   - Local-first: skills default to on-device execution
//   - Deny-by-default: no permission assumed at install
//   - Confirmation-gated: dangerous actions require approval
//   - Provider-optional: cloud integrations are opt-in
//   - Portable: no Replit dependencies, no hardcoded endpoints
// ============================================================

// ── Skill Categories ───────────────────────────────────────
export type SkillCategory =
  | "communication"    // Email, text, calls, contacts
  | "productivity"     // Timers, alarms, calendar, notes
  | "web_knowledge"    // Search, fact-check, summarize, translate
  | "files_documents"  // File management, document editing
  | "system_control"   // App launching, window mgmt, settings
  | "media"            // Audio, video, playback control
  | "developer";       // Build, test, package, plugin tools

// ── Skill Status ───────────────────────────────────────────
export type SkillStatus =
  | "built_in"     // Fully implemented and functional in Alpha 0.1
  | "mocked"       // Architecture declared, execution is simulated
  | "future";      // Planned — not yet built

// ── Skill Permissions ──────────────────────────────────────
// Maps to OS-level PermissionCategory where applicable.
export type SkillPermission =
  | "microphone"
  | "camera"
  | "files"
  | "network"
  | "local_ai"
  | "cloud_ai"
  | "system_actions"
  | "contacts"
  | "calendar"
  | "notifications"
  | "clipboard";

// ── Command Examples ───────────────────────────────────────
export interface SkillCommandExample {
  text: string;
  type: "voice" | "text" | "gesture";
}

// ── Confirmation Rule ──────────────────────────────────────
export interface SkillConfirmationRule {
  required: boolean;
  reason?: string;
  // future: timeout, one-time vs always, biometric option
}

// ── Core Skill Interface ───────────────────────────────────
export interface ZaraSkill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  status: SkillStatus;

  // Hardware and service permissions required
  permissions: SkillPermission[];

  // Input examples (displayed in Skills Hub and used by command router)
  voiceCommands: string[];
  textCommands: string[];
  gestureCommands: string[];

  // Confirmation gate
  requiresConfirmation: boolean;
  confirmationReason?: string;

  // Privacy posture
  localFirst: boolean;       // True if can run without internet
  cloudOptional: boolean;    // True if cloud enhances but isn't required
  providerRequired?: string; // e.g. "google", "openai" — if cloud is mandatory

  // Safety flags
  dangerous: boolean;        // Destructive, irreversible, or sensitive actions

  // Runtime state
  enabled: boolean;          // User can disable individual skills
}

// ── Skill Execution Input ──────────────────────────────────
export interface SkillExecutionInput {
  skillId: string;
  rawInput: string;
  source: "voice" | "gesture" | "keyboard" | "system" | "plugin";
  confirmedByUser?: boolean;
}

// ── Skill Execution Result ─────────────────────────────────
export interface SkillExecutionResult {
  success: boolean;
  skillId: string;
  response: string;
  action?: "noop" | "navigate" | "confirm_required" | "permission_denied" | "disabled";
  payload?: string;
  dangerous: boolean;
  timestamp: number;
}

// ── Category Metadata (for UI) ─────────────────────────────
export interface SkillCategoryMeta {
  id: SkillCategory;
  label: string;
  description: string;
  color: string;
  borderColor: string;
  bgColor: string;
}

export const SKILL_CATEGORY_META: Record<SkillCategory, SkillCategoryMeta> = {
  communication: {
    id: "communication",
    label: "Communication",
    description: "Email, text messages, calls, and contacts",
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/10",
  },
  productivity: {
    id: "productivity",
    label: "Productivity",
    description: "Timers, alarms, calendar, reminders, notes",
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/10",
  },
  web_knowledge: {
    id: "web_knowledge",
    label: "Web & Knowledge",
    description: "Search, fact-check, research, translate, define",
    color: "text-cyan-400",
    borderColor: "border-cyan-500/30",
    bgColor: "bg-cyan-500/10",
  },
  files_documents: {
    id: "files_documents",
    label: "Files & Documents",
    description: "File management, document editing and summarization",
    color: "text-green-400",
    borderColor: "border-green-500/30",
    bgColor: "bg-green-500/10",
  },
  system_control: {
    id: "system_control",
    label: "System Control",
    description: "App launching, window management, settings, privacy",
    color: "text-slate-400",
    borderColor: "border-slate-500/30",
    bgColor: "bg-slate-500/10",
  },
  media: {
    id: "media",
    label: "Media",
    description: "Audio playback, video, volume, track control",
    color: "text-purple-400",
    borderColor: "border-purple-500/30",
    bgColor: "bg-purple-500/10",
  },
  developer: {
    id: "developer",
    label: "Developer",
    description: "Build apps, create plugins, run tests, package",
    color: "text-pink-400",
    borderColor: "border-pink-500/30",
    bgColor: "bg-pink-500/10",
  },
};

export const SKILL_STATUS_META: Record<SkillStatus, { label: string; color: string; bg: string; border: string }> = {
  built_in: {
    label: "Built-in",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/25",
  },
  mocked: {
    label: "Mocked",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
  },
  future: {
    label: "Coming Soon",
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/25",
  },
};
