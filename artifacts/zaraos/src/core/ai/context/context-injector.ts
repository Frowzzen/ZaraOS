// ============================================================
// ZaraOS Context Injector
//
// Assembles all context sources into a single prompt addendum
// injected after the base system prompt.
// ============================================================

import { captureSystemContext, formatSystemContext } from "./system-context";
import { capturePrivacyContext, formatPrivacyContext } from "./privacy-context";
import { captureSkillsContext, formatSkillsContext } from "./skills-context";
import type { SystemContextSnapshot } from "./system-context";
import type { PrivacyContextSnapshot } from "./privacy-context";
import type { SkillContextEntry } from "./skills-context";

export interface InjectionInput {
  system?: Partial<SystemContextSnapshot>;
  privacy?: Partial<PrivacyContextSnapshot>;
  skills?: SkillContextEntry[];
  recentSkills?: string[];
  simulatedMode?: boolean;
  provider?: string;
  model?: string;
}

export function buildContextBlock(input: InjectionInput = {}): string {
  const parts: string[] = [];

  const systemCtx = captureSystemContext(input.system);
  parts.push(formatSystemContext(systemCtx));

  const privacyCtx = capturePrivacyContext(input.privacy);
  parts.push(formatPrivacyContext(privacyCtx));

  if (input.skills) {
    const skillsCtx = captureSkillsContext(input.skills, input.recentSkills);
    parts.push(formatSkillsContext(skillsCtx));
  }

  if (input.simulatedMode) {
    parts.push("AI Runtime: SIMULATED — Real local AI (Ollama/llama.cpp) not connected. Responding from context-aware templates.");
  } else if (input.provider && input.model) {
    parts.push(`AI Runtime: ${input.provider} / ${input.model}`);
  }

  return parts.join("\n\n");
}
