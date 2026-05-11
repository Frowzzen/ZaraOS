// ============================================================
// ZaraOS Tool Registry
//
// Stores all registered tools and exposes them for AI
// provider tool-calling schemas and the executor.
// ============================================================

import type { ZaraTool } from "./tool-types";

export class ToolRegistry {
  private tools: Map<string, ZaraTool> = new Map();

  register(tool: ZaraTool): void {
    this.tools.set(tool.id, tool);
  }

  unregister(toolId: string): void {
    this.tools.delete(toolId);
  }

  get(toolId: string): ZaraTool | undefined {
    return this.tools.get(toolId);
  }

  list(): ZaraTool[] {
    return Array.from(this.tools.values());
  }

  listEnabled(): ZaraTool[] {
    return this.list().filter((t) => t.enabled);
  }

  listByCategory(category: ZaraTool["category"]): ZaraTool[] {
    return this.list().filter((t) => t.category === category);
  }
}

export const toolRegistry = new ToolRegistry();

// ── Built-in Tool Declarations (Alpha 0.3 — architecture only) ─

const BUILTIN_TOOLS: ZaraTool[] = [
  {
    id: "zara.open_app",
    name: "Open Application",
    description: "Navigate to a ZaraOS panel or launch an application by name.",
    category: "app",
    parameters: [{ name: "target", type: "string", description: "Panel path or app name", required: true }],
    requiresConfirmation: false,
    dangerous: false,
    enabled: true,
    version: "0.3.0",
  },
  {
    id: "zara.set_timer",
    name: "Set Timer",
    description: "Set a countdown timer for a specified duration.",
    category: "skill",
    skillId: "skill.timer",
    parameters: [
      { name: "duration", type: "string", description: "Duration e.g. '10 minutes', '30 seconds'", required: true },
      { name: "label", type: "string", description: "Optional timer label", required: false },
    ],
    requiresConfirmation: false,
    dangerous: false,
    enabled: true,
    version: "0.3.0",
  },
  {
    id: "zara.search_web",
    name: "Search Web",
    description: "Search the web for a query. Requires network permission.",
    category: "skill",
    skillId: "skill.search-web",
    parameters: [{ name: "query", type: "string", description: "Search query", required: true }],
    requiresPermission: "network",
    requiresConfirmation: false,
    dangerous: false,
    enabled: true,
    version: "0.3.0",
  },
  {
    id: "zara.send_email",
    name: "Send Email",
    description: "Compose and send an email. Requires email account configuration and confirmation.",
    category: "communication",
    skillId: "skill.email",
    parameters: [
      { name: "to", type: "string", description: "Recipient name or email", required: true },
      { name: "subject", type: "string", description: "Email subject", required: false },
      { name: "body", type: "string", description: "Email body (plain text)", required: false },
    ],
    requiresPermission: "network",
    requiresConfirmation: true,
    dangerous: false,
    enabled: true,
    version: "0.3.0",
  },
  {
    id: "zara.delete_files",
    name: "Delete Files",
    description: "Delete one or more files. Dangerous — irreversible. Requires files permission and confirmation.",
    category: "file",
    skillId: "skill.delete-files",
    parameters: [{ name: "paths", type: "string", description: "File path or pattern to delete", required: true }],
    requiresPermission: "files",
    requiresConfirmation: true,
    dangerous: true,
    enabled: true,
    version: "0.3.0",
  },
  {
    id: "zara.change_settings",
    name: "Change Settings",
    description: "Modify a ZaraOS system setting.",
    category: "system",
    skillId: "skill.change-settings",
    parameters: [
      { name: "setting", type: "string", description: "Setting name", required: true },
      { name: "value", type: "string", description: "New value", required: true },
    ],
    requiresConfirmation: true,
    dangerous: false,
    enabled: true,
    version: "0.3.0",
  },
];

BUILTIN_TOOLS.forEach((tool) => toolRegistry.register(tool));
