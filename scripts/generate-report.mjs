import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../zaraos-build-report.pdf");

const CYAN   = "#00F0FF";
const WHITE  = "#FFFFFF";
const DIM    = "#8A9BB0";
const BG     = "#0D1117";
const CARD   = "#161C26";
const BORDER = "#1E2A38";
const AMBER  = "#FBBF24";
const PURPLE = "#C084FC";
const GREEN  = "#4ADE80";

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 56, bottom: 56, left: 56, right: 56 },
  bufferPages: true,
  info: {
    Title: "ZaraOS Build Report — Input Mode System & Global Controls",
    Author: "ZaraOS Dev Session",
    Subject: "Alpha 0.2 feature summary",
  },
});

doc.pipe(fs.createWriteStream(OUT));

const W = doc.page.width - 112; // usable width

// ── Helpers ──────────────────────────────────────────────────────────────────

function rect(x, y, w, h, fill, radius = 6) {
  doc.roundedRect(x, y, w, h, radius).fill(fill);
}

function rule(color = BORDER) {
  doc.moveTo(56, doc.y).lineTo(56 + W, doc.y).strokeColor(color).lineWidth(0.5).stroke();
  doc.moveDown(0.5);
}

function sectionHeading(text) {
  doc.moveDown(0.8);
  const y = doc.y;
  rect(56, y - 4, W, 28, CARD);
  doc.rect(56, y - 4, 3, 28).fill(CYAN);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(CYAN).text(text, 68, y + 2, { width: W - 20 });
  doc.moveDown(1.0);
}

function subHeading(text) {
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(10).fillColor(WHITE).text(text, { width: W });
  doc.moveDown(0.3);
}

function body(text, options = {}) {
  doc.font("Helvetica").fontSize(9).fillColor(DIM).text(text, { width: W, lineGap: 2, ...options });
}

function bullet(text, indent = 0) {
  const x = 56 + indent;
  const bw = W - indent;
  const cy = doc.y + 5;
  doc.circle(x + 4, cy, 2).fill(CYAN);
  doc.font("Helvetica").fontSize(9).fillColor(DIM)
    .text(text, x + 12, doc.y, { width: bw - 12, lineGap: 2 });
}

function badge(text, color) {
  const tw = doc.font("Helvetica-Bold").fontSize(7).widthOfString(text) + 10;
  const bx = 56;
  const by = doc.y;
  doc.roundedRect(bx, by, tw, 14, 3).fill(color + "22");
  doc.font("Helvetica-Bold").fontSize(7).fillColor(color).text(text, bx + 5, by + 3.5, { width: tw });
  doc.moveDown(0.8);
}

function tableRow(cols, widths, isHeader = false) {
  const x0 = 56;
  const rowH = 20;
  const y = doc.y;
  if (isHeader) {
    doc.rect(x0, y, W, rowH).fill(CARD);
  }
  let cx = x0 + 8;
  cols.forEach((col, i) => {
    doc
      .font(isHeader ? "Helvetica-Bold" : "Helvetica")
      .fontSize(8)
      .fillColor(isHeader ? CYAN : DIM)
      .text(col, cx, y + 5, { width: widths[i] - 8, lineBreak: false });
    cx += widths[i];
  });
  doc.rect(x0, y + rowH - 0.5, W, 0.5).fill(BORDER);
  doc.y = y + rowH;
}

