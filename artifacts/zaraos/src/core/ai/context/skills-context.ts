// ============================================================
// ZaraOS Skills Context Injector
// Injects available skill awareness into AI prompts.
// ============================================================

export interface SkillContextEntry {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  requiresConfirmation: boolean;
}

export interface SkillsContextSnapshot {
  totalSkills: number;
  enabledSkills: number;
  recentSkills: string[];
  skills: SkillContextEntry[];
  capturedAt: number;
}

export function captureSkillsContext(
  skills: SkillContextEntry[] = [],
  recentSkills: string[] = []
): SkillsContextSnapshot {
  return {
    totalSkills: skills.length,
    enabledSkills: skills.filter((s) => s.enabled).length,
    recentSkills: recentSkills.slice(0, 5),
    skills,
    capturedAt: Date.now(),
  };
}

export function formatSkillsContext(ctx: SkillsContextSnapshot): string {
  const lines: string[] = [
    `Available Skills: ${ctx.enabledSkills} of ${ctx.totalSkills} enabled`,
  ];
  if (ctx.recentSkills.length > 0) {
    lines.push(`Recently used: ${ctx.recentSkills.join(", ")}`);
  }
  // Include the first 10 enabled skills in context.
  const sample = ctx.skills.filter((s) => s.enabled).slice(0, 10);
  if (sample.length > 0) {
    lines.push("Active skills: " + sample.map((s) => s.name).join(", "));
  }
  return lines.join("\n");
}
