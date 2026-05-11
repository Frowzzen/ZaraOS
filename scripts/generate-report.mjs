// ZaraOS — ChatGPT Catch-Up Report Generator (Alpha 0.4)
// Run: node scripts/generate-report.mjs
// Automatically pulls CHANGELOG.md from project root for the feature log section.
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../zaraos-chatgpt-report.pdf");

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 56, bottom: 56, left: 56, right: 56 },
  bufferPages: true,
  info: {
    Title: "ZaraOS Alpha 0.4 — Full Implementation Report",
    Author: "ZaraOS Build System",
    Subject: "Complete architecture and implementation briefing for ChatGPT",
    CreationDate: new Date(),
  },
});

doc.pipe(fs.createWriteStream(OUT));

// ── Palette ────────────────────────────────────────────────
const CYAN   = "#22d3ee";
const WHITE  = "#f1f5f9";
const MUTED  = "#94a3b8";
const BG     = "#0f172a";
const CARD   = "#1e293b";
const VIOLET = "#a78bfa";
const AMBER  = "#fbbf24";
const GREEN  = "#4ade80";
const BORDER = "#334155";

const W = doc.page.width - 112;

// ── Helpers ────────────────────────────────────────────────

function newPage() {
  doc.addPage();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(BG);
}

function rule(color = BORDER) {
  doc.moveTo(56, doc.y).lineTo(56 + W, doc.y)
    .strokeColor(color).lineWidth(0.5).stroke();
  doc.moveDown(0.4);
}

function sectionHeader(text) {
  doc.moveDown(0.7);
  if (doc.y > 700) newPage();
  const y = doc.y;
  doc.rect(56, y, W, 24).fill(CARD);
  doc.rect(56, y, 4, 24).fill(CYAN);
  doc.fillColor(CYAN).fontSize(10).font("Helvetica-Bold")
    .text(text.toUpperCase(), 68, y + 7, { width: W - 20 });
  doc.y = y + 30;
}

function subHeader(text, color = WHITE) {
  doc.moveDown(0.4);
  if (doc.y > 720) newPage();
  doc.fillColor(color).fontSize(9.5).font("Helvetica-Bold").text(text, 56, doc.y, { width: W });
  doc.moveDown(0.2);
}

function body(text, color = MUTED) {
  doc.fillColor(color).fontSize(8.5).font("Helvetica")
    .text(text, 56, doc.y, { width: W, lineGap: 2.5 });
  doc.moveDown(0.3);
}

function bullet(label, desc, lc = CYAN) {
  if (doc.y > 730) newPage();
  const y = doc.y;
  doc.fillColor(lc).fontSize(8.5).font("Helvetica-Bold")
    .text("• " + label, 66, y, { width: 155, lineBreak: false });
  doc.fillColor(WHITE).font("Helvetica")
    .text(desc, 226, y, { width: W - 170, lineGap: 2 });
  doc.moveDown(0.25);
}

function codeLine(text) {
  if (doc.y > 730) newPage();
  doc.fillColor("#e2e8f0").fontSize(7.5).font("Courier")
    .text(text, 66, doc.y, { width: W - 20, lineGap: 1.5 });
  doc.moveDown(0.05);
}

function codeBlock(text) {
  if (doc.y > 660) newPage();
  const lines = text.trim().split("\n");
  const lh = 12;
  const pad = 8;
  const h = lines.length * lh + pad * 2;
  const y = doc.y;
  doc.rect(56, y, W, h).fill("#0d1117");
  doc.fillColor("#e2e8f0").fontSize(7.5).font("Courier");
  lines.forEach((ln, i) => {
    doc.text(ln, 64, y + pad + i * lh, { lineBreak: false });
  });
  doc.y = y + h + 6;
  doc.moveDown(0.2);
}

function providerRow(id, name, when, desc, color) {
  if (doc.y > 725) newPage();
  const y = doc.y;
  doc.rect(56, y, 4, 16).fill(color);
  doc.fillColor(color).fontSize(9).font("Helvetica-Bold")
    .text(name, 66, y + 1, { continued: true });
  doc.fillColor(MUTED).font("Helvetica").fontSize(8)
    .text(`  (${id})  [${when}]`, { continued: true });
  doc.fillColor(WHITE).text("  " + desc);
  doc.moveDown(0.3);
}

// ═══════════════════════════════════════════════════════════
// COVER
// ═══════════════════════════════════════════════════════════

doc.rect(0, 0, doc.page.width, doc.page.height).fill(BG);

// Header stripe
doc.rect(0, 0, doc.page.width, 200).fill("#060d1a");

// Z mark
doc.rect(56, 50, 44, 44).fill(CYAN);
doc.fillColor(BG).fontSize(30).font("Helvetica-Bold")
  .text("Z", 56, 55, { width: 44, align: "center" });

// Title
doc.fillColor(WHITE).fontSize(28).font("Helvetica-Bold").text("ZaraOS", 114, 55);
doc.fillColor(CYAN).fontSize(9).font("Helvetica").text("FULL IMPLEMENTATION REPORT  ·  ALPHA 0.4", 115, 88);

// Date
doc.fillColor(MUTED).fontSize(8)
  .text(`Generated ${new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })}`, 115, 103);
doc.fillColor(GREEN).fontSize(8).text("Status: Published & Live", 115, 116);

doc.moveTo(56, 175).lineTo(56 + W, 175).strokeColor(CYAN).lineWidth(1).stroke();

doc.fillColor(WHITE).fontSize(10).font("Helvetica-Bold")
  .text("Briefing for ChatGPT — Complete context to resume work on ZaraOS", 56, 185);