function fileRow(status, files) {
  const y = doc.y;
  const statusW = 80;
  const col = status === "New" ? GREEN : status === "Rewritten" ? AMBER : PURPLE;
  doc.roundedRect(56, y, statusW - 8, 16, 3).fill(col + "22");
  doc.font("Helvetica-Bold").fontSize(8).fillColor(col).text(status, 60, y + 4, { width: statusW - 16, lineBreak: false });
  doc.font("Helvetica").fontSize(8).fillColor(DIM).text(files, 56 + statusW, y + 4, { width: W - statusW, lineBreak: false });
  doc.y = y + 20;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — COVER
// ══════════════════════════════════════════════════════════════════════════════

rect(0, 0, doc.page.width, doc.page.height, BG, 0);

// Logo block
rect(56, 56, 44, 44, CYAN + "22", 10);
doc.rect(56, 56, 3, 44).fill(CYAN);
doc.font("Helvetica-Bold").fontSize(28).fillColor(CYAN).text("Z", 70, 67);

doc.font("Helvetica-Bold").fontSize(26).fillColor(WHITE).text("ZaraOS", 112, 62);
doc.font("Helvetica").fontSize(10).fillColor(CYAN).text("ALPHA 0.1  ·  BUILD REPORT", 113, 92);

doc.moveDown(3);
rule(CYAN + "40");
doc.moveDown(0.5);

doc.font("Helvetica-Bold").fontSize(18).fillColor(WHITE)
  .text("Input Mode System & Global Controls", 56, doc.y, { width: W });
doc.moveDown(0.4);
doc.font("Helvetica").fontSize(10).fillColor(DIM)
  .text("A full account of every file created, rewritten, and extended in the Alpha 0.2 input session.", { width: W });

doc.moveDown(1.2);
rule();
doc.moveDown(0.5);

// Meta grid
const metaItems = [
  ["Session",   "Alpha 0.2 — Input Mode System"],
  ["Date",      new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })],
  ["Status",    "Running — no errors"],
  ["Scope",     "10 files changed (4 new, 5 rewritten, 1 extended)"],
];
metaItems.forEach(([k, v]) => {
  const y = doc.y;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(CYAN).text(k.toUpperCase(), 56, y, { width: 90, lineBreak: false });
  doc.font("Helvetica").fontSize(9).fillColor(WHITE).text(v, 150, y, { width: W - 94, lineBreak: false });
  doc.moveDown(0.55);
});

doc.moveDown(0.8);
rule();
doc.moveDown(0.5);

// Contents list
doc.font("Helvetica-Bold").fontSize(9).fillColor(WHITE).text("Contents", { width: W });
doc.moveDown(0.4);
const contents = [
  "1.  Core Type System Expansion",
  "2.  Input Mode Context",
  "3.  Gesture Mapper",
  "4.  Gesture Engine",
  "5.  Global Command Box",
  "6.  Input Mode Indicator",
  "7.  Sidebar Layout",
  "8.  Settings Page",
  "9.  Command Router",
  "10. App Root",
  "11. Gesture → Command Reference Table",
  "12. File Manifest",
  "13. What Remains Mocked",
];
contents.forEach(c => {
  doc.font("Helvetica").fontSize(9).fillColor(DIM).text(c, 68, doc.y, { width: W - 12 });
  doc.moveDown(0.25);
});

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 2+  — BODY
// ══════════════════════════════════════════════════════════════════════════════

doc.addPage({ background: BG });
rect(0, 0, doc.page.width, doc.page.height, BG, 0);

// ─ 1. Types ─
sectionHeading("1.  Core Type System Expansion  ·  src/core/types.ts");
body("Extended the shared type contract. All runtime layers import from this single source of truth.");
doc.moveDown(0.4);
subHeading("Added types:");
[
  ["InputMode", `"voice" | "gesture" | "text" | "hybrid"  — the four OS-level input profiles`],
  ["InputModeConfig", "Carries voiceEnabled, gestureEnabled, textEnabled, commandBoxVisible booleans"],
  ["GestureMapping", "Typed binding of GestureType → command string → InputSource"],
  ["SWIPE_UP / SWIPE_DOWN / SWIPE_ACROSS", "Three new GestureType enum values"],
  ["navigation_action", "New CommandIntent — gesture-driven panel navigation"],
  ["scroll_action", "New CommandIntent — gesture-driven scroll commands"],
  [`"scroll"`, `New action value in CommandResult alongside navigate, toggle, launch`],
].forEach(([name, desc]) => {
  const y = doc.y;
  doc.font("Courier-Bold").fontSize(8.5).fillColor(CYAN).text(name, 68, y, { width: 180, lineBreak: false });
  doc.font("Helvetica").fontSize(8.5).fillColor(DIM).text(desc, 260, y, { width: W - 204, lineBreak: false });
  doc.moveDown(0.55);
});

