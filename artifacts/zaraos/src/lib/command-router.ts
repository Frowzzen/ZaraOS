// ============================================================
// ZaraOS Command Router
//
// Parses natural language input from any source and returns a
// structured ParsedCommand. The Zara Runtime then decides what
// to do with it (permission checks, destructive guards, routing).
//
// Pass 1 — keyword rules: fixed high-confidence patterns for
//   ZaraOS panels, system controls, skills, gestures.
//
// Pass 2 — pattern extraction: regex-based detection for open/
//   close/focus/minimize [app name] and folder navigation.
//   Only activates when Pass 1 produces no confident match.
//
// Future: Replace keyword matching with a local intent classifier
// (small ONNX model or Ollama function-calling endpoint).
// ============================================================

import type { ParsedCommand, CommandIntent, InputSource } from "@/core/types";
import { PANEL_ORDER } from "./gesture-mapper";

// ── Keyword → Intent Map ──────────────────────────────────
interface IntentRule {
  keywords: string[];
  intent: CommandIntent;
  target?: string;
  skillId?: string;
  requiresPermission?: boolean;
  requiresConfirmation?: boolean;
  destructive?: boolean;
  baseConfidence?: number;
}

const INTENT_RULES: IntentRule[] = [
  // ── Navigation (gesture SWIPE_LEFT / SWIPE_RIGHT) ──────
  ...PANEL_ORDER.map((path) => ({
    keywords: [`navigate to ${path}`],
    intent: "navigation_action" as CommandIntent,
    target: path,
    requiresPermission: false,
    destructive: false,
    baseConfidence: 0.99,
  })),
  { keywords: ["go home", "close active window", "dismiss", "go to dashboard", "show dashboard", "home screen", "main screen"], intent: "navigation_action", target: "/", baseConfidence: 0.98 },

  // ── Scroll ──────────────────────────────────────────────
  { keywords: ["scroll down", "scroll up", "enable precision scroll", "precision scroll"], intent: "scroll_action", baseConfidence: 0.98 },

  // ── ZaraOS panel navigation (exact panel names win over generic "open X") ──
  { keywords: ["open browser", "launch browser", "start browser", "zara browser", "web browser"], intent: "open_app", target: "/browser", baseConfidence: 0.97 },
  { keywords: ["show files", "open files", "file explorer", "browse files", "open file manager"], intent: "open_app", target: "/files", baseConfidence: 0.97 },
  { keywords: ["open documents", "my documents", "create new document", "new doc"], intent: "open_app", target: "/files", baseConfidence: 0.95 },
  { keywords: ["play video", "open video", "watch video"], intent: "media_action", target: "/media", baseConfidence: 0.96 },
  { keywords: ["listen to audio", "play audio", "play music", "open music"], intent: "media_action", target: "/media", baseConfidence: 0.96 },
  { keywords: ["open settings", "go to settings", "show settings", "system settings"], intent: "settings_action", target: "/settings", baseConfidence: 0.97 },
  { keywords: ["open developer", "developer portal", "dev portal", "developer mode"], intent: "developer_action", target: "/developers", requiresPermission: true, baseConfidence: 0.95 },
  { keywords: ["ai providers", "open ai providers", "manage ai", "ai manager"], intent: "settings_action", target: "/ai-providers", baseConfidence: 0.94 },
  { keywords: ["open privacy", "privacy panel", "privacy settings", "show privacy", "privacy status"], intent: "privacy_action", target: "/privacy", baseConfidence: 0.97 },
  { keywords: ["open apps", "app launcher", "show apps"], intent: "open_app", target: "/apps", baseConfidence: 0.95 },
  { keywords: ["open assistant", "zara assistant", "talk to zara", "ask zara", "wake zara"], intent: "open_app", target: "/assistant", baseConfidence: 0.97 },
  { keywords: ["open console", "zara console", "command console"], intent: "open_app", target: "/console", baseConfidence: 0.96 },
  { keywords: ["open skills", "skills hub", "zara skills", "show skills", "skill center", "what can zara do", "what can you do"], intent: "open_app", target: "/skills", baseConfidence: 0.97 },
  { keywords: ["open memory", "show memory", "memory panel", "zara memory", "memory settings", "view memory"], intent: "open_app", target: "/memory", baseConfidence: 0.97 },

  // ── Gesture meta-commands ───────────────────────────────
  { keywords: ["select", "select focused", "begin drag", "drag"], intent: "navigation_action", baseConfidence: 0.92 },

  // ── File actions (skill) ─────────────────────────────────
  { keywords: ["summarize this folder", "summarize folder", "analyze folder", "scan folder"], intent: "skill_action", skillId: "skill.summarize_documents", requiresPermission: true, baseConfidence: 0.92 },
  { keywords: ["summarize this document", "summarize document", "summarize this file"], intent: "skill_action", skillId: "skill.summarize_documents", requiresPermission: true, baseConfidence: 0.93 },
  { keywords: ["optimize this document", "optimize document", "improve document", "clean up my writing"], intent: "skill_action", skillId: "skill.optimize_documents", requiresPermission: true, baseConfidence: 0.91 },
  { keywords: ["delete file", "remove file", "erase file", "delete this file"], intent: "skill_action", skillId: "skill.delete_files", requiresPermission: true, destructive: true, requiresConfirmation: true, baseConfidence: 0.93 },
  { keywords: ["view files", "show my files", "browse files", "open file browser"], intent: "skill_action", skillId: "skill.view_files", requiresPermission: true, baseConfidence: 0.91 },
  { keywords: ["edit document", "edit this document", "open document editor"], intent: "skill_action", skillId: "skill.edit_documents", requiresPermission: true, baseConfidence: 0.90 },
  { keywords: ["rename file", "rename this file"], intent: "skill_action", skillId: "skill.rename_files", requiresPermission: true, baseConfidence: 0.90 },
  { keywords: ["organize folder", "organize files", "organize my downloads"], intent: "skill_action", skillId: "skill.organize_folders", requiresPermission: true, requiresConfirmation: true, baseConfidence: 0.90 },

  // ── Communication skills ──────────────────────────────
  { keywords: ["email", "send email", "email john", "email sarah", "compose email"], intent: "skill_action", skillId: "skill.email", requiresPermission: true, requiresConfirmation: true, baseConfidence: 0.95 },
  { keywords: ["text", "send a message", "send text", "text mike", "text sarah"], intent: "skill_action", skillId: "skill.text_messages", requiresPermission: true, requiresConfirmation: true, baseConfidence: 0.94 },
  { keywords: ["call", "place a call", "call sarah", "dial"], intent: "skill_action", skillId: "skill.calls", requiresPermission: true, requiresConfirmation: true, baseConfidence: 0.95 },
  { keywords: ["find contact", "show contacts", "add contact", "my contacts"], intent: "skill_action", skillId: "skill.contacts", baseConfidence: 0.91 },

  // ── Productivity skills ───────────────────────────────
  { keywords: ["set a timer", "start a timer", "set timer", "timer for"], intent: "skill_action", skillId: "skill.timer", baseConfidence: 0.95 },
  { keywords: ["set alarm", "wake me up", "alarm for", "set an alarm"], intent: "skill_action", skillId: "skill.alarms", baseConfidence: 0.94 },
  { keywords: ["schedule meeting", "add event", "show my calendar", "what's on my calendar", "schedule"], intent: "skill_action", skillId: "skill.calendar", baseConfidence: 0.92 },
  { keywords: ["remind me", "add a reminder", "set a reminder", "what are my reminders"], intent: "skill_action", skillId: "skill.reminders", baseConfidence: 0.93 },
  { keywords: ["take a note", "create note", "new note", "save this note"], intent: "skill_action", skillId: "skill.notes", baseConfidence: 0.92 },

  // ── Web & Knowledge skills ────────────────────────────
  { keywords: ["search the web", "search web", "web search", "search for", "look up"], intent: "skill_action", skillId: "skill.web_search", baseConfidence: 0.94 },
  { keywords: ["fact check", "is this true", "verify this", "fact-check"], intent: "skill_action", skillId: "skill.fact_check", baseConfidence: 0.93 },
  { keywords: ["summarize this page", "summarize this article", "summarize page", "what is this about", "tldr"], intent: "skill_action", skillId: "skill.summarize_page", baseConfidence: 0.92 },
  { keywords: ["research topic", "research", "teach me about", "deep dive on"], intent: "skill_action", skillId: "skill.research_topic", baseConfidence: 0.90 },
  { keywords: ["translate", "translate to", "translate this"], intent: "skill_action", skillId: "skill.translate", baseConfidence: 0.93 },
  { keywords: ["define", "what does", "definition of", "what is the meaning"], intent: "skill_action", skillId: "skill.define_term", baseConfidence: 0.91 },

  // ── System control skills ─────────────────────────────
  { keywords: ["close this window", "close window", "close app"], intent: "skill_action", skillId: "skill.close_window", baseConfidence: 0.94 },
  { keywords: ["search device", "search my files", "find on this device"], intent: "skill_action", skillId: "skill.search_device", requiresPermission: true, baseConfidence: 0.91 },

  // ── Media skills ──────────────────────────────────────
  { keywords: ["pause", "stop playing", "stop media", "pause music"], intent: "skill_action", skillId: "skill.pause_audio", baseConfidence: 0.93 },
  { keywords: ["next track", "next song", "skip song", "skip"], intent: "skill_action", skillId: "skill.next_track", baseConfidence: 0.92 },
  { keywords: ["previous track", "previous song", "go back track"], intent: "skill_action", skillId: "skill.previous_track", baseConfidence: 0.91 },

  // ── System control — power ────────────────────────────
  { keywords: ["shut down", "shutdown", "power off", "turn off", "power down"], intent: "system_control", target: "shutdown", destructive: true, requiresConfirmation: true, baseConfidence: 0.97 },
  { keywords: ["restart", "reboot", "restart the computer", "reboot the system"], intent: "system_control", target: "reboot", destructive: true, requiresConfirmation: true, baseConfidence: 0.96 },
  { keywords: ["suspend", "sleep", "put to sleep", "hibernate", "standby"], intent: "system_control", target: "suspend", baseConfidence: 0.95 },
  { keywords: ["lock screen", "lock the screen", "lock computer", "lock session", "lock"], intent: "system_control", target: "lock", baseConfidence: 0.96 },

  // ── System control — volume ───────────────────────────
  { keywords: ["volume up", "louder", "increase volume", "turn it up", "raise volume"], intent: "system_control", target: "volume_up", baseConfidence: 0.94 },
  { keywords: ["volume down", "quieter", "decrease volume", "turn it down", "lower volume", "turn down"], intent: "system_control", target: "volume_down", baseConfidence: 0.94 },
  { keywords: ["mute", "silence", "mute audio", "mute the audio", "mute sound"], intent: "system_control", target: "mute", baseConfidence: 0.95 },
  { keywords: ["unmute", "unmute audio", "restore audio", "turn on sound"], intent: "system_control", target: "unmute", baseConfidence: 0.95 },
  { keywords: ["full volume", "max volume", "volume max", "maximum volume"], intent: "system_control", target: "volume_max", baseConfidence: 0.93 },

  // ── System control — brightness ───────────────────────
  { keywords: ["brighter", "increase brightness", "brightness up", "turn up brightness", "more brightness"], intent: "system_control", target: "brightness_up", baseConfidence: 0.93 },
  { keywords: ["dimmer", "decrease brightness", "brightness down", "dim screen", "less brightness", "lower brightness"], intent: "system_control", target: "brightness_down", baseConfidence: 0.93 },
  { keywords: ["full brightness", "max brightness", "brightness max", "brightest"], intent: "system_control", target: "brightness_max", baseConfidence: 0.91 },

  // ── System control — wifi ─────────────────────────────
  { keywords: ["scan wifi", "scan for wifi", "show wifi networks", "list wifi", "available networks", "what wifi"], intent: "system_control", target: "wifi_scan", baseConfidence: 0.93 },
  { keywords: ["disconnect wifi", "disconnect from wifi", "turn off wifi", "disable wifi"], intent: "system_control", target: "wifi_disconnect", baseConfidence: 0.94 },

  // ── App cycling (exact phrases) ───────────────────────
  { keywords: ["next app", "next window", "cycle apps", "cycle windows", "switch windows", "alt tab", "switch app", "other app", "next application"], intent: "cycle_apps", baseConfidence: 0.95 },

  // ── Developer skills ──────────────────────────────────
  { keywords: ["build me an app", "build an app", "create a new app", "scaffold app"], intent: "skill_action", skillId: "skill.build_app", requiresPermission: true, baseConfidence: 0.93 },
  { keywords: ["create a plugin", "new plugin", "plugin template", "create plugin"], intent: "skill_action", skillId: "skill.create_plugin", requiresPermission: true, baseConfidence: 0.92 },
  { keywords: ["inspect manifest", "validate plugin", "check manifest"], intent: "skill_action", skillId: "skill.inspect_manifest", baseConfidence: 0.91 },
  { keywords: ["run tests", "run test", "test my plugin", "run unit tests"], intent: "skill_action", skillId: "skill.run_test", requiresPermission: true, baseConfidence: 0.92 },

  // ── Search ──────────────────────────────────────────────
  { keywords: ["search files", "find file", "look for file"], intent: "search", requiresPermission: true, baseConfidence: 0.91 },

  // ── System status ────────────────────────────────────────
  { keywords: ["system status", "how is the system", "check status", "system health", "show stats"], intent: "system_status", target: "/", baseConfidence: 0.95 },
  { keywords: ["what is running", "active processes", "show processes", "what apps are open", "what's running"], intent: "system_status", baseConfidence: 0.90 },

  // ── Privacy ──────────────────────────────────────────────
  { keywords: ["enable microphone", "turn on mic", "enable mic", "activate mic"], intent: "privacy_action", target: "/privacy", requiresPermission: true, baseConfidence: 0.96 },
  { keywords: ["disable microphone", "turn off mic", "disable mic"], intent: "privacy_action", target: "/privacy", baseConfidence: 0.96 },
  { keywords: ["enable camera", "turn on camera", "activate camera"], intent: "privacy_action", target: "/privacy", requiresPermission: true, baseConfidence: 0.96 },
  { keywords: ["disable camera", "turn off camera"], intent: "privacy_action", target: "/privacy", baseConfidence: 0.96 },
  { keywords: ["enable cloud ai", "turn on cloud", "use cloud"], intent: "privacy_action", target: "/ai-providers", requiresPermission: true, baseConfidence: 0.94 },

  // ── Memory ───────────────────────────────────────────────
  { keywords: ["clear memory", "clear conversation", "reset memory", "clear chat"], intent: "privacy_action", target: "/memory", requiresConfirmation: true, destructive: true, baseConfidence: 0.94 },
  { keywords: ["purge memory", "purge all memory", "delete all memory", "wipe memory"], intent: "privacy_action", target: "/memory", requiresConfirmation: true, destructive: true, baseConfidence: 0.96 },
  { keywords: ["disable memory", "turn off memory", "stop remembering"], intent: "privacy_action", target: "/memory", baseConfidence: 0.94 },
  { keywords: ["enable memory", "turn on memory", "start remembering"], intent: "privacy_action", target: "/memory", baseConfidence: 0.94 },

  // ── Local AI ─────────────────────────────────────────────
  { keywords: ["show local ai", "local ai status", "ai status", "show ai status"], intent: "system_status", target: "/ai-providers", baseConfidence: 0.95 },
  { keywords: ["test ollama", "check ollama", "ollama status", "is ollama running"], intent: "settings_action", target: "/ai-providers", baseConfidence: 0.96 },
  { keywords: ["show models", "list models", "available models", "installed models", "what models"], intent: "settings_action", target: "/ai-providers", baseConfidence: 0.93 },
  { keywords: ["switch model", "change model", "use model", "select model"], intent: "settings_action", target: "/ai-providers", baseConfidence: 0.92 },

  // ── Developer ────────────────────────────────────────────
  { keywords: ["enable developer mode", "dev mode on", "toggle developer"], intent: "developer_action", target: "/developers", requiresPermission: true, baseConfidence: 0.95 },
  { keywords: ["install plugin", "add plugin", "load plugin"], intent: "developer_action", requiresPermission: true, baseConfidence: 0.91 },
];

