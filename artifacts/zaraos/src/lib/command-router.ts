// ============================================================
// ZaraOS Command Router
//
// Parses natural language input from any source and returns a
// structured ParsedCommand. The Zara Runtime then decides what
// to do with it (permission checks, destructive guards, routing).
//
// Input sources: voice, gesture, keyboard, system, plugin.
// All sources produce the same ParsedCommand — the runtime is
// source-agnostic by design.
//
// Future: Replace keyword matching with a local intent classifier
// (small ONNX model or Ollama function-calling endpoint).
// ============================================================

import type { ParsedCommand, CommandIntent, InputSource } from "@/core/types";

// ── Keyword → Intent Map ──────────────────────────────────
interface IntentRule {
  keywords: string[];
  intent: CommandIntent;
  target?: string;
  requiresPermission?: boolean;
  destructive?: boolean;
  baseConfidence?: number;
}

const INTENT_RULES: IntentRule[] = [
  // open_app
  { keywords: ["open browser", "launch browser", "start browser", "web browser"], intent: "open_app", target: "/apps", baseConfidence: 0.97 },
  { keywords: ["show files", "open files", "file explorer", "browse files"], intent: "open_app", target: "/files", baseConfidence: 0.97 },
  { keywords: ["open documents", "my documents", "create new document", "new doc"], intent: "open_app", target: "/files", baseConfidence: 0.95 },
  { keywords: ["play video", "open video", "watch video"], intent: "media_action", target: "/media", baseConfidence: 0.96 },
  { keywords: ["listen to audio", "play audio", "play music", "open music"], intent: "media_action", target: "/media", baseConfidence: 0.96 },
  { keywords: ["open settings", "go to settings", "show settings", "system settings"], intent: "settings_action", target: "/settings", baseConfidence: 0.97 },
  { keywords: ["open developer", "developer portal", "dev portal", "developer mode"], intent: "developer_action", target: "/developers", requiresPermission: true, baseConfidence: 0.95 },
  { keywords: ["ai providers", "open ai providers", "manage ai", "ai manager"], intent: "settings_action", target: "/ai-providers", baseConfidence: 0.94 },
  { keywords: ["open privacy", "privacy panel", "privacy settings", "show privacy"], intent: "privacy_action", target: "/privacy", baseConfidence: 0.97 },
  { keywords: ["open apps", "app launcher", "show apps", "launch app"], intent: "open_app", target: "/apps", baseConfidence: 0.95 },
  { keywords: ["go home", "dashboard", "home screen", "main screen"], intent: "open_app", target: "/", baseConfidence: 0.97 },
  { keywords: ["open assistant", "zara assistant", "talk to zara", "ask zara"], intent: "open_app", target: "/assistant", baseConfidence: 0.97 },
  { keywords: ["open console", "zara console", "command console"], intent: "open_app", target: "/console", baseConfidence: 0.96 },

  // file_action
  { keywords: ["summarize this folder", "summarize folder", "analyze folder", "scan folder"], intent: "file_action", requiresPermission: true, baseConfidence: 0.92 },
  { keywords: ["delete file", "remove file"], intent: "file_action", requiresPermission: true, destructive: true, baseConfidence: 0.93 },

  // search
  { keywords: ["search the web", "search web", "web search", "search for"], intent: "search", target: "/apps", baseConfidence: 0.94 },
  { keywords: ["search files", "find file", "look for file"], intent: "search", requiresPermission: true, baseConfidence: 0.91 },

  // system_status
  { keywords: ["system status", "how is the system", "check status", "system health", "show stats"], intent: "system_status", target: "/", baseConfidence: 0.95 },
  { keywords: ["what is running", "active processes", "show processes"], intent: "system_status", baseConfidence: 0.90 },

  // privacy_action
  { keywords: ["enable microphone", "turn on mic", "enable mic", "activate mic"], intent: "privacy_action", target: "/privacy", requiresPermission: true, baseConfidence: 0.96 },
  { keywords: ["disable microphone", "turn off mic", "disable mic"], intent: "privacy_action", target: "/privacy", baseConfidence: 0.96 },
  { keywords: ["enable camera", "turn on camera", "activate camera"], intent: "privacy_action", target: "/privacy", requiresPermission: true, baseConfidence: 0.96 },
  { keywords: ["disable camera", "turn off camera"], intent: "privacy_action", target: "/privacy", baseConfidence: 0.96 },
  { keywords: ["enable cloud ai", "turn on cloud", "use cloud"], intent: "privacy_action", target: "/ai-providers", requiresPermission: true, baseConfidence: 0.94 },

  // media_action
  { keywords: ["pause", "stop playing", "stop media"], intent: "media_action", baseConfidence: 0.93 },
  { keywords: ["next track", "next song", "skip"], intent: "media_action", baseConfidence: 0.92 },

  // developer_action
  { keywords: ["enable developer mode", "dev mode on", "toggle developer"], intent: "developer_action", target: "/developers", requiresPermission: true, baseConfidence: 0.95 },
  { keywords: ["install plugin", "add plugin", "load plugin"], intent: "developer_action", requiresPermission: true, baseConfidence: 0.91 },
];

