"use client";

import { useEffect, useState } from "react";
import type { Workspace } from "./types";

export interface AppMode {
  id: string;
  name: string;
  workspace: Workspace;
}

export const DEFAULT_MODES: AppMode[] = [
  { id: "profissional", name: "Profissional", workspace: "trabalho" },
  { id: "pessoal",      name: "Pessoal",      workspace: "pessoal"  },
];

export const WORKSPACE_LABELS: Record<string, string> = {
  trabalho: "Profissional",
  pessoal:  "Pessoal",
};

export function useModes() {
  const [modes, setModesState] = useState<AppMode[]>(DEFAULT_MODES);
  const [activeModeId, setActiveModeIdState] = useState("profissional");

  useEffect(() => {
    try {
      const savedModes = localStorage.getItem("planner_modes");
      const savedActive = localStorage.getItem("planner_active_mode");
      if (savedModes) setModesState(JSON.parse(savedModes));
      if (savedActive) setActiveModeIdState(savedActive);
    } catch {
      // silently ignore localStorage errors
    }
  }, []);

  const setActiveModeId = (id: string) => {
    setActiveModeIdState(id);
    try { localStorage.setItem("planner_active_mode", id); } catch {}
  };

  const setModes = (newModes: AppMode[]) => {
    setModesState(newModes);
    try { localStorage.setItem("planner_modes", JSON.stringify(newModes)); } catch {}
  };

  const activeMode = modes.find((m) => m.id === activeModeId) ?? modes[0];

  return { modes, activeMode, setActiveModeId, setModes };
}