doc.y = 215;
doc.fillColor(MUTED).fontSize(9).font("Helvetica")
  .text(
    "ZaraOS is a futuristic AI-native desktop operating environment prototype. It runs entirely in the browser " +
    "(React + Vite), has no backend dependencies for Alpha 0.4, and is designed to be packaged as a Tauri " +
    "desktop app and eventually a bootable Linux ISO. The core philosophy is local-first AI: all inference " +
    "runs on-device by default; cloud providers are opt-in with the user's own API keys. This document " +
    "captures every system built, all architectural decisions, the complete AI provider stack, and the roadmap.",
    56, doc.y, { width: W, lineGap: 3 }
  );

doc.moveDown(1.2);
rule(CYAN);
doc.moveDown(0.5);

// Contents
doc.fillColor(WHITE).fontSize(9).font("Helvetica-Bold").text("Contents", 56, doc.y);
doc.moveDown(0.4);
[
  "1.  Project Overview & Core Constraints",
  "2.  Tech Stack & Monorepo Structure",
  "3.  Architecture — Command Flow",
  "4.  AI Provider Stack (all 6 providers)",
  "5.  Health Check Caching",
  "6.  System Prompt System & Intent Addendums",
  "7.  Conversation Memory",
  "8.  Voice Engine & Waveform Animation",
  "9.  Permissions System",
  "10. Pages & Panels",
  "11. Global Command Box",
  "12. Completed Implementation Items (7 items)",
  "13. Upcoming Roadmap",
  "14. Key File Map",
  "15. Important Gotchas",
].forEach((item) => {
  doc.fillColor(MUTED).fontSize(8.5).font("Helvetica").text(item, 70, doc.y, { width: W - 14 });
  doc.moveDown(0.28);
});

// ═══════════════════════════════════════════════════════════
// SECTION 1 — OVERVIEW
// ═══════════════════════════════════════════════════════════

newPage();

sectionHeader("1. Project Overview & Core Constraints");

body(
  "ZaraOS is a web-based prototype of an AI-first operating environment. It runs entirely in the browser " +
  "(React + Vite), has no backend dependencies for Alpha 0.4, and is designed to be packaged later as a " +
  "Tauri desktop app and eventually a bootable Linux ISO."
);

subHeader("Vision");
bullet("Short term",   "Feature-complete browser prototype with real AI inference, voice, and gesture");
bullet("Medium term",  "Tauri-packaged desktop app (Windows / macOS / Linux) with Whisper.cpp offline voice");
bullet("Long term",    "Bootable ZaraOS Linux ISO with Ollama pre-installed, Zara as the shell");

subHeader("Core Constraints — Never Break These");
bullet("No emojis",                 "in the UI ever, no exceptions");
bullet("Always dark mode",          "no light mode toggle at the OS level");
bullet("Deny-by-default",           "mic, camera, cloud AI, network, files — all off at launch");
bullet("UI → Runtime only",         "UI calls useRuntime(), never calls AI/voice/gesture engines directly");
bullet("Local AI default",          "cloud AI is opt-in, user-provided keys, ZaraOS pays nothing for inference");
bullet("Transparent AI state",      "Zara always tells the user when she is in simulated mode vs real AI");

// ═══════════════════════════════════════════════════════════
// SECTION 2 — STACK
// ═══════════════════════════════════════════════════════════

sectionHeader("2. Tech Stack & Monorepo Structure");

subHeader("Stack");
bullet("Package manager",  "pnpm workspaces (monorepo) — workspace packages use @workspace/ prefix");
bullet("Runtime",          "Node.js 24, TypeScript 5.9 strict mode throughout");
bullet("Frontend",         "React + Vite — code-split with React.lazy() + Suspense on all 11 pages");
bullet("Styling",          "Tailwind CSS + shadcn/ui component library");
bullet("Animation",        "framer-motion — used for VoiceWaveform and panel transitions");
bullet("Routing",          "wouter (lightweight client-side router)");
bullet("State",            "React Context + localStorage — no backend for Alpha 0.4");
bullet("API Server",       "Express 5 artifact exists but is NOT yet called by ZaraOS");
bullet("Database",         "PostgreSQL + Drizzle ORM schema exists but is NOT yet wired");
bullet("Build",            "esbuild for API server CJS bundle; Vite for frontend");

subHeader("Monorepo layout");
codeBlock(
`artifacts/zaraos/        ← ZaraOS frontend (this is the main product)
artifacts/api-server/     ← Express 5 API server (Alpha 0.5+)
artifacts/mockup-sandbox/ ← Canvas design sandbox (internal tooling)
lib/api-spec/             ← OpenAPI contract + React Query codegen
lib/db/                   ← Drizzle ORM schema
scripts/                  ← Utility scripts (this file)`
);

subHeader("Key commands");
bullet("pnpm --filter @workspace/zaraos run dev",      "Start the ZaraOS frontend");
bullet("pnpm --filter @workspace/zaraos run typecheck","TypeScript check (always run after changes)");
bullet("pnpm run typecheck",                           "Full workspace typecheck including libs");
bullet("pnpm --filter @workspace/api-spec run codegen","Regenerate API hooks from OpenAPI spec");

// ═══════════════════════════════════════════════════════════
// SECTION 3 — ARCHITECTURE
// ═══════════════════════════════════════════════════════════

sectionHeader("3. Architecture — Command Flow");

body(
  "Every user input — voice, gesture, keyboard, or plugin — flows through the same layered pipeline. " +
  "The UI calls useRuntime() exclusively. No component touches an AI provider or hardware engine directly."
);

