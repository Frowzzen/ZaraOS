// ============================================================
// ZaraOS Core Types
// Shared TypeScript interfaces for all runtime layers.
// These form the contract between the UI Layer, Zara Runtime,
// AI Layer, Input Layer, System Layer, Plugin Layer, Security Layer,
// and Skills Layer.
// ============================================================

// ── Input Modes ────────────────────────────────────────────
// Hybrid is always the default. Voice is primary within Hybrid.
// Text is always available as a silent fallback in every mode.
export type InputMode = "voice" | "gesture" | "text" | "hybrid";

export interface InputModeConfig {
  mode: InputMode;
  voiceEnabled: boolean;
  gestureEnabled: boolean;
  textEnabled: boolean; // always true
  commandBoxVisible: boolean;
}

// ── Input Sources ──────────────────────────────────────────
export type InputSource = "voice" | "gesture" | "keyboard" | "system" | "plugin";

// ── Command Intents ────────────────────────────────────────
export type CommandIntent =
  | "open_app"
  | "close_app"
  | "navigation_action"
  | "scroll_action"
  | "search"
  | "file_action"
  | "media_action"
  | "ai_question"
  | "system_status"
  | "privacy_action"
  | "settings_action"
  | "developer_action"
  | "skill_action"          // Routes to a specific skill via skillId
  | "system_control"        // Direct hardware control: power, volume, brightness, wifi
  | "launch_native_app"     // Open any installed Linux app by name
  | "close_native_app"      // Close a running app window by name
  | "focus_native_app"      // Bring a running app window to the front
  | "minimize_native_app"   // Minimize a running app window
  | "cycle_apps"            // Cycle focus through all open windows
  | "file_navigate"         // Navigate to a folder/file in the Files panel
  | "unknown";

// ── Parsed Command ─────────────────────────────────────────
// All input sources (voice, gesture, keyboard, plugin) produce
// a ParsedCommand before being handed to the Zara Runtime.
export interface ParsedCommand {
  raw: string;
  normalized: string;
  intent: CommandIntent;
  target?: string;
  skillId?: string;         // Populated when intent === "skill_action"
  source: InputSource;
  requiresPermission: boolean;
  requiresConfirmation?: boolean;
  destructive: boolean;
  confidence: number;
}

// ── Command Result ─────────────────────────────────────────
// What the Runtime returns after executing a command.
export interface CommandResult {
  success: boolean;
  intent: CommandIntent;
  response: string;
  action?: "navigate" | "toggle" | "launch" | "scroll" | "confirm_required" | "permission_denied" | "noop" | "disabled";
  payload?: string;
  skillId?: string;
  requiresConfirmation?: boolean;
  dangerous?: boolean;
  confirmationReason?: string;
  source: InputSource;
  timestamp: number;
}

// ── Zara Status ────────────────────────────────────────────
// Current state of the Zara assistant.
export type ZaraStatus =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "offline"
  | "privacy-lock";

// ── System Status ──────────────────────────────────────────
export interface SystemStatus {
  cpuUsage: number;
  ramUsed: number;
  ramTotal: number;
  networkIO: string;
  neuralCores: "active" | "idle" | "offline";
  uptime: string;
  zaraStatus: ZaraStatus;
}

// ── Permission Categories ──────────────────────────────────
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

// ── Permission Record ──────────────────────────────────────
export interface PermissionRecord {
  category: PermissionCategory;
  granted: boolean;
  grantedAt?: number;
  revokedAt?: number;
}

// ── AI Provider Types ──────────────────────────────────────
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

// ── Plugin Manifest ────────────────────────────────────────
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
  // Skill declarations — a plugin can expose one or more skills
  skillDeclarations?: PluginSkillDeclaration[];
  systemAccess: boolean;
  priceModel: "free" | "paid" | "freemium";
  verified: boolean;
  sandboxRequired: boolean;
  installedAt?: number;
  status: "installed" | "available" | "incompatible";
}

// ── Plugin Skill Declaration ───────────────────────────────
// A skill a plugin declares so Zara Runtime can route to it.
export interface PluginSkillDeclaration {
  skillId: string;
  name: string;
  voiceCommands: string[];
  textCommands: string[];
  requiresConfirmation: boolean;
  dangerous: boolean;
}

// ── Gesture Types ──────────────────────────────────────────
// Full gesture vocabulary for ZaraOS.
// Mappings are defined in src/lib/gesture-mapper.ts.
// Future: MediaPipe Hands produces these as classified outputs.
export type GestureType =
  | "OPEN_PALM"          // Wake Zara — opens assistant
  | "SWIPE_LEFT"         // Previous panel
  | "SWIPE_RIGHT"        // Next panel
  | "SWIPE_UP"           // Scroll down (content moves up)
  | "SWIPE_DOWN"         // Scroll up (content moves down)
  | "SWIPE_ACROSS"       // Close active window / go home
  | "PINCH"              // Select
  | "GRAB"               // Drag
  | "FIST"               // Dismiss / go home
  | "TWO_FINGERS_UP";    // Precision scroll mode

// ── Gesture Mapping ────────────────────────────────────────
// A declared gesture → command binding.
export interface GestureMapping {
  gesture: GestureType;
  label: string;
  description: string;
  command: string;         // Natural language command fed to Runtime
  source: InputSource;
  requiresGestureMode: boolean;
}

// ── Voice Engine State ─────────────────────────────────────
export interface VoiceEngineState {
  isListening: boolean;
  permissionGranted: boolean;
  engine: "web_speech" | "whisper" | "vosk" | "none";
}

// ── Gesture Engine State ───────────────────────────────────
export interface GestureEngineState {
  isTracking: boolean;
  permissionGranted: boolean;
  engine: "mediapipe" | "opencv" | "none";
  lastGesture?: GestureType;
}