// ─ 2. Input Mode Context ─
sectionHeading("2.  Input Mode Context  ·  src/core/input-mode.tsx  [NEW FILE]");
body("A React context that manages all input mode state across the OS. Wraps the entire app via InputModeProvider in App.tsx.");
doc.moveDown(0.4);

subHeading("State managed (all persisted to localStorage):");
bullet("mode — selected profile (hybrid / voice / gesture / text)");
bullet("voiceActive — independent microphone toggle, separate from mode profile");
bullet("gestureActive — independent camera/gesture toggle, separate from mode profile");
bullet("isCommandBoxOpen — whether the floating command box is visible");
bullet("keyboardOnly — derived: true when both voice and gesture are off");

doc.moveDown(0.4);
subHeading("Key design decision:");
body("voiceActive and gestureActive are independent of the mode profile. A user can stay on Hybrid mode but flip the microphone off. The mode label reflects preferred style; the hardware toggles reflect what is actually running. Both are stored in separate localStorage keys so they survive mode switches.");

doc.moveDown(0.4);
subHeading("Exported API:");
[
  "setMode(mode)         — switch mode profile",
  "cycleMode()           — rotate through all four modes in order",
  "toggleVoice()         — flip microphone state",
  "setVoice(bool)        — set microphone state explicitly",
  "toggleGesture()       — flip camera state",
  "setGesture(bool)      — set camera state explicitly",
  "toggleCommandBox()    — open or close the floating command box",
  "openCommandBox()      — open explicitly",
  "closeCommandBox()     — close explicitly",
].forEach(line => bullet(line));

doc.moveDown(0.4);
subHeading("Global keyboard shortcut:");
body("Ctrl+Space toggles the command box from anywhere in the OS. Escape closes it. Both registered via a single useEffect in the provider — no per-page listener setup needed.");

doc.moveDown(0.4);
subHeading("INPUT_MODE_META registry:");
body("Each mode has a label, shortLabel, description, and Tailwind color/border/bg tokens. Any component can render mode-appropriate styling without hardcoding colors — they import from this registry.");

// ─ 3. Gesture Mapper ─
doc.addPage({ background: BG });
rect(0, 0, doc.page.width, doc.page.height, BG, 0);

sectionHeading("3.  Gesture Mapper  ·  src/lib/gesture-mapper.ts  [NEW FILE]");
body("The canonical layer converting raw GestureType values into natural language command strings fed into zaraRuntime.executeCommand(). This is the clean interface between hardware recognition and the command pipeline — when real MediaPipe integration arrives, nothing in this file changes.");

doc.moveDown(0.4);
subHeading("PANEL_ORDER array:");
body("Defines the canonical left-to-right order of all 10 ZaraOS panels. Used by getPreviousPanel() and getNextPanel() helpers so SWIPE_LEFT/RIGHT always resolve to the correct target regardless of which panel is currently active.");

doc.moveDown(0.4);
subHeading("Gesture → Command Reference:");
doc.moveDown(0.2);
tableRow(["Gesture", "Command fed to Zara Runtime", "Notes"], [120, 220, W - 340], true);
[
  ["OPEN_PALM",      "open assistant",               "Always opens /assistant"],
  ["SWIPE_LEFT",     "navigate to /[previous panel]","Panel-aware via getPreviousPanel()"],
  ["SWIPE_RIGHT",    "navigate to /[next panel]",    "Panel-aware via getNextPanel()"],
  ["SWIPE_UP",       "scroll down",                  "Content moves upward"],
  ["SWIPE_DOWN",     "scroll up",                    "Content moves downward"],
  ["SWIPE_ACROSS",   "go home",                      "Closes active window"],
  ["PINCH",          "select focused",               "Selects focused element"],
  ["GRAB",           "begin drag",                   "Requires gesture mode"],
  ["FIST",           "go home",                      "Dismiss / go home"],
  ["TWO_FINGERS_UP", "enable precision scroll",      "Requires gesture mode"],
].forEach(row => tableRow(row, [120, 220, W - 340]));

doc.moveDown(0.6);
subHeading("GESTURE_MAPPINGS export:");
body("Full typed mapping table consumed by the Settings Gestures tab to render the reference UI and test buttons. Each entry includes gesture, label, description, command, source, and requiresGestureMode fields.");