codeBlock(
`UI (useRuntime hook)
  └─ ZaraRuntime.executeCommand(input, source)
       ├─ parseAndRoute(input, source) → ParsedCommand
       │     { raw, normalized, intent, target, skillId,
       │       source, requiresPermission, destructive, confidence }
       │
       ├─ intent === "skill_action"  → SkillRuntime.executeSkill()
       ├─ requiresPermission check  → permission_denied gate
       ├─ destructive check         → confirm_required gate
       ├─ intent === "ai_question"  → streamAssistantMessage()
       │     └─ aiRuntime.streamMessage(msg, onChunk, source, intent)
       │           → buildRequestPayload(msg, intent)
       │               → buildSystemPrompt(undefined, intent)   ← intent-aware
       │               → buildContextBlock(injectionInput)      ← live OS state
       │               → conversationMemory.getMessagesForContext(3000)
       │           → requestRouter.dispatch()
       │               → providerRouter.route()                 ← cached health
       │               → modelRouter.selectModel()
       │               → provider.streamMessage()
       └─ all other intents         → CommandResult { action, payload }`
);

subHeader("Key TypeScript types (src/core/types.ts)");
bullet("CommandIntent",   "open_app | close_app | navigation_action | scroll_action | search | file_action | media_action | ai_question | system_status | privacy_action | settings_action | developer_action | skill_action | unknown");
bullet("ZaraStatus",      "idle | listening | thinking | speaking | offline | privacy-lock");
bullet("InputSource",     "voice | gesture | keyboard | system | plugin");
bullet("ParsedCommand",   "raw, normalized, intent, target, skillId, source, requiresPermission, destructive, confidence");
bullet("CommandResult",   "success, intent, response, action, payload, skillId, requiresConfirmation, dangerous, confirmationReason, source, timestamp");
bullet("PermissionCategory", "microphone | camera | cloud_ai | network | files | system_actions | developer_mode | plugins | local_ai");

// ═══════════════════════════════════════════════════════════
// SECTION 4 — AI PROVIDER STACK
// ═══════════════════════════════════════════════════════════

sectionHeader("4. AI Provider Stack (src/core/ai/)");

body(
  "The AI layer is fully layered: AIRuntime → RequestRouter → ProviderRouter → Provider. " +
  "No component in the UI touches a provider directly. All 6 providers implement the same " +
  "AIProviderAdapter interface."
);

subHeader("Provider priority — local_first strategy (default)");
providerRow("local",     "Zara Local Runtime", "Always",    "Simulated responses. Guaranteed fallback. Always registered.", GREEN);
providerRow("ollama",    "Ollama",             "If running","Real local LLM at localhost:11434. NDJSON streaming. /api/version health check.", CYAN);
providerRow("llamacpp",  "llama.cpp Server",   "If running","Real local LLM at localhost:8080. OpenAI-compatible REST API.", CYAN);
providerRow("openai",    "OpenAI",             "Opt-in",    "SSE streaming to api.openai.com. /v1/models health check. Default: gpt-4o-mini.", VIOLET);
providerRow("anthropic", "Anthropic",          "Opt-in",    "SSE streaming. anthropic-dangerous-direct-browser-access header required. Default: claude-3-5-haiku-latest.", VIOLET);
providerRow("gemini",    "Google Gemini",      "Opt-in",    "SSE via ?alt=sse. API key as URL query param. /v1beta/models health check. Default: gemini-1.5-flash.", VIOLET);

doc.moveDown(0.3);
subHeader("Provider routing logic");
body("When preferredProviderId is set, the router tries that provider first and falls back on failure. " +
     "In local_first mode: tries Ollama → llama.cpp → local. If cloudAIEnabled=true, tries cloud providers " +
     "as a last resort before the guaranteed local fallback.");

subHeader("CORS details per cloud provider");
bullet("OpenAI",    "Natively allows browser CORS. Standard Authorization: Bearer {key} header.");
bullet("Anthropic", "Requires 'anthropic-dangerous-direct-browser-access: true' header on every request. Official opt-in.");
bullet("Gemini",    "No auth header used. API key passed as ?key=... URL query param. Google permits browser CORS.");

subHeader("Provider Adapter Interface");
codeBlock(
`interface AIProviderAdapter {
  id: string;  name: string;  isLocal: boolean;  isCloud: boolean;  isEnabled: boolean;
  initialize(): Promise<void>;
  sendMessage(messages: AIMessage[], options?: AISendOptions): Promise<string>;
  streamMessage(messages: AIMessage[], onChunk: AIStreamCallback, options?: AISendOptions): Promise<void>;
  healthCheck(): Promise<AIProviderStatus>;
  listModels(): Promise<string[]>;
  getActiveModel(): string;  setModel(modelId: string): void;
  supportsStreaming(): boolean;  supportsVision(): boolean;
  supportsTools(): boolean;     supportsOffline(): boolean;
}`
);

subHeader("Cloud AI Gate");
body("ProviderRouter.cloudAIEnabled is false at startup. It is set to true only when the user grants " +
     "the cloud_ai permission in Privacy settings. Wired via: ZaraRuntime.initialize() → setCloudAIAllowed() " +
     "and ZaraRuntime.requestPermission('cloud_ai') / revokePermission('cloud_ai'). " +
     "This was a critical bug fixed in Alpha 0.4 — the gate was never being set before.");

// ═══════════════════════════════════════════════════════════
// SECTION 5 — HEALTH CHECK CACHING
// ═══════════════════════════════════════════════════════════

sectionHeader("5. Health Check Caching (ProviderRouter)");

body("Without caching, every message dispatch triggered a healthCheck() on Ollama and llama.cpp — each " +
     "with a 2-3 second network timeout when those servers are not running. This created a 3+ second " +
     "penalty before every AI response.");

subHeader("Cache policy");
bullet("available=true",  "Cache for 60 seconds — re-validates healthy providers once per minute");
bullet("available=false", "Cache for 20 seconds — allows quick detection when a local server starts");
bullet("Cache bypass",    "invalidateHealthCache(id) is called before explicit UI 'Test' button clicks");
bullet("Auto-eviction",   "Cache cleared on: API key change, endpoint change, provider re-registration");
bullet("getCachedStatus(id)", "Peek at cache without triggering a live check — used by the UI status display");

