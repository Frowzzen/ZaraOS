// ============================================================
// Zara Runtime — React Context Bridge
//
// Provides the ZaraRuntime singleton and AI Runtime status to
// all React components via a context hook.
//
// Components must never import zaraRuntime or aiRuntime directly.
// They should use useRuntime() instead.
//
// Alpha 0.4: Added full AI provider management:
//   enableAIProvider, setPreferredAIProvider, checkAIProviderHealth,
//   setAIProviderApiKey, setAIProviderEndpoint, getAIProviderSummaries
// ============================================================

import React, { createContext, useContext, useEffect, useState } from "react";
import { zaraRuntime } from "./zara-runtime";
import { aiRuntime } from "./ai/ai-runtime";
import type { ZaraStatus } from "./types";
import type { AIRuntimeStatus } from "./ai/ai-runtime";
import type { AIStreamCallback } from "./ai/providers/provider-adapter";
import type { AIProviderStatus } from "./ai/providers/provider-adapter";
import type { MemoryStats } from "./ai/memory/memory-types";
import type { ProviderSummary } from "./ai/providers/provider-registry";

interface RuntimeContextType {
  // Zara OS status
  zaraStatus: ZaraStatus;

  // AI Runtime status (provider, model, simulated/real, memory)
  aiRuntimeStatus: AIRuntimeStatus;

  // Command execution
  executeCommand: typeof zaraRuntime.executeCommand;

  // Assistant messaging
  sendAssistantMessage: typeof zaraRuntime.sendAssistantMessage;
  streamAssistantMessage: (
    message: string,
    onChunk: AIStreamCallback,
    source?: Parameters<typeof zaraRuntime.streamAssistantMessage>[2]
  ) => Promise<void>;

  // AI conversation management
  clearAIConversation: () => void;
  getAIMemoryStats: () => MemoryStats;

  // AI provider management
  selectAIProvider: typeof zaraRuntime.selectAIProvider;
  enableAIProvider: (id: string, enabled: boolean) => void;
  setPreferredAIProvider: (id: string | null) => void;
  setAIProviderApiKey: (id: string, key: string) => void;
  setAIProviderEndpoint: (id: string, url: string) => void;
  checkAIProviderHealth: (id: string) => Promise<AIProviderStatus>;
  getAIProviderSummaries: () => ProviderSummary[];
  getPreferredAIProviderId: () => string | null;

  // Permissions
  requestPermission: typeof zaraRuntime.requestPermission;
  revokePermission: typeof zaraRuntime.revokePermission;

  // System
  getSystemStatus: typeof zaraRuntime.getSystemStatus;
  launchApp: typeof zaraRuntime.launchApp;

  // Plugins
  registerPlugin: typeof zaraRuntime.registerPlugin;
  getPlugins: typeof zaraRuntime.getPlugins;

  // Skill layer
  listSkills: typeof zaraRuntime.listSkills;
  getSkill: typeof zaraRuntime.getSkill;
  executeSkill: typeof zaraRuntime.executeSkill;
  checkSkillPermissions: typeof zaraRuntime.checkSkillPermissions;
  requestSkillConfirmation: typeof zaraRuntime.requestSkillConfirmation;
  enableSkill: typeof zaraRuntime.enableSkill;
  disableSkill: typeof zaraRuntime.disableSkill;
}

const RuntimeContext = createContext<RuntimeContextType | undefined>(undefined);

export function RuntimeProvider({ children }: { children: React.ReactNode }) {
  const [zaraStatus, setZaraStatus] = useState<ZaraStatus>("idle");
  const [aiRuntimeStatus, setAIRuntimeStatus] = useState<AIRuntimeStatus>(
    aiRuntime.getStatus()
  );

  useEffect(() => {
    zaraRuntime.initialize();
    const unsubZara = zaraRuntime.onStatusChange(setZaraStatus);
    const unsubAI = zaraRuntime.onAIStatusChange(setAIRuntimeStatus);
    return () => {
      unsubZara();
      unsubAI();
    };
  }, []);

  const value: RuntimeContextType = {
    zaraStatus,
    aiRuntimeStatus,

    executeCommand: zaraRuntime.executeCommand.bind(zaraRuntime),
    sendAssistantMessage: zaraRuntime.sendAssistantMessage.bind(zaraRuntime),
    streamAssistantMessage: (message, onChunk, source) =>
      zaraRuntime.streamAssistantMessage(message, onChunk, source ?? "keyboard").then(() => undefined),

    clearAIConversation: zaraRuntime.clearAIConversation.bind(zaraRuntime),
    getAIMemoryStats: zaraRuntime.getAIMemoryStats.bind(zaraRuntime),

    selectAIProvider: zaraRuntime.selectAIProvider.bind(zaraRuntime),
    enableAIProvider: zaraRuntime.enableAIProvider.bind(zaraRuntime),
    setPreferredAIProvider: (id) => zaraRuntime.selectAIProvider(id as Parameters<typeof zaraRuntime.selectAIProvider>[0]),
    setAIProviderApiKey: zaraRuntime.setAIProviderApiKey.bind(zaraRuntime),
    setAIProviderEndpoint: zaraRuntime.setAIProviderEndpoint.bind(zaraRuntime),
    checkAIProviderHealth: zaraRuntime.checkAIProviderHealth.bind(zaraRuntime),
    getAIProviderSummaries: zaraRuntime.getAIProviderSummaries.bind(zaraRuntime),
    getPreferredAIProviderId: zaraRuntime.getPreferredAIProviderId.bind(zaraRuntime),

    requestPermission: zaraRuntime.requestPermission.bind(zaraRuntime),
    revokePermission: zaraRuntime.revokePermission.bind(zaraRuntime),
    getSystemStatus: zaraRuntime.getSystemStatus.bind(zaraRuntime),
    launchApp: zaraRuntime.launchApp.bind(zaraRuntime),

    registerPlugin: zaraRuntime.registerPlugin.bind(zaraRuntime),
    getPlugins: zaraRuntime.getPlugins.bind(zaraRuntime),

    listSkills: zaraRuntime.listSkills.bind(zaraRuntime),
    getSkill: zaraRuntime.getSkill.bind(zaraRuntime),
    executeSkill: zaraRuntime.executeSkill.bind(zaraRuntime),
    checkSkillPermissions: zaraRuntime.checkSkillPermissions.bind(zaraRuntime),
    requestSkillConfirmation: zaraRuntime.requestSkillConfirmation.bind(zaraRuntime),
    enableSkill: zaraRuntime.enableSkill.bind(zaraRuntime),
    disableSkill: zaraRuntime.disableSkill.bind(zaraRuntime),
  };

  return (
    <RuntimeContext.Provider value={value}>
      {children}
    </RuntimeContext.Provider>
  );
}

export function useRuntime(): RuntimeContextType {
  const ctx = useContext(RuntimeContext);
  if (!ctx) {
    throw new Error("useRuntime must be used within a RuntimeProvider");
  }
  return ctx;
}