// ─ 4. Gesture Engine ─
sectionHeading("4.  Gesture Engine  ·  src/lib/gesture-engine.ts  [REWRITTEN]");
body("Upgraded from a thin placeholder to a properly structured, integration-ready class. All gesture events dispatch through the same runtime pipeline as voice and keyboard.");

doc.moveDown(0.3);
subHeading("New capabilities:");
bullet("setCurrentPath(path) — engine knows the current panel for accurate swipe navigation");
bullet("onGesture(callback) — callback now receives both GestureType and the resolved command string");
bullet("onStatusChange(callback) — separate callback for tracking start/stop state changes");
bullet("600ms debounce window per gesture — prevents rapid double-fires from hand jitter");
bullet("simulateGestureSequence(gestures[], delayMs) — fires a series with configurable delay");
bullet("isActive() / getLastGesture() / getLastGestureLabel() — readable state for UI displays");

doc.moveDown(0.3);
subHeading("MediaPipe integration point (clearly marked in source):");
[
  "1.  Import @mediapipe/hands",
  "2.  Create Hands instance with model complexity and confidence thresholds",
  "3.  Feed webcam frames via requestAnimationFrame loop",
  "4.  Classify hand landmarks → GestureType",
  "5.  Call this.dispatchGesture(classified) — no other changes needed",
].forEach(s => bullet(s));

// ─ 5. Global Command Box ─
sectionHeading("5.  Global Command Box  ·  src/components/global-command-box.tsx  [NEW FILE]");
body("A persistent floating text input accessible from every panel. The privacy-first alternative to voice — lets users type natural language commands without making any sound or activating the microphone.");

doc.moveDown(0.3);
subHeading("UX design:");
bullet("Triggered by Ctrl+Space keyboard shortcut or the Command Box sidebar button");
bullet("Slides up from the bottom with glass/blur backdrop overlay");
bullet("Full-width panel constrained to max-w-2xl, centred on screen");
bullet("Header bar with ZARA COMMAND label and current input mode badge");
bullet("Large clean input field with auto-focus on open");
bullet("Arrow Up/Down navigates command history — last 5 commands stored");
bullet("Three most recent commands shown as clickable history entries above input");
bullet("Six quick-fill suggestion chips for the most common commands");
bullet("Mic icon button (voice input integration point, to be wired in Alpha 0.4)");
bullet("Status line showing Zara's live status and a privacy confirmation note");

doc.moveDown(0.3);
subHeading("Routing:");
body("All submitted commands call zaraRuntime.executeCommand(text, \"keyboard\") — same pipeline as voice and gesture. If the result has action: \"navigate\", the box closes and navigates automatically. No separate command system.");

// ─ 6. Input Mode Indicator ─
doc.addPage({ background: BG });
rect(0, 0, doc.page.width, doc.page.height, BG, 0);

sectionHeading("6.  Input Mode Indicator  ·  src/components/input-mode-indicator.tsx  [NEW FILE]");
body("A compact sidebar widget showing the current input mode with an inline dropdown picker.");

doc.moveDown(0.3);
bullet("Displays current mode icon (Layers/Mic/Hand/Keyboard), short label, three mini input-channel badges");
bullet("Clicking opens a dropdown listing all four modes with active dot indicators");
bullet("Double-clicking cycles modes via cycleMode()");
bullet("Fully mode-color-aware — reads INPUT_MODE_META tokens, no hardcoded colors");

// ─ 7. Sidebar Layout ─
sectionHeading("7.  Sidebar Layout  ·  src/components/layout.tsx  [REWRITTEN]");
body("The bottom section of the sidebar was restructured to surface input controls at the OS level, always visible from every panel.");

doc.moveDown(0.3);
subHeading("New Input Hardware section:");
bullet("Section label INPUT HARDWARE in muted monospace");
bullet("Voice toggle — amber when active (Mic icon + glowing amber dot), muted with MicOff icon when disabled");
bullet("Gesture toggle — purple when active (Hand icon + glowing purple dot), muted when disabled");
bullet("Both buttons are side-by-side, half-width, with immediate visual state feedback");
bullet("Keyboard only green badge auto-appears when both are off — one glance confirms privacy state");
bullet("All toggle state persists immediately to localStorage via the InputMode context");

