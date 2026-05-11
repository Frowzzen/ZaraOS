// ============================================================
// ZaraOS Core Types
// Shared TypeScript interfaces for all runtime layers.
// These form the contract between the UI Layer, Zara Runtime,
// AI Layer, Input Layer, System Layer, Plugin Layer, and Security Layer.
// ============================================================

// ── Input Sources ─────────────────────────────────────────
export type InputSource = "voice" | "gesture" | "keyboard" | "system" | "plugin";

// ── Command Intents ───────────────────────────────────────
export type CommandIntent =
  | "open_app"
  | "close_app"
  | "search"
  | "file_action"
  | "media_action"
  | "ai_question"
  | "system_status"
  | "privacy_action"
  | "settings_action"
  | "developer_action"
  | "unknown";

// ── Parsed Command ────────────────────────────────────────
// All input sources (voice, gesture, keyboard, plugin) produce
// a ParsedCommand before being handed to the Zara Runtime.
export interface ParsedCommand {
  raw: string;
  normalized: string;
  intent: CommandIntent;
  target?: string;
  source: InputSource;
  requiresPermission: boolean;
  destructive: boolean;
  confidence: number;
}

// ── Command Result ────────────────────────────────────────
// What the Runtime returns after executing a command.
export interface CommandResult {
  success: boolean;
  intent: CommandIntent;
  response: string;
  action?: "navigate" | "toggle" | "launch" | "confirm_required" | "permission_denied" | "noop";
  payload?: string;
  source: InputSource;
  timestamp: number;
}

// ── Zara Status ───────────────────────────────────────────
// Current state of the Zara assistant.
export type ZaraStatus =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "offline"
  | "privacy-lock";

// ── System Status ─────────────────────────────────────────
export interface SystemStatus {
  cpuUsage: number;
  ramUsed: number;
  ramTotal: number;
  networkIO: string;
  neuralCores: "active" | "idle" | "offline";
  uptime: string;
  zaraStatus: ZaraStatus;
}

// ── Permission Categories ─────────────────────────────────
export type PermissionCategory =
  | "microphone"
  | "camera"
  | "local_ai"
  | "cloud_ai"
  | "network"
  | "files"
  | "system_actions"
  | "plugins"
  | "developer_mode";

// ── Permission Record ─────────────────────────────────────
export interface PermissionRecord {
  category: PermissionCategory;
  granted: boolean;
  grantedAt?: number;
  revokedAt?: number;
}

// ── AI Provider Types ─────────────────────────────────────
export type AIProvider =
  | "local"
  | "openai"
  | "anthropic"
  | "gemini"
  | "grok"
  | "deepseek"
  | "ollama"
  | "llamacpp";

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  configured: boolean;
  active: boolean;
  // SECURITY: API key is stored in localStorage only. Never logged. Never transmitted in Alpha 0.1.
  apiKey?: string;
  model?: string;
  isPrimary?: boolean;
}

// ── Plugin Manifest ───────────────────────────────────────
// Full specification for a ZaraOS plugin or app.
// Future versions will enforce this schema via a sandbox validator.
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  developer: string;
  description: string;
  category: "productivity" | "media" | "ai" | "system" | "automation" | "gesture" | "voice";
  entryPoint: string;
  permissions: PermissionCategory[];
  voiceCommands: string[];
  gestureCommands: string[];
  aiCapabilities: string[];
  systemAccess: boolean;
  priceModel: "free" | "paid" | "freemium";
  verified: boolean;
  sandboxRequired: boolean;
  installedAt?: number;
  status: "installed" | "available" | "incompatible";
}

// ── Gesture Types ─────────────────────────────────────────
export type GestureType =
  | "OPEN_PALM"
  | "SWIPE_LEFT"
  | "SWIPE_RIGHT"
  | "PINCH"
  | "GRAB"
  | "FIST"
  | "TWO_FINGERS_UP";

// ── Voice Engine State ────────────────────────────────────
export interface VoiceEngineState {
  isListening: boolean;
  permissionGranted: boolean;
  engine: "web_speech" | "whisper" | "vosk" | "none";
}

// ── Gesture Engine State ──────────────────────────────────
export interface GestureEngineState {
  isTracking: boolean;
  permissionGranted: boolean;
  engine: "mediapipe" | "opencv" | "none";
  lastGesture?: GestureType;
}
