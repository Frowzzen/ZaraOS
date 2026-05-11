// ============================================================
// Zara Runtime — React Context Bridge
// Provides the ZaraRuntime singleton to all React components
// via a context hook. Components should never import zaraRuntime
// directly — they should use useRuntime() instead.
// ============================================================

import React, { createContext, useContext, useEffect, useState } from "react";
import { zaraRuntime } from "./zara-runtime";
import type { ZaraStatus } from "./types";

interface RuntimeContextType {
  zaraStatus: ZaraStatus;
  executeCommand: typeof zaraRuntime.executeCommand;
  sendAssistantMessage: typeof zaraRuntime.sendAssistantMessage;
  requestPermission: typeof zaraRuntime.requestPermission;
  revokePermission: typeof zaraRuntime.revokePermission;
  getSystemStatus: typeof zaraRuntime.getSystemStatus;
  selectAIProvider: typeof zaraRuntime.selectAIProvider;
  launchApp: typeof zaraRuntime.launchApp;
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

  useEffect(() => {
    zaraRuntime.initialize();
    const unsub = zaraRuntime.onStatusChange(setZaraStatus);
    return unsub;
  }, []);

  const value: RuntimeContextType = {
    zaraStatus,
    executeCommand: zaraRuntime.executeCommand.bind(zaraRuntime),
    sendAssistantMessage: zaraRuntime.sendAssistantMessage.bind(zaraRuntime),
    requestPermission: zaraRuntime.requestPermission.bind(zaraRuntime),
    revokePermission: zaraRuntime.revokePermission.bind(zaraRuntime),
    getSystemStatus: zaraRuntime.getSystemStatus.bind(zaraRuntime),
    selectAIProvider: zaraRuntime.selectAIProvider.bind(zaraRuntime),
    launchApp: zaraRuntime.launchApp.bind(zaraRuntime),
    registerPlugin: zaraRuntime.registerPlugin.bind(zaraRuntime),
    getPlugins: zaraRuntime.getPlugins.bind(zaraRuntime),
    // Skill layer
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