doc.moveDown(0.3);
subHeading("Wiring added to Layout:");
bullet("gestureEngine.setCurrentPath(location) — synced on every route change via useEffect");
bullet("gestureEngine.onGesture() → zaraRuntime.executeCommand() — gesture/runtime bridge, registered once");
bullet("useInputMode() provides voiceActive, gestureActive, keyboardOnly, toggleVoice, toggleGesture");

doc.moveDown(0.3);
subHeading("Sidebar render order (bottom section, top to bottom):");
["1.  Divider rule",
 "2.  Input Hardware — Voice and Gesture toggle buttons + Keyboard-only badge",
 "3.  Input Mode Indicator — mode profile selector dropdown",
 "4.  Command Box button — Ctrl+Space shortcut label shown",
 "5.  System Status — green pulse dot",
].forEach(s => bullet(s));

// ─ 8. Settings ─
sectionHeading("8.  Settings Page  ·  src/pages/settings.tsx  [REWRITTEN]");
body("Added a full Input Mode tab and rewrote the Gestures tab. The Settings page now mirrors all sidebar controls in a more detailed form.");

doc.moveDown(0.3);
subHeading("New Input Mode tab:");
bullet("Mode selector — 4 cards in a 2×2 grid (Hybrid, Voice, Gesture, Text)");
bullet("Each card shows the mode icon, label, description, and a checkmark when active");
bullet("Hardware Input card — Voice, Gesture, and Keyboard rows with toggle Switches");
bullet("Voice row — live description text changes based on state (active vs disabled)");
bullet("Gesture row — same treatment for camera");
bullet("Keyboard row — permanently shown as Always On with a locked switch");
bullet("Keyboard-only mode active notice appears in green when both hardware inputs are off");
bullet("Command Box shortcut card — displays Ctrl + Space key combination");
bullet("Architecture note — explains all modes share the same Runtime pipeline");

doc.moveDown(0.3);
subHeading("Gestures tab (fully rewritten):");
bullet("Camera tracking enable/disable switch wired to gestureEngine.startTracking() / stopTracking()");
bullet("Live indicator showing the most recently tested gesture name");
bullet("Full gesture map table — all 9 gestures with label, description, resolved command, Test button");
bullet("Test buttons call gestureEngine.simulateGesture() and update the live indicator");
bullet("Gesture Mode badge on gestures requiring gesture mode active");
bullet("MediaPipe integration note pointing to the exact file and function name");

// ─ 9. Command Router ─
doc.addPage({ background: BG });
rect(0, 0, doc.page.width, doc.page.height, BG, 0);

sectionHeading("9.  Command Router  ·  src/lib/command-router.ts  [REWRITTEN]");
body("Expanded the intent rule set to handle all gesture-generated commands, plus 30+ total natural language intent rules across all panels.");

doc.moveDown(0.3);
subHeading("New intent rules added:");
bullet("Navigation rules — one exact-match rule per panel path at 99% confidence");
bullet("go home / dismiss / close active window → navigation_action → target: /");
bullet("scroll down / scroll up / enable precision scroll → scroll_action intent");
bullet("select focused / begin drag → navigation_action (gesture meta-commands)");
bullet("open assistant / wake zara → open_app → target: /assistant (OPEN_PALM gesture)");
bullet("Heuristic: question-phrased input → ai_question intent at 85% confidence");

doc.moveDown(0.3);
subHeading("getResponseText() function:");
body("Maps every CommandIntent to a readable response string. navigation_action and scroll_action have their own response generators. This keeps response logic out of the runtime.");

// ─ 10. App Root ─
sectionHeading("10.  App Root  ·  src/App.tsx  [UPDATED]");
body("InputModeProvider added to the provider stack. Positioned inside RuntimeProvider (components using useInputMode may also call useRuntime) and outside PrivacyProvider.");
doc.moveDown(0.4);
const stack = [
  "QueryClientProvider",
  "  RuntimeProvider",
  "    InputModeProvider     ← new",
  "      PrivacyProvider",
  "        TooltipProvider",
  "          Router",
];
stack.forEach(line => {
  doc.font("Courier").fontSize(8.5).fillColor(line.includes("← new") ? CYAN : DIM)
    .text(line, 68, doc.y, { width: W - 12 });
  doc.moveDown(0.3);
});

