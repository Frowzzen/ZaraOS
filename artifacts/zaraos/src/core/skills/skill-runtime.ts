// ============================================================
// ZaraOS Skill Runtime
//
// The execution layer for ZaraOS Skills. Manages the skill
// registry, validates permissions, enforces confirmation gates,
// refuses dangerous actions unless confirmed, and returns
// structured mocked results for Alpha 0.1.
//
// SECURITY:
//   - No real email, SMS, call, or network calls are made.
//   - No files are deleted or modified.
//   - No cloud AI is called from skills.
//   - dangerous: true skills always return confirm_required
//     unless confirmedByUser === true.
//   - No personal content is logged.
//
// Future (Alpha 0.4+):
//   - Wire real implementations behind permission gates.
//   - Add provider resolution (email account, calendar, etc.).
//   - Sandbox execution using Web Workers or Tauri commands.
// ============================================================

import { BUILTIN_SKILLS, getSkillById } from "./builtin-skills";
import type {
  ZaraSkill,
  SkillCategory,
  SkillPermission,
  SkillExecutionInput,
  SkillExecutionResult,
} from "./types";

// ── Mocked execution responses ────────────────────────────
const MOCK_RESPONSES: Partial<Record<string, string>> = {
  "skill.email":               "Email skill is not yet connected. Add an email account in Connected Services.",
  "skill.text_messages":       "Text messaging is not yet connected. Requires a phone account.",
  "skill.calls":               "Calling is not yet connected. Requires a phone or VoIP account.",
  "skill.contacts":            "Contacts: showing local address book. 0 contacts found (mocked).",
  "skill.timer":               "Timer started. You will be notified when it completes. (mocked)",
  "skill.alarms":              "Alarm set. (mocked — no real notification will fire)",
  "skill.calendar":            "Calendar opened. No events found — connect a calendar account to sync. (mocked)",
  "skill.reminders":           "Reminder added to your local list. (mocked)",
  "skill.notes":               "Note created and saved locally. (mocked)",
  "skill.web_search":          "Searching the web... (mocked — network access not yet wired)",
  "skill.fact_check":          "Fact-checking with local AI... (mocked — local model not yet connected)",
  "skill.summarize_page":      "Summarizing page with local AI... (mocked)",
  "skill.research_topic":      "Researching topic with local AI... (mocked)",
  "skill.translate":           "Translating with local model... (mocked)",
  "skill.define_term":         "Looking up definition... (mocked)",
  "skill.view_files":          "Opening file browser. (mocked — file system access not yet granted)",
  "skill.edit_documents":      "Opening document editor. (mocked)",
  "skill.delete_files":        "File deletion requires confirmation. (dangerous: true)",
  "skill.rename_files":        "File renamed. (mocked)",
  "skill.summarize_documents": "Summarizing document with local AI... (mocked)",
  "skill.optimize_documents":  "Optimizing document with local AI... (mocked)",
  "skill.organize_folders":    "Folder organization requires confirmation. (mocked)",
  "skill.open_app":            "Launching app... (routed through Runtime)",
  "skill.close_window":        "Closing window. (routed through Runtime)",
  "skill.switch_panel":        "Switching panel. (routed through Runtime)",
  "skill.scroll":              "Scrolling. (routed through Runtime)",
  "skill.search_device":       "Searching device... (mocked)",
  "skill.change_settings":     "Opening settings. (routed through Runtime)",
  "skill.privacy_controls":    "Opening privacy controls. (routed through Runtime)",
  "skill.play_audio":          "Starting audio playback. (mocked — media engine not yet wired)",
  "skill.pause_audio":         "Audio paused. (mocked)",
  "skill.watch_video":         "Opening video player. (mocked)",
  "skill.volume_control":      "Adjusting volume. (mocked)",
  "skill.next_track":          "Skipping to next track. (mocked)",
  "skill.previous_track":      "Going to previous track. (mocked)",
  "skill.build_app":           "App builder opened in Developer Portal. (mocked)",
  "skill.create_plugin":       "Plugin template generator opened. (mocked)",
  "skill.inspect_manifest":    "Manifest inspector opened. (mocked)",
  "skill.run_test":            "Running tests in sandbox... 3/3 passed. (mocked)",
  "skill.package_app":         "Package build requires confirmation. (mocked)",
};

class SkillRuntime {
  private skills: Map<string, ZaraSkill> = new Map();
  private grantedPermissions: Set<SkillPermission> = new Set();

