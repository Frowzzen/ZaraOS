import React, { createContext, useContext, useState, useEffect } from "react";

interface PrivacyState {
  micActive: boolean;
  cameraActive: boolean;
  localAIRunning: boolean;
  cloudAIRunning: boolean;
  networkRequests: number;
}

interface PrivacyContextType extends PrivacyState {
  setMicActive: (active: boolean) => void;
  setCameraActive: (active: boolean) => void;
  setLocalAIRunning: (active: boolean) => void;
  setCloudAIRunning: (active: boolean) => void;
  incrementNetworkRequests: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PrivacyState>(() => {
    const saved = localStorage.getItem("zaraos_privacy_state");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      micActive: false,
      cameraActive: false,
      localAIRunning: true,
      cloudAIRunning: false,
      networkRequests: 0,
    };
  });

  useEffect(() => {
    localStorage.setItem("zaraos_privacy_state", JSON.stringify(state));
  }, [state]);

  const updateState = (updates: Partial<PrivacyState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  return (
    <PrivacyContext.Provider
      value={{
        ...state,
        setMicActive: (micActive) => updateState({ micActive }),
        setCameraActive: (cameraActive) => updateState({ cameraActive }),
        setLocalAIRunning: (localAIRunning) => updateState({ localAIRunning }),
        setCloudAIRunning: (cloudAIRunning) => updateState({ cloudAIRunning }),
        incrementNetworkRequests: () => updateState({ networkRequests: state.networkRequests + 1 }),
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error("usePrivacy must be used within a PrivacyProvider");
  }
  return context;
}