subHeader("Implementation");
codeBlock(
`// ProviderRouter.cachedHealthCheck() — called by route() on every dispatch
private async cachedHealthCheck(provider): Promise<AIProviderStatus> {
  const cached = this.healthCache.get(provider.id);
  if (cached && Date.now() < cached.expiresAt) return cached.status;   // HIT
  const status = await provider.healthCheck();                          // MISS → live
  const ttl = status.available ? 60_000 : 20_000;
  this.healthCache.set(provider.id, { status, expiresAt: Date.now() + ttl });
  return status;
}`
);

// ═══════════════════════════════════════════════════════════
// SECTION 6 — SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════

newPage();
sectionHeader("6. System Prompt System (src/core/ai/prompts/zara-system-prompt.ts)");

body("The system prompt is composed dynamically per request. When a concrete intent is known, a " +
     "per-intent addendum replaces the generic ZARA_COMMAND_PARSING section. This allows Zara to " +
     "respond with the exact behavior appropriate for the command class.");

subHeader("Composition order");
codeBlock(
`1. ZARA_BASE_SYSTEM_PROMPT       — identity, personality, voice & tone, what Zara is not
2. ZARA_PRIVACY_PRINCIPLES        — 6 local-first privacy principles
3. ZARA_LOCAL_FIRST_PHILOSOPHY    — local AI default, cloud opt-in, BYOK model
4. ZARA_CONFIRMATION_RULES        — destructive action gates
5. ZARA_SKILL_PHILOSOPHY          — skill routing transparency
6. ZARA_SAFETY_RULES              — permission enforcement rules
7. ZARA_INTENT_ADDENDUMS[intent]  — OR ZARA_COMMAND_PARSING (fallback)
8. CURRENT SYSTEM STATE block     — live OS context (provider, model, permissions, panel)`
);

subHeader("buildSystemPrompt(context?, intent?)");
body("Selects the matching addendum when intent is a key of ZARA_INTENT_ADDENDUMS. Falls back to " +
     "generic ZARA_COMMAND_PARSING when intent is undefined or unrecognized. The intent is already in " +
     "scope in buildRequestPayload() via the intent parameter passed from aiRuntime.streamMessage().");

subHeader("Intent-Specific Addendums (14 entries)");
[
  ["ai_question",       "Conversational tone, 1-4 sentences, no OS jargon, don't fabricate live data"],
  ["search",            "Lead with the answer, name ZaraOS location, suggest alternatives if missing"],
  ["open_app",          "One-sentence confirmation, permission check, closest match if app unknown"],
  ["close_app",         "One-sentence confirm, check for unsaved work before closing"],
  ["navigation_action", "Single short confirm, don't re-describe the destination panel"],
  ["scroll_action",     "Acknowledge briefly or silently, note if no scrollable area present"],
  ["file_action",       "State action + target before executing, files permission gate, always confirm destructive ops"],
  ["media_action",      "Minimal acknowledgement, no preamble"],
  ["system_status",     "Data-driven short list from context block, no speculation, mark unknowns"],
  ["privacy_action",    "Announce what changes before applying, note mid-session interruptions"],
  ["settings_action",   "Confirm setting + new value in one line, note any side effects"],
  ["developer_action",  "Technical precision, surface security implications explicitly"],
  ["skill_action",      "Name the skill, state required permissions, explicit confirm request before executing"],
  ["unknown",           "No guessing, no action, ask for clarification with a specific suggestion"],
].forEach(([k, v]) => bullet(k, v));

// ═══════════════════════════════════════════════════════════
// SECTION 7 — MEMORY
// ═══════════════════════════════════════════════════════════

sectionHeader("7. Conversation Memory (src/core/ai/memory/)");

bullet("ConversationSession",     "Started or resumed on aiRuntime.initialize(). Sessions resume if last activity < 30 min.");
bullet("Message storage",         "All messages in localStorage under zaraos_session_* keys. Restored on reload.");
bullet("Context pruning",         "getMessagesForContext(3000) — walks backwards, stops at ~3000 tokens (1 token ≈ 4 chars).");
bullet("Memory entries",          "Separate from messages — persistent facts, session facts, pinned entries. Survive session resets.");
bullet("Skill usage tracking",    "Every skill execution logged: skillId, lastUsedAt, useCount, lastResult.");
bullet("User preferences",        "Stored separately, survive all purge operations except purgeAll().");
bullet("clearAllHistory()",       "Wipes messages, preserves pinned entries.");
bullet("purgeAll()",              "Nuclear option — wipes everything including preferences.");
bullet("estimateStorageBytes()",  "Returns current localStorage usage estimate for memory stats display.");

subHeader("Storage keys");
codeBlock(
`zaraos_session_current_id   ← current session ID
zaraos_session_{id}          ← full session object with messages array
zaraos_memory_entries        ← persistent/session/pinned MemoryEntry[]
zaraos_skill_usage           ← SkillUsageRecord[]
zaraos_preferences           ← UserPreferences object`
);

// ═══════════════════════════════════════════════════════════
// SECTION 8 — VOICE ENGINE
// ═══════════════════════════════════════════════════════════

sectionHeader("8. Voice Engine & Waveform Animation");

subHeader("VoiceEngine (src/lib/voice-engine.ts) — Alpha 0.4, fully wired");
body("Real voice input via the Web Speech API. Alpha 0.5+ will replace with Whisper.cpp via Tauri " +
     "subprocess. The engine interface will stay identical — only the internals change.");