// ── Response templates per intent ────────────────────────────
const INTENT_RESPONSES: Record<CommandIntent, (cmd: ParsedCommand) => string> = {
  open_app:            (c) => `Opening ${c.target?.replace("/", "") || "application"}...`,
  close_app:           (c) => `Closing ${c.target || "application"}.`,
  navigation_action:   (c) => c.target ? `Navigating to ${c.target}.` : `Navigation command received.`,
  scroll_action:       (c) => `Scroll: ${c.raw}.`,
  search:              (c) => `Initiating search: "${c.raw}"`,
  file_action:         () =>  `Analyzing folder contents...`,
  media_action:        (c) => `Media command: ${c.raw}.`,
  ai_question:         (c) => `Routing to Zara AI: "${c.raw}"`,
  system_status:       () =>  `System nominal. CPU: 14% | RAM: 3.2/16 GB | Local AI: Active.`,
  privacy_action:      (c) => `Privacy command: ${c.raw}. Check the Privacy panel to confirm.`,
  settings_action:     () =>  `Opening system settings.`,
  developer_action:    () =>  `Developer mode activated.`,
  skill_action:        (c) => `Routing to skill: ${c.skillId ?? "unknown"}`,
  launch_native_app:   (c) => `Launching ${c.target ?? "application"}...`,
  close_native_app:    (c) => `Closing ${c.target ?? "application"}...`,
  focus_native_app:    (c) => `Switching to ${c.target ?? "application"}...`,
  minimize_native_app: (c) => `Minimizing ${c.target ?? "application"}...`,
  cycle_apps:          ()  =>  `Cycling to next open window...`,
  file_navigate:       (c) => `Opening ${c.target ?? "folder"}...`,
  system_control: (c) => {
    const labels: Record<string, string> = {
      shutdown: "Shutting down...", reboot: "Restarting...",
      suspend: "Suspending system...", lock: "Locking screen...",
      volume_up: "Volume increased.", volume_down: "Volume decreased.",
      mute: "Audio muted.", unmute: "Audio unmuted.", volume_max: "Volume set to maximum.",
      brightness_up: "Brightness increased.", brightness_down: "Brightness decreased.",
      brightness_max: "Brightness set to maximum.",
      wifi_scan: "Scanning for Wi-Fi networks...", wifi_disconnect: "Disconnecting from Wi-Fi...",
    };
    return labels[c.target ?? ""] ?? `System control: ${c.target ?? c.raw}`;
  },
  unknown: (c) => `Command not recognized: "${c.raw}". Try "open Chrome" or "show my Downloads folder".`,
};