// ─ 11. File Manifest ─
sectionHeading("11.  File Manifest");
doc.moveDown(0.2);
rect(56, doc.y, W, 22, CARD);
doc.font("Helvetica-Bold").fontSize(8).fillColor(CYAN)
  .text("STATUS", 64, doc.y + 6, { width: 80, lineBreak: false });
doc.font("Helvetica-Bold").fontSize(8).fillColor(CYAN)
  .text("FILE", 150, doc.y - 22 + 6, { width: W - 100, lineBreak: false });
doc.y += 22;

const files = [
  ["New",       "src/core/input-mode.tsx"],
  ["New",       "src/lib/gesture-mapper.ts"],
  ["New",       "src/components/global-command-box.tsx"],
  ["New",       "src/components/input-mode-indicator.tsx"],
  ["Rewritten", "src/lib/gesture-engine.ts"],
  ["Rewritten", "src/components/layout.tsx"],
  ["Rewritten", "src/lib/command-router.ts"],
  ["Rewritten", "src/pages/settings.tsx"],
  ["Rewritten", "src/App.tsx"],
  ["Extended",  "src/core/types.ts"],
];
files.forEach(([status, file]) => {
  const y = doc.y;
  const col = status === "New" ? GREEN : status === "Rewritten" ? AMBER : PURPLE;
  doc.rect(56, y, W, 20).fill(y % 40 < 20 ? "#0D1117" : "#101620");
  doc.roundedRect(64, y + 4, 64, 13, 3).fill(col + "22");
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(col).text(status, 68, y + 7, { width: 56, lineBreak: false });
  doc.font("Courier").fontSize(8.5).fillColor(DIM).text(file, 150, y + 6, { width: W - 100, lineBreak: false });
  doc.y = y + 20;
});

// ─ 12. What Remains Mocked ─
doc.moveDown(0.8);
sectionHeading("12.  What Remains Mocked");
body("The following are architecture placeholders — integration points are clearly commented in source.");
doc.moveDown(0.3);

[
  ["Voice",   "VoiceEngine still uses a stub. The toggle changes UI state but does not yet call getUserMedia()."],
  ["Gesture", "GestureEngine uses simulateGesture(). All UI and routing works via simulation. No webcam access yet."],
  ["AI",      "All Zara responses are mocked. AIEngine has integration points but calls no external APIs."],
  ["Backend", "No backend calls. All state lives in localStorage. api-server artifact not yet used by ZaraOS."],
].forEach(([label, desc]) => {
  const y = doc.y;
  const col = label === "Voice" ? AMBER : label === "Gesture" ? PURPLE : label === "AI" ? CYAN : DIM;
  doc.roundedRect(56, y, W, 32, 6).fill(CARD);
  doc.rect(56, y, 3, 32).fill(col);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(col).text(label, 68, y + 5, { width: 60, lineBreak: false });
  doc.font("Helvetica").fontSize(8.5).fillColor(DIM).text(desc, 68, y + 18, { width: W - 20, lineBreak: false });
  doc.y = y + 40;
});

// ─ Footer ─
const pageCount = doc.bufferedPageRange().count;
for (let i = 0; i < pageCount; i++) {
  doc.switchToPage(i);
  rect(0, doc.page.height - 36, doc.page.width, 36, CARD, 0);
  doc.moveTo(0, doc.page.height - 36).lineTo(doc.page.width, doc.page.height - 36)
    .strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.font("Helvetica").fontSize(7.5).fillColor(DIM)
    .text("ZaraOS  ·  Alpha 0.1  ·  Build Report: Input Mode System", 56, doc.page.height - 22, {
      width: W / 2, lineBreak: false,
    });
  doc.font("Helvetica").fontSize(7.5).fillColor(DIM)
    .text(`Page ${i + 1} of ${pageCount}`, 56 + W / 2, doc.page.height - 22, {
      width: W / 2, align: "right", lineBreak: false,
    });
}

doc.end();
console.log("PDF written to:", OUT);