bullet("Browser support",       "Chrome 33+, Edge 79+, Safari iOS 14+. Firefox: NOT supported.");
bullet("States",                "idle → listening → idle / error / unsupported");
bullet("Interim results",       "Streamed character-by-character to the input box as the user speaks");
bullet("Final results",         "Fired on utterance completion, routed to zaraRuntime.executeCommand()");
bullet("Error handling",        "11 named error codes with user-facing messages. 'aborted' is silent.");
bullet("simulateVoiceInput()",  "Dev/testing helper — fires interim+final callbacks without a real mic");
bullet("Alpha 0.5+ plan",       "Whisper.cpp via Tauri: window.__TAURI__.invoke('transcribe') → same onResult callbacks");

subHeader("VoiceWaveform (src/components/voice-waveform.tsx) — Alpha 0.4, new");
body("7 framer-motion bars with staggered animation speeds and peak amplitudes. Collapses to a flat " +
     "resting state (scaleY=0.12) when active=false. Three surface deployments:");
bullet("Assistant page",       "Replaces the pulsing amber dot above the input bar during LISTENING state");
bullet("Global command box",   "Replaces the pulsing dot in the header LISTENING badge");
bullet("Sidebar Voice toggle", "Replaces the static active dot when voice mode is enabled");
body("Props: active (bool), color ('amber' | 'cyan' | 'purple'), size ('xs' | 'sm' | 'md').", MUTED);

codeBlock(
`// 7 bars — each tuple: [peakScaleY, durationSeconds, delaySeconds]
const BAR_CONFIGS = [
  [0.35, 0.70, 0.00], [0.90, 0.52, 0.08], [0.60, 0.80, 0.16],
  [1.00, 0.46, 0.04], [0.55, 0.64, 0.12], [0.80, 0.56, 0.20], [0.30, 0.74, 0.06],
];`
);

// ═══════════════════════════════════════════════════════════
// SECTION 9 — PERMISSIONS
// ═══════════════════════════════════════════════════════════

sectionHeader("9. Permissions System (src/core/permissions.ts)");

body("Deny-by-default. All permissions are OFF at launch. State persists to localStorage. " +
     "The UI requests permissions through ZaraRuntime.requestPermission(category).");

[
  ["microphone",     "Required for voice input (VoiceEngine.startListening())"],
  ["camera",         "Reserved for future vision / gesture features"],
  ["cloud_ai",       "Required for cloud providers. Also gates ProviderRouter.cloudAIEnabled."],
  ["network",        "General network access for non-AI network calls"],
  ["files",          "File system read/write access"],
  ["system_actions", "OS-level actions (shutdown, reboot, etc.)"],
  ["developer_mode", "Plugin development, raw API access"],
  ["plugins",        "Third-party plugin installation and execution"],
  ["local_ai",       "Local AI inference (Ollama, llama.cpp)"],
].forEach(([p, d]) => bullet(p, d));

// ═══════════════════════════════════════════════════════════
// SECTION 10 — PAGES
// ═══════════════════════════════════════════════════════════

newPage();
sectionHeader("10. Pages & Panels (src/pages/)");

[
  ["home.tsx — Dashboard",        "Live clock, CPU/RAM/Network/Neural stats, Privacy Fortress panel, System Activity feed"],
  ["assistant.tsx — Assistant",   "Full AI chat — SSE streaming, ZaraStatus states, voice input with interim transcript, memory stats, VoiceWaveform, conversation clear"],
  ["console.tsx — Console",       "Natural language command console, intent routing, command history, source badges (voice/gesture/keyboard)"],
  ["apps.tsx — App Launcher",     "App grid with voice command hints per tile. Launches via zaraRuntime.launchApp()"],
  ["files.tsx — Files",           "Placeholder file browser — permission-gated behind files permission"],
  ["media.tsx — Media",           "Combined audio/video player placeholder"],
  ["settings.tsx — Settings",     "System configuration, Input Mode tab, Gestures tab with test buttons"],
  ["privacy.tsx — Privacy",       "Mic/camera/AI/network/files status and enable/disable toggles — directly calls requestPermission()"],
  ["ai-providers.tsx — AI Providers", "Full provider manager: enable/disable, API key entry, endpoint config, Test button, preferred provider pin, health status display"],
  ["developers.tsx — Developers", "Plugin registry, PluginManifest spec, 4 example plugins, Zara Store preview"],
  ["skills.tsx — Skills",         "Skill hub — lists all registered skills with permission status, usage stats, enable/disable"],
  ["not-found.tsx",               "404 fallback page"],
].forEach(([page, desc]) => bullet(page, desc));

// ═══════════════════════════════════════════════════════════
// SECTION 11 — GLOBAL COMMAND BOX
// ═══════════════════════════════════════════════════════════

sectionHeader("11. Global Command Box (src/components/global-command-box.tsx)");

body("A Spotlight/Alfred-style overlay accessible from anywhere via Ctrl+Space. Supports voice and " +
     "keyboard input. Routes all commands through zaraRuntime.executeCommand() — same pipeline as everything else.");

bullet("Trigger",             "Ctrl+Space global keyboard shortcut (registered once in InputModeProvider)");
bullet("Voice button",        "Inside the box — same VoiceEngine as the assistant page");
bullet("LISTENING badge",     "Shows VoiceWaveform (xs, amber) + 'LISTENING' when voice is active in the box");
bullet("Command routing",     "All commands: zaraRuntime.executeCommand(input, 'voice' | 'keyboard')");
bullet("Auto-navigation",     "If result.action === 'navigate', box closes and wouter.navigate() fires");
bullet("History",             "Up/Down arrows navigate last 5 commands. Shown as clickable chips.");
bullet("Quick suggestions",   "6 suggestion chips pre-populated with common commands");

// ═══════════════════════════════════════════════════════════
// SECTION 12 — COMPLETED ITEMS
// ═══════════════════════════════════════════════════════════

