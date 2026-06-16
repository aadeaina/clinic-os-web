import { create } from "zustand";
import { Step } from "./types";

interface ConsoleState {
  sessionId: string | null;
  steps: Step[];
  activeAgent: string | null;
  pending: Step | null;
  reset: () => void;
  setSession: (id: string) => void;
  addStep: (s: Step) => void;
  clearPending: () => void;
}

export const useConsole = create<ConsoleState>((set) => ({
  sessionId: null,
  steps: [],
  activeAgent: null,
  pending: null,
  reset: () => set({ sessionId: null, steps: [], activeAgent: null, pending: null }),
  setSession: (id) => set({ sessionId: id }),
  addStep: (s) =>
    set((st) => ({
      steps: [...st.steps, s],
      activeAgent: s.type === "routing" ? s.decision?.agent ?? st.activeAgent : st.activeAgent,
      pending: s.type === "pending" ? s : st.pending,
    })),
  clearPending: () => set({ pending: null }),
}));