// ── Pass 1: Keyword classifier ────────────────────────────────
function classifyKeyword(normalized: string): { rule: IntentRule | null; confidence: number } {
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

  return { rule: bestRule, confidence: bestScore };
}

// ── Pass 2: Pattern-based extraction ─────────────────────────
// Detects "open Chrome", "close Firefox", "switch to VSCode", etc.
// Only runs when Pass 1 produced no confident match (< 0.80).

interface PatternMatch {
  intent: CommandIntent;
  target: string;       // extracted app name or folder path fragment
  confidence: number;
}

// Known home folders — resolved by the runtime to real paths
const KNOWN_FOLDERS = new Set([
  "downloads", "documents", "pictures", "photos", "music",
  "videos", "movies", "desktop", "home", "trash",
]);

function classifyPattern(normalized: string): PatternMatch | null {

  // ── 1. Folder navigation (checked FIRST — more specific) ──
  // "open/show/go to [my] Downloads [folder/directory]"
  const folderPattern = /^(?:open|show|go to|navigate to|take me to|bring up)\s+(?:my\s+)?(\w+)(?:\s+(?:folder|directory|dir))?$/;
  const folderMatch = normalized.match(folderPattern);
  if (folderMatch) {
    const word = folderMatch[1].toLowerCase();
    if (KNOWN_FOLDERS.has(word)) {
      return { intent: "file_navigate", target: word, confidence: 0.92 };
    }
  }

  // "show me my downloads", "show my pictures folder"
  const showMyFolder = /^show(?:\s+me)?\s+(?:my\s+)?(\w+)(?:\s+(?:folder|directory))?$/;
  const smf = normalized.match(showMyFolder);
  if (smf && KNOWN_FOLDERS.has(smf[1].toLowerCase())) {
    return { intent: "file_navigate", target: smf[1].toLowerCase(), confidence: 0.91 };
  }

  // ── 2. App lifecycle patterns ──────────────────────────────

  // LAUNCH: "open X", "launch X", "start X", "run X", "pull up X"
  const launchMatch = normalized.match(
    /^(?:open|launch|start|run|pull up|fire up|load)\s+(.+)$/
  );
  if (launchMatch) {
    const appName = launchMatch[1].trim();
    // Skip if it looks like a ZaraOS panel command (already handled by pass 1)
    const zaraosKeywords = ["settings", "privacy", "console", "assistant", "skills", "memory", "developer", "ai providers"];
    if (!zaraosKeywords.some((k) => appName === k || appName === `${k} panel`)) {
      return { intent: "launch_native_app", target: appName, confidence: 0.82 };
    }
  }

  // CLOSE: "close X", "quit X", "exit X", "kill X", "close out X"
  const closeMatch = normalized.match(
    /^(?:close|quit|exit|kill|shut|close out)\s+(.+)$/
  );
  if (closeMatch) {
    const appName = closeMatch[1].replace(/^(the|this)\s+/, "").trim();
    // Avoid swallowing "close window" / "close app" which keyword rules handle
    if (appName !== "window" && appName !== "app" && appName !== "this") {
      return { intent: "close_native_app", target: appName, confidence: 0.85 };
    }
  }

  // FOCUS / SWITCH: "switch to X", "bring up X", "focus X", "go to X app", "show X"
  const focusMatch = normalized.match(
    /^(?:switch to|bring up|focus|go to|show|jump to|alt-tab to|take me to)\s+(.+)$/
  );
  if (focusMatch) {
    const appName = focusMatch[1].replace(/\s+(app|window|application)$/, "").trim();
    const zaraosNavKeywords = ["settings", "privacy", "files", "console", "assistant", "skills", "memory", "developers"];
    if (!zaraosNavKeywords.includes(appName)) {
      return { intent: "focus_native_app", target: appName, confidence: 0.85 };
    }
  }

  // MINIMIZE: "minimize X", "hide X", "push X to background"
  const minimizeMatch = normalized.match(
    /^(?:minimize|hide|push to background|send to background)\s+(.+)$/
  );
  if (minimizeMatch) {
    const appName = minimizeMatch[1].replace(/\s+(app|window|application)$/, "").trim();
    return { intent: "minimize_native_app", target: appName, confidence: 0.87 };
  }

  return null;
}