sectionHeader("12. Completed Implementation Items");

const items = [
  {
    num: "Item 1", title: "Ollama Provider Routing", status: "DONE",
    details: [
      "Real HTTP POST to localhost:11434/api/chat (OpenAI-compatible format)",
      "NDJSON streaming: each line is JSON with { message: { content }, done }",
      "healthCheck() via GET /api/version — 3 second timeout",
      "Graceful fallback to simulated responses if Ollama is not running",
      "Router priority: Ollama → llama.cpp → local (in local_first strategy)",
      "Tauri plan: Rust backend will manage Ollama process via std::process::Command",
    ]
  },
  {
    num: "Item 2", title: "Web Speech API Voice Input", status: "DONE",
    details: [
      "Real voice input via SpeechRecognition / webkitSpeechRecognition",
      "Interim results (isFinal=false) stream to the input box character by character",
      "Final result (isFinal=true) fires zaraRuntime.executeCommand(transcript, 'voice')",
      "11 named error codes with user-facing messages. 'aborted' is silent.",
      "Firefox unsupported notice displayed when SpeechRecognition is unavailable",
      "Wired into assistant.tsx and global-command-box.tsx",
    ]
  },
  {
    num: "Item 3", title: "Route-Based Code Splitting", status: "DONE",
    details: [
      "All 11 page components wrapped in React.lazy() + Suspense",
      "Initial bundle loads only the OS shell (layout, sidebar, routing)",
      "Each panel chunk loads on first navigation to that route",
      "Loading skeleton displayed during chunk fetch",
      "Vite automatically splits at dynamic import boundaries",
    ]
  },
  {
    num: "Item 4", title: "Real Cloud Provider HTTP Inference", status: "DONE",
    details: [
      "OpenAI: SSE streaming to api.openai.com/v1/chat/completions (stream: true)",
      "OpenAI: healthCheck via GET /v1/models — validates key without token use",
      "Anthropic: SSE streaming with 'anthropic-dangerous-direct-browser-access: true' header",
      "Anthropic: system prompt via top-level 'system' field (not in messages array)",
      "Anthropic: healthCheck via GET /v1/models",
      "Gemini: SSE via ?alt=sse to /v1beta/models/{model}:streamGenerateContent",
      "Gemini: API key as ?key= URL param, 'model' role for assistant messages",
      "Gemini: healthCheck via GET /v1beta/models?key=...",
      "BUG FIX: providerRouter.cloudAIEnabled was always false — wired setCloudAIAllowed()",
      "through ZaraRuntime.initialize() / requestPermission() / revokePermission()",
    ]
  },
  {
    num: "Item 5", title: "Health Check Caching", status: "DONE",
    details: [
      "ProviderRouter wraps all healthCheck() calls in cachedHealthCheck()",
      "TTL: 60s for available providers, 20s for unavailable",
      "Cache evicted on: API key change, endpoint change, re-registration, UI 'Test' click",
      "Eliminates 2-3 second network timeout penalty on every message dispatch",
      "getCachedStatus(id) for UI to peek without triggering a live check",
      "invalidateHealthCache(id?) for selective or full eviction",
    ]
  },
  {
    num: "Item 6", title: "Voice Waveform Animation", status: "DONE",
    details: [
      "VoiceWaveform: 7 framer-motion bars, staggered amplitudes (0.30–1.00) and durations (0.46–0.80s)",
      "Collapses to scaleY=0.12 flat resting state when active=false",
      "Props: active (bool), color ('amber'|'cyan'|'purple'), size ('xs'|'sm'|'md')",
      "Deployed in: assistant.tsx listening bar, global-command-box.tsx header, sidebar Voice toggle",
      "Replaces static pulsing amber dots in all three surfaces",
    ]
  },
  {
    num: "Item 7", title: "Intent-Aware System Prompts", status: "DONE",
    details: [
      "ZARA_INTENT_ADDENDUMS: 14 intent-specific behavioral sections",
      "buildSystemPrompt(context?, intent?) selects matching addendum when intent is known",
      "Falls back to generic ZARA_COMMAND_PARSING when intent is undefined/unknown",
      "Intent is already in buildRequestPayload() scope — one-line wire-up",
      "Each addendum tells Zara exactly what tone, format, and constraints apply",
    ]
  },
];

items.forEach((item) => {
  if (doc.y > 650) newPage();
  doc.moveDown(0.4);
  const y = doc.y;
  doc.rect(56, y, W, 1).fill(BORDER);
  doc.y = y + 5;
  doc.fillColor(GREEN).fontSize(9).font("Helvetica-Bold")
    .text(item.num + "  ", 56, doc.y, { continued: true });
  doc.fillColor(WHITE).text(item.title + "  ", { continued: true });
  doc.fillColor(GREEN).font("Helvetica").text("[" + item.status + "]");
  item.details.forEach((d) => {
    if (doc.y > 730) newPage();
    const dy = doc.y;
    doc.fillColor(CYAN).fontSize(7.5).font("Helvetica").text("·  ", 66, dy, { continued: true });
    doc.fillColor(MUTED).text(d, { width: W - 20, lineGap: 1.5 });
    doc.moveDown(0.15);
  });
  doc.moveDown(0.3);
});

// ═══════════════════════════════════════════════════════════
// SECTION 13 — ROADMAP
// ═══════════════════════════════════════════════════════════

sectionHeader("13. Upcoming Roadmap (Next Items)");