  constructor() {
    // Register all built-in skills
    for (const skill of BUILTIN_SKILLS) {
      this.skills.set(skill.id, { ...skill });
    }
  }

  // ── Registry ───────────────────────────────────────────
  public listSkills(): ZaraSkill[] {
    return Array.from(this.skills.values());
  }

  public getSkillsByCategory(category: SkillCategory): ZaraSkill[] {
    return this.listSkills().filter((s) => s.category === category);
  }

  public getSkill(id: string): ZaraSkill | undefined {
    return this.skills.get(id);
  }

  public searchSkills(query: string): ZaraSkill[] {
    const q = query.toLowerCase();
    return this.listSkills().filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.voiceCommands.some((c) => c.toLowerCase().includes(q)) ||
        s.textCommands.some((c) => c.toLowerCase().includes(q))
    );
  }

  // ── Permission Management ──────────────────────────────
  public grantPermission(permission: SkillPermission): void {
    this.grantedPermissions.add(permission);
  }

  public revokePermission(permission: SkillPermission): void {
    this.grantedPermissions.delete(permission);
  }

  public checkSkillPermissions(skillId: string): { granted: boolean; missing: SkillPermission[] } {
    const skill = this.skills.get(skillId);
    if (!skill) return { granted: false, missing: [] };

    const missing = skill.permissions.filter((p) => !this.grantedPermissions.has(p));
    return { granted: missing.length === 0, missing };
  }

  // ── Enable / Disable ───────────────────────────────────
  public enableSkill(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;
    this.skills.set(skillId, { ...skill, enabled: true });
    return true;
  }

  public disableSkill(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;
    this.skills.set(skillId, { ...skill, enabled: false });
    return true;
  }

  // ── Execution ──────────────────────────────────────────
  public async executeSkill(input: SkillExecutionInput): Promise<SkillExecutionResult> {
    const { skillId, confirmedByUser = false } = input;
    const skill = this.skills.get(skillId);

    if (!skill) {
      return {
        success: false,
        skillId,
        response: `Unknown skill: ${skillId}`,
        action: "noop",
        dangerous: false,
        timestamp: Date.now(),
      };
    }

    // Disabled gate
    if (!skill.enabled) {
      return {
        success: false,
        skillId,
        response: `Skill "${skill.name}" is disabled. Enable it in the Skills Hub.`,
        action: "disabled",
        dangerous: false,
        timestamp: Date.now(),
      };
    }

    // Dangerous + confirmation gate
    if (skill.dangerous && !confirmedByUser) {
      return {
        success: false,
        skillId,
        response: skill.confirmationReason ?? `"${skill.name}" requires confirmation before executing.`,
        action: "confirm_required",
        dangerous: true,
        timestamp: Date.now(),
      };
    }

    // Confirmation gate (non-dangerous but still needs confirm)
    if (skill.requiresConfirmation && !confirmedByUser) {
      return {
        success: false,
        skillId,
        response: skill.confirmationReason ?? `"${skill.name}" requires your confirmation before proceeding.`,
        action: "confirm_required",
        dangerous: skill.dangerous,
        timestamp: Date.now(),
      };
    }

    // Future skills — not yet implemented
    if (skill.status === "future") {
      return {
        success: false,
        skillId,
        response: `"${skill.name}" is coming in a future ZaraOS release. Check the roadmap for details.`,
        action: "noop",
        dangerous: false,
        timestamp: Date.now(),
      };
    }

    // Mocked execution — safe response, no real actions
    const response = MOCK_RESPONSES[skillId] ?? `Executed skill: ${skill.name} (mocked)`;

    return {
      success: true,
      skillId,
      response,
      action: "noop",
      dangerous: skill.dangerous,
      timestamp: Date.now(),
    };
  }

  // ── Stats ──────────────────────────────────────────────
  public getStats() {
    const all = this.listSkills();
    return {
      total: all.length,
      builtIn: all.filter((s) => s.status === "built_in").length,
      mocked: all.filter((s) => s.status === "mocked").length,
      future: all.filter((s) => s.status === "future").length,
      enabled: all.filter((s) => s.enabled).length,
      dangerous: all.filter((s) => s.dangerous).length,
      requiresConfirmation: all.filter((s) => s.requiresConfirmation).length,
    };
  }
}

// Singleton — shared across the OS session
export const skillRuntime = new SkillRuntime();
export { getSkillById };