// ── Public API ────────────────────────────────────────────────
export function parseAndRoute(raw: string, source: InputSource = "keyboard"): ParsedCommand {
  const normalized = raw.trim().toLowerCase();

  // Pass 1 — keyword rules
  const { rule, confidence } = classifyKeyword(normalized);

  // If keyword rule is confident, use it
  if (rule && confidence >= 0.80) {
    return {
      raw, normalized,
      intent: rule.intent,
      target: rule.target,
      skillId: rule.skillId,
      source,
      requiresPermission: rule.requiresPermission ?? false,
      requiresConfirmation: rule.requiresConfirmation ?? false,
      destructive: rule.destructive ?? false,
      confidence,
    };
  }

  // Pass 2 — pattern extraction (app lifecycle + file navigation)
  const patternMatch = classifyPattern(normalized);
  if (patternMatch) {
    return {
      raw, normalized,
      intent: patternMatch.intent,
      target: patternMatch.target,
      source,
      requiresPermission: false,
      requiresConfirmation: false,
      destructive: false,
      confidence: patternMatch.confidence,
    };
  }

  // Heuristic: question → AI
  const isQuestion =
    normalized.endsWith("?") ||
    /^(what|who|how|why|when|where|is|can|does|will|tell me|explain|are there|do you)/.test(normalized);

  if (isQuestion) {
    return {
      raw, normalized,
      intent: "ai_question",
      source,
      requiresPermission: false,
      requiresConfirmation: false,
      destructive: false,
      confidence: 0.85,
    };
  }

  // Low-confidence keyword match — still use it but mark low confidence
  if (rule) {
    return {
      raw, normalized,
      intent: rule.intent,
      target: rule.target,
      skillId: rule.skillId,
      source,
      requiresPermission: rule.requiresPermission ?? false,
      requiresConfirmation: rule.requiresConfirmation ?? false,
      destructive: rule.destructive ?? false,
      confidence,
    };
  }

  return {
    raw, normalized,
    intent: "unknown",
    source,
    requiresPermission: false,
    requiresConfirmation: false,
    destructive: false,
    confidence: 0.1,
  };
}

export function getResponseText(cmd: ParsedCommand): string {
  return INTENT_RESPONSES[cmd.intent](cmd);
}

// ── Legacy compat ─────────────────────────────────────────────
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