[
  ["Item 8",  "Streaming in Console",        "Real-time token streaming in the Console panel (currently non-streaming)"],
  ["Item 9",  "Skill execution with real AI", "Skill router passes context to AI; AI generates skill-specific responses"],
  ["Item 10", "Memory panel UI",              "Expose conversation memory stats, pinned entries, and purge controls in the UI"],
  ["Item 11", "Tauri packaging",              "Wrap Vite app in Tauri shell for native desktop distribution"],
  ["Item 12", "Whisper.cpp offline voice",    "Replace Web Speech API with Whisper.cpp via Tauri subprocess"],
  ["Item 13", "Ollama model selector",        "Live model list from /api/tags, model download progress UI, active model indicator"],
  ["Item 14", "Encrypted key storage",        "Move API keys from localStorage to encrypted IndexedDB (Web Crypto AES-GCM)"],
  ["Item 15", "Linux ISO build",              "Archiso / Debian live-build with ZaraOS as WM + Ollama as systemd service"],
].forEach(([num, title, desc]) => bullet(`${num}: ${title}`, desc, AMBER));

// ═══════════════════════════════════════════════════════════
// SECTION 14 — FILE MAP
// ═══════════════════════════════════════════════════════════

newPage();
sectionHeader("14. Key File Map (artifacts/zaraos/src/)");

codeBlock(
`core/
  types.ts                          ← ALL shared TypeScript interfaces
  zara-runtime.ts                   ← OS brain — single entry point for all commands
  runtime-context.tsx               ← useRuntime() React hook + RuntimeProvider
  permissions.ts                    ← Deny-by-default PermissionsManager singleton
  input-mode.tsx                    ← InputModeContext — voice/gesture/mode state
  ai/
    ai-runtime.ts                   ← Central AI orchestrator (AIRuntime singleton)
    prompts/
      zara-system-prompt.ts         ← buildSystemPrompt(), ZARA_INTENT_ADDENDUMS, simulated responses
    providers/
      provider-adapter.ts           ← AIProviderAdapter interface + AIStreamCallback type
      provider-registry.ts          ← All provider instances, localStorage persistence, cloud gate
      local-provider.ts             ← Simulated fallback (always available, zero latency)
      ollama-provider.ts            ← Ollama NDJSON streaming, /api/version health check
      llamacpp-provider.ts          ← llama.cpp OpenAI-compat REST
      openai-provider.ts            ← OpenAI SSE, /v1/models health check
      anthropic-provider.ts         ← Anthropic SSE, dangerous-direct-browser-access
      gemini-provider.ts            ← Gemini SSE alt=sse, key as query param
    routing/
      provider-router.ts            ← Routing strategy + health check cache (60s/20s TTL)
      request-router.ts             ← Provider + model selection + dispatch
      model-router.ts               ← Classifies request type → selects best model
    memory/
      conversation-memory.ts        ← Session, message, entry, skill usage manager
      memory-storage.ts             ← localStorage persistence layer
      memory-types.ts               ← ConversationMessage, MemoryEntry, MemoryStats, etc.
    context/
      context-injector.ts           ← buildContextBlock() — assembles live OS state string
      system-context.ts             ← SystemContextSnapshot
      privacy-context.ts            ← PrivacyContextSnapshot
      skills-context.ts             ← SkillContextEntry[]
    models/
      ai-capabilities.ts            ← Provider capability constants (OPENAI_CAPABILITIES, etc.)
      model-router.ts               ← Request classification → model selection
  skills/
    skill-runtime.ts                ← Skill execution engine
    types.ts                        ← ZaraSkill, SkillExecutionResult interfaces

lib/
  voice-engine.ts                   ← Web Speech API voice input singleton
  gesture-engine.ts                 ← MediaPipe Hands placeholder + simulation
  gesture-mapper.ts                 ← GestureType → command string mapping
  command-router.ts                 ← parseAndRoute() — NLP intent classification
  ai-engine.ts                      ← Legacy shim (deprecated, use ai-runtime directly)
  privacy-store.ts                  ← usePrivacy() hook

components/
  layout.tsx                        ← Desktop OS shell (sidebar + main panel frame)
  global-command-box.tsx            ← Ctrl+Space overlay with voice + VoiceWaveform
  voice-waveform.tsx                ← 7-bar framer-motion waveform component
  ai-runtime-status.tsx             ← Provider/model/latency status badge
  input-mode-indicator.tsx          ← Voice/Gesture/Keyboard mode display + switcher
  confirmation-dialog.tsx           ← Destructive action confirm modal
  error-boundary.tsx                ← React error boundary wrapper

pages/
  home.tsx           assistant.tsx   console.tsx      apps.tsx
  files.tsx          media.tsx       settings.tsx     privacy.tsx
  ai-providers.tsx   developers.tsx  skills.tsx       not-found.tsx`
);

// ═══════════════════════════════════════════════════════════
// SECTION 15 — GOTCHAS
// ═══════════════════════════════════════════════════════════

sectionHeader("15. Important Gotchas & Design Decisions");

bullet("cloudAIEnabled bug (fixed)",
  "ProviderRouter.cloudAIEnabled was always false at startup — wired setCloudAIAllowed() through " +
  "ZaraRuntime.initialize() / requestPermission('cloud_ai') / revokePermission('cloud_ai').");

bullet("Anthropic CORS header",
  "'anthropic-dangerous-direct-browser-access: true' is required on every request. Official Anthropic opt-in for browsers.");

bullet("Gemini key in URL",
  "API key is a URL query param (?key=...). Only safe over HTTPS. Key appears in request logs.");

bullet("Ollama healthCheck endpoint",
  "/api/version (not /api/tags or /v1/models). Any 200 response = available.");

bullet("API keys in localStorage",
  "Intentional Alpha 0.4 prototype behavior, clearly labeled in the UI. Encrypted IndexedDB planned for Alpha 0.4.");

bullet("No root pnpm dev",
  "No root dev script by design. Artifacts start via their own workflows with PORT and BASE_PATH. " +
  "Never run 'pnpm dev' at workspace root.");

