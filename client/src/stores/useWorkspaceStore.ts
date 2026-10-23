import { create } from "zustand";
interface WorkspaceState {
    scope: string;
    setScope: (scope: string) => void;
}
export const useWorkspaceStore = create<WorkspaceState>((set) => ({
    scope: "mine",
    setScope: (scope) => set({ scope })
}));