// ── Mocked Responses by Intent ────────────────────────────
// These are returned as the human-readable response from the runtime.
const INTENT_RESPONSES: Record<CommandIntent, (cmd: ParsedCommand) => string> = {
  open_app:        (c) => `Opening ${c.target?.replace("/", "") || "application"}...`,
  close_app:       (c) => `Closing ${c.target || "application"}.`,
  search:          (c) => `Initiating search: "${c.raw}"`,
  file_action:     () => `Analyzing folder contents...\nFound 12 files — 3 documents, 9 media files. Total: 1.2 GB.`,
  media_action:    (c) => `Media command received: ${c.raw}.`,
  ai_question:     (c) => `Routing to Zara AI: "${c.raw}"`,
  system_status:   () => `System nominal. CPU: 14% | RAM: 3.2/16 GB | Local AI: Active.`,
  privacy_action:  (c) => `Privacy command: ${c.raw}. Check the Privacy panel to confirm changes.`,
  settings_action: () => `Opening system settings.`,
  developer_action:() => `Developer mode activated. Access the Developer Portal for advanced tools.`,
  unknown:         (c) => `Command not recognized: "${c.raw}". Try "open settings" or "show files".`,
};

// ── Parser ────────────────────────────────────────────────
function classify(normalized: string): { rule: IntentRule | null; confidence: number } {
  let bestRule: IntentRule | null = null;
  let bestScore = 0;

  for (const rule of INTENT_RULES) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        const score = rule.baseConfidence ?? 0.88;
        if (score > bestScore) {
          bestScore = score;
          bestRule = rule;
        }
      }
    }
  }

  // Heuristic: if it ends with "?" or starts with question words, it's an AI question.
  if (!bestRule && (normalized.endsWith("?") || /^(what|who|how|why|when|where|is|can|does|will)/.test(normalized))) {
    return { rule: null, confidence: 0.85 };
  }

  return { rule: bestRule, confidence: bestScore };
}

// ── Public API ────────────────────────────────────────────
export function parseAndRoute(raw: string, source: InputSource = "keyboard"): ParsedCommand {
  const normalized = raw.trim().toLowerCase();
  const { rule, confidence } = classify(normalized);

  const isQuestion = !rule && confidence === 0.85;

  const intent: CommandIntent = isQuestion
    ? "ai_question"
    : rule
    ? rule.intent
    : "unknown";

  const cmd: ParsedCommand = {
    raw,
    normalized,
    intent,
    target: rule?.target,
    source,
    requiresPermission: rule?.requiresPermission ?? false,
    destructive: rule?.destructive ?? false,
    confidence: rule ? confidence : (isQuestion ? 0.85 : 0.1),
  };

  return cmd;
}

export function getResponseText(cmd: ParsedCommand): string {
  return INTENT_RESPONSES[cmd.intent](cmd);
}

// Legacy export for backward compat with existing console page usage.
export interface CommandResponse {
  output: string;
  action?: string;
  payload?: string;
}

export function routeCommand(input: string): CommandResponse {
  const cmd = parseAndRoute(input, "keyboard");
  return {
    output: getResponseText(cmd),
    action: cmd.target ? "navigate" : undefined,
    payload: cmd.target,
  };
}