bullet("Typecheck command",
  "Always run 'pnpm --filter @workspace/zaraos run typecheck' after making changes. Zero errors is the bar.");

bullet("App self-import (fixed in Alpha 0.1)",
  "Original scaffold had a circular self-import in App.tsx. Fixed: exports MainApp default wrapped in RuntimeProvider.");

bullet("Anthropic messages array",
  "Anthropic does not accept a 'system' role in the messages array. System prompt is a top-level 'system' field.");

bullet("Gemini role convention",
  "Gemini uses 'model' for assistant role (not 'assistant'). The adapter converts this transparently.");

// ═══════════════════════════════════════════════════════════
// SECTION 16 — CHANGELOG (auto-read from CHANGELOG.md)
// ═══════════════════════════════════════════════════════════

newPage();
sectionHeader("16. Full Feature Log (from CHANGELOG.md)");

body(
  "The sections below are generated automatically from CHANGELOG.md at the project root. " +
  "Every feature, fix, and architectural decision is tracked there. " +
  "Add a new entry to CHANGELOG.md and re-run this script to update the report."
);

doc.moveDown(0.3);

const CHANGELOG_PATH = path.join(__dirname, "../CHANGELOG.md");
const changelogRaw = fs.readFileSync(CHANGELOG_PATH, "utf8");

// Parse CHANGELOG.md into releases
// A release starts with "## [Alpha X.Y]" or "## Roadmap"
const lines = changelogRaw.split("\n");
let currentRelease = null;
let currentSection = null;    // Added / Changed / Fixed / Architecture
const releases = [];          // [{ heading, date, sections: { name: [entry] } }]

for (const raw of lines) {
  const line = raw.trimEnd();
  if (line.startsWith("## [") || line.startsWith("## Roadmap")) {
    // New release block
    const match = line.match(/^## \[(.+?)\](?:\s*—\s*(.+))?/) ||
                  line.match(/^## (Roadmap.*)/);
    if (match) {
      currentRelease = {
        heading: match[1] || match[0].replace("## ", ""),
        date: match[2] || null,
        sections: {},
      };
      releases.push(currentRelease);
      currentSection = null;
    }
  } else if (currentRelease && line.startsWith("### ")) {
    currentSection = line.replace("### ", "").trim();
    if (!currentRelease.sections[currentSection]) {
      currentRelease.sections[currentSection] = [];
    }
  } else if (currentRelease && currentSection && line.startsWith("- ")) {
    // Strip markdown bold (**text**) and backtick code spans
    const cleaned = line
      .slice(2)
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/`(.+?)`/g, "$1");
    currentRelease.sections[currentSection].push(cleaned);
  } else if (currentRelease && currentSection && line.startsWith("  - ")) {
    // Sub-bullet — attach to previous entry with an indent marker
    const cleaned = "    · " + line.slice(4)
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/`(.+?)`/g, "$1");
    const sec = currentRelease.sections[currentSection];
    if (sec.length > 0) sec.push(cleaned);
  }
}

// Render each release
const SECTION_COLORS = {
  Added:        GREEN,
  Changed:      CYAN,
  Fixed:        AMBER,
  Architecture: VIOLET,
};

for (const rel of releases) {
  if (doc.y > 680) newPage();

  // Release heading
  doc.moveDown(0.5);
  const ry = doc.y;
  doc.rect(56, ry, W, 20).fill(CARD);
  const isRoadmap = rel.heading.toLowerCase().startsWith("roadmap");
  const headingColor = isRoadmap ? AMBER : GREEN;
  doc.fillColor(headingColor).fontSize(9.5).font("Helvetica-Bold")
    .text(rel.heading, 66, ry + 5, { continued: !!rel.date });
  if (rel.date) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(8.5)
      .text("  —  " + rel.date);
  } else {
    doc.text("");
  }
  doc.y = ry + 26;

  // Sub-sections
  for (const [secName, entries] of Object.entries(rel.sections)) {
    if (!entries.length) continue;
    if (doc.y > 710) newPage();

    const sc = SECTION_COLORS[secName] || WHITE;
    doc.fillColor(sc).fontSize(8.5).font("Helvetica-Bold")
      .text(secName.toUpperCase(), 66, doc.y);
    doc.moveDown(0.15);

    for (const entry of entries) {
      if (doc.y > 730) newPage();
      const isSub = entry.startsWith("    · ");
      const indent = isSub ? 30 : 10;
      const text = isSub ? entry.trimStart() : "• " + entry;
      const tc = isSub ? MUTED : WHITE;
      doc.fillColor(tc).fontSize(isSub ? 7.5 : 8).font("Helvetica")
        .text(text, 66 + indent, doc.y, { width: W - 20 - indent, lineGap: 1.5 });
      doc.moveDown(0.2);
    }
    doc.moveDown(0.15);
  }
}

// ═══════════════════════════════════════════════════════════
// FOOTER on all pages
// ═══════════════════════════════════════════════════════════

const total = doc.bufferedPageRange().count;
for (let i = 0; i < total; i++) {
  doc.switchToPage(i);
  const fy = doc.page.height - 32;
  doc.rect(0, fy, doc.page.width, 32).fill("#060d1a");
  doc.moveTo(0, fy).lineTo(doc.page.width, fy).strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.fillColor(MUTED).fontSize(7.5).font("Helvetica")
    .text("ZaraOS Alpha 0.4  ·  Full Implementation Report  ·  Generated for ChatGPT", 56, fy + 10, {
      width: W * 0.65, lineBreak: false,
    });
  doc.fillColor(MUTED).fontSize(7.5).font("Helvetica")
    .text(`Page ${i + 1} of ${total}`, 56 + W * 0.65, fy + 10, {
      width: W * 0.35, align: "right", lineBreak: false,
    });
}

doc.end();
console.log("Report written to:", OUT);
